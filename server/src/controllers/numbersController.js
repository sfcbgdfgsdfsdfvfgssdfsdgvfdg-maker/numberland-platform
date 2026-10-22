const { getDb, saveDatabase } = require('../database');
const providerService = require('../services/providerService');

exports.getServices = async (req, res) => {
    try {
        const servicesData = await providerService.getPricesAndAvailability();
        res.json({ success: true, servicesData });
    } catch (error) {
        console.error('Provider Error:', error.message);
        res.status(500).json({ success: false, message: 'خطا در دریافت لیست سرویس‌ها' });
    }
};

exports.getProviders = (req, res) => {
    const providers = providerService.getAllProviderMeta();
    const active = providerService.getActiveProviders();
    res.json({ success: true, providers, activeCount: active.length });
};

exports.buyNumber = async (req, res) => {
    try {
        const { country, service, operator, price, provider } = req.body;
        const targetOperator = operator || 'any';
        const parsedPrice = parseFloat(price) || 0.1;
        const db = getDb();

        // Get user balance
        const userResult = await db.exec('SELECT balance FROM users WHERE id = ?', [req.user.userId]);
        if (userResult.length === 0 || userResult[0].values.length === 0) {
            return res.status(404).json({ success: false, message: 'کاربر یافت نشد' });
        }
        const currentBalance = parseFloat(userResult[0].values[0][0] || 0);

        if (currentBalance < parsedPrice) {
            return res.status(400).json({ success: false, message: 'موجودی کیف‌پول شما کافی نیست.' });
        }

        const orderData = await providerService.buyActivation(country, targetOperator, service, provider);

        if (!orderData || !orderData.orderId) {
            throw new Error(orderData?.error || 'خطای ناشناخته در دریافت شماره');
        }

        const finalPrice = orderData.cost || parsedPrice;
        const rawCost = orderData.rawCost || parsedPrice;
        const profit = orderData.profit || (finalPrice - rawCost);

        // Deduct balance
        await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [finalPrice, req.user.userId]);

        // Insert order
        await db.run(`INSERT INTO orders (user_id, order_id, phone, service, country, price, raw_cost, profit, provider, operator, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.userId, orderData.orderId, orderData.phone, service, country, finalPrice, rawCost, profit, orderData.provider || provider || 'fivesim', targetOperator, 'WAITING_SMS']);
        saveDatabase();

        // Get new balance
        const newBalanceResult = await db.exec('SELECT balance FROM users WHERE id = ?', [req.user.userId]);
        const newBalance = parseFloat(newBalanceResult[0].values[0][0] || 0);

        res.json({
            success: true,
            message: `شماره با موفقیت از ${providerService.PROVIDER_META[orderData.provider]?.displayName || orderData.provider} دریافت شد.`,
            order: {
                id: orderData.orderId,
                phone: orderData.phone,
                service,
                country,
                price: finalPrice,
                provider: orderData.provider
            },
            newBalance
        });

    } catch (error) {
        const rawErr = error.response?.data;
        const errStr = (rawErr || error.message || '').toString();
        console.error('خطا در دریافت شماره:', errStr);

        let customMsg = 'خطا در ارتباط با سرویس‌دهنده یا تکمیل ظرفیت شماره.';
        if (errStr.includes('no free phones') || errStr.includes('No available numbers')) {
            customMsg = 'ظرفیت شماره‌های این کشور به اتمام رسیده است.';
        } else if (errStr.includes('balance') || errStr.includes('not enough')) {
            customMsg = 'موجودی اکانت مادر به اتمام رسیده است.';
        } else if (errStr && errStr.length < 200) {
            customMsg = errStr;
        }

        res.json({ success: false, message: customMsg });
    }
};

exports.syncActiveOrders = async (req, res) => {
    try {
        const db = getDb();
        const activeOrders = await db.exec(
            "SELECT * FROM orders WHERE user_id = ? AND status = 'WAITING_SMS'",
            [req.user.userId]
        );

        if (activeOrders.length > 0 && activeOrders[0].values.length > 0) {
            const orders = activeOrders[0].values;
            for (const order of orders) {
                const [id, userId, orderId, phone, service, country, price, rawCost, profit, provider, operator, status, smsCode] = order;
                try {
                    const result = await providerService.checkSms(provider, orderId);
                    if (result.status === 'RECEIVED' && result.code) {
                        await db.run("UPDATE orders SET status = 'RECEIVED', sms_code = ? WHERE order_id = ?", [result.code, orderId]);
                    } else if (result.status === 'CANCELED' || result.status === 'BANNED') {
                        await db.run("UPDATE orders SET status = ? WHERE order_id = ?", [result.status, orderId]);
                        await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [parseFloat(price || 0), req.user.userId]);
                    }
                } catch (e) {
                    console.error(`Check order ${orderId} error:`, e.message);
                }
            }
            saveDatabase();
        }

        // Get updated active orders
        const updatedOrders = await db.exec(
            "SELECT * FROM orders WHERE user_id = ? AND (status = 'WAITING_SMS' OR status = 'RECEIVED')",
            [req.user.userId]
        );

        const userBalance = await db.exec('SELECT balance FROM users WHERE id = ?', [req.user.userId]);
        const newBal = userBalance.length > 0 && userBalance[0].values.length > 0 ? parseFloat(userBalance[0].values[0][0]) : 0;

        res.json({
            success: true,
            orders: updatedOrders.length > 0 && updatedOrders[0].values.length > 0 ? updatedOrders[0].values.map(o => ({
                id: o[2], phone: o[3], service: o[4], country: o[5], price: parseFloat(o[6] || 0),
                provider: o[9], operator: o[10], status: o[11], smsCode: o[12]
            })) : [],
            newBalance: newBal
        });
    } catch (error) {
        console.error('Sync Error:', error.message);
        res.json({ success: true, orders: [], error: true });
    }
};

exports.checkSms = async (req, res) => {
    try {
        const { orderId } = req.params;
        const db = getDb();

        const orderResult = await db.exec(
            "SELECT * FROM orders WHERE order_id = ? AND user_id = ?",
            [orderId, req.user.userId]
        );

        if (orderResult.length === 0 || orderResult[0].values.length === 0) {
            return res.json({ success: false, status: 'CANCELED', message: 'Order not found' });
        }

        const order = orderResult[0].values[0];
        const provider = order[9];

        const result = await providerService.checkSms(provider, orderId);

        if (result.status === 'RECEIVED' && result.code) {
            await db.run("UPDATE orders SET status = 'RECEIVED', sms_code = ? WHERE order_id = ?", [result.code, orderId]);
            saveDatabase();
            return res.json({ success: true, status: 'RECEIVED', code: result.code });
        } else if (result.status === 'CANCELED' || result.status === 'BANNED') {
            await db.run("UPDATE orders SET status = ? WHERE order_id = ?", [result.status, orderId]);
            await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [parseFloat(order[6] || 0), req.user.userId]);
            saveDatabase();
            const newBalanceResult = await db.exec('SELECT balance FROM users WHERE id = ?', [req.user.userId]);
            const newBalance = parseFloat(newBalanceResult[0].values[0][0]);
            return res.json({ success: true, status: 'CANCELED', newBalance });
        }

        res.json({ success: true, status: 'WAITING', code: null });
    } catch (error) {
        console.error('checkSms error:', error.message);
        res.json({ success: true, status: 'WAITING' });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const db = getDb();

        const orderResult = await db.exec(
            "SELECT * FROM orders WHERE order_id = ? AND user_id = ?",
            [orderId, req.user.userId]
        );

        if (orderResult.length === 0 || orderResult[0].values.length === 0) {
            return res.status(400).json({ success: false, message: 'سفارش یافت نشد' });
        }

        const order = orderResult[0].values[0];
        const status = order[11];
        const price = parseFloat(order[6] || 0);
        const provider = order[9];

        if (status === 'CANCELED' || status === 'BANNED') {
            return res.json({ success: true, message: 'این سفارش قبلاً لغو شده است.' });
        }

        try {
            await providerService.cancelOrder(provider, orderId);
        } catch (pErr) {
            console.error('Cancel Error:', pErr.message);
        }

        await db.run("UPDATE orders SET status = 'CANCELED' WHERE order_id = ?", [orderId]);
        await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [price, req.user.userId]);
        saveDatabase();

        const balanceRes = await db.exec('SELECT balance FROM users WHERE id = ?', [req.user.userId]);
        const newBalance = parseFloat(balanceRes[0].values[0][0]);

        res.json({ success: true, message: 'سفارش لغو و مبلغ عودت داده شد.', newBalance });
    } catch (error) {
        console.error('Cancel Error:', error.message);
        res.status(500).json({ success: false, message: 'خطا در لغو سفارش' });
    }
};

exports.banOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const db = getDb();

        const orderResult = await db.exec(
            "SELECT * FROM orders WHERE order_id = ? AND user_id = ?",
            [orderId, req.user.userId]
        );

        if (orderResult.length === 0 || orderResult[0].values.length === 0) {
            return res.status(400).json({ success: false, message: 'سفارش یافت نشد' });
        }

        const order = orderResult[0].values[0];
        const status = order[11];
        const price = parseFloat(order[6] || 0);
        const provider = order[9];

        if (status === 'BANNED' || status === 'CANCELED') {
            return res.json({ success: true, message: 'این سفارش قبلاً مسدود/لغو شده است.' });
        }

        try {
            await providerService.banOrder(provider, orderId);
        } catch (pErr) {
            console.error('Ban Error:', pErr.message);
        }

        await db.run("UPDATE orders SET status = 'BANNED' WHERE order_id = ?", [orderId]);
        await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [price, req.user.userId]);
        saveDatabase();

        const balanceRes = await db.exec('SELECT balance FROM users WHERE id = ?', [req.user.userId]);
        const newBalance = parseFloat(balanceRes[0].values[0][0]);

        res.json({ success: true, message: 'شماره مسدود و مبلغ عودت داده شد.', newBalance });
    } catch (error) {
        console.error('Ban Error:', error.message);
        res.status(500).json({ success: false, message: 'خطا در مسدودسازی سفارش' });
    }
};

exports.getProfitStats = async (req, res) => {
    try {
        const db = getDb();
        
        const totalOrdersRes = await db.exec('SELECT COUNT(*) FROM orders WHERE user_id = ?', [req.user.userId]);
        const completedOrdersRes = await db.exec("SELECT COUNT(*) FROM orders WHERE user_id = ? AND status = 'RECEIVED'", [req.user.userId]);
        const canceledOrdersRes = await db.exec("SELECT COUNT(*) FROM orders WHERE user_id = ? AND status IN ('CANCELED', 'BANNED')", [req.user.userId]);
        const totalProfitRes = await db.exec('SELECT COALESCE(SUM(profit), 0) FROM orders WHERE user_id = ? AND status = ?', [req.user.userId, 'RECEIVED']);

        const totalOrders = parseInt(totalOrdersRes[0].values[0][0] || 0, 10);
        const completedOrders = parseInt(completedOrdersRes[0].values[0][0] || 0, 10);
        const canceledOrders = parseInt(canceledOrdersRes[0].values[0][0] || 0, 10);
        const totalProfit = parseFloat(totalProfitRes[0].values[0][0] || 0);

        res.json({
            success: true,
            stats: {
                totalOrders,
                completedOrders,
                canceledOrders,
                totalProfit: parseFloat(totalProfit.toFixed(2)),
                profitMargin: providerService.PROFIT_MARGIN,
                profitPercentage: `${(providerService.PROFIT_MARGIN * 100).toFixed(0)}%`
            }
        });
    } catch (error) {
        console.error('getProfitStats error:', error);
        res.status(500).json({ success: false, message: 'خطا در دریافت آمار' });
    }
};
