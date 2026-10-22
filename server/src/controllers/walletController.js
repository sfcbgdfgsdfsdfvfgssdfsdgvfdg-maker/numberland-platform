const { getDb, saveDatabase } = require('../database');
const paymentService = require('../services/paymentService');

/**
 * دریافت تاریخچه تراکنش‌های کاربر
 */
exports.getTransactions = async (req, res) => {
    try {
        const db = getDb();
        const result = await db.exec(
            'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.userId]
        );
        
        const list = result.rows || (result.length > 0 ? result[0].values : []);
        const transactions = list.map(t => {
            if (Array.isArray(t)) {
                return {
                    id: t[0],
                    invoiceId: t[2] || t[1],
                    amountUsd: parseFloat(t[3] !== undefined ? t[3] : t[4]) || 0,
                    amountToman: t[4] !== undefined ? t[4] : t[5],
                    gateway: t[5] !== undefined ? t[5] : t[6],
                    status: t[6] !== undefined ? t[6] : t[7],
                    txid: t[7] !== undefined ? t[7] : t[8],
                    senderCard: t[9],
                    trackingCode: t[10],
                    receiptImage: t[11],
                    adminNote: t[12],
                    createdAt: t[8] !== undefined ? t[8] : t[9]
                };
            }
            return {
                id: t.id,
                invoiceId: t.invoice_id || t.invoiceId,
                amountUsd: parseFloat(t.amount_usd || 0),
                amountToman: t.amount_toman,
                gateway: t.gateway,
                status: t.status,
                txid: t.txid,
                senderCard: t.sender_card,
                trackingCode: t.tracking_code,
                receiptImage: t.receipt_image,
                adminNote: t.admin_note,
                createdAt: t.created_at || t.createdAt
            };
        });

        res.json({ success: true, transactions });
    } catch (error) {
        console.error('getTransactions error:', error);
        res.status(500).json({ success: false, message: 'خطا در دریافت تاریخچه تراکنش‌ها' });
    }
};

/**
 * ایجاد فاکتور جدید شارژ حساب (تتر کریپتو)
 */
exports.createInvoice = async (req, res) => {
    try {
        const { amountUsd, gateway } = req.body;
        const usd = parseFloat(amountUsd) || 0;

        if (usd <= 0) {
            return res.status(400).json({ success: false, message: 'مبلغ وارد شده نامعتبر است' });
        }

        const rate = await paymentService.getWallexRate();
        const amountToman = Math.round(usd * rate);
        const db = getDb();
        const invoiceId = 'INV_' + Date.now() + Math.floor(Math.random() * 1000);

        await db.run(
            `INSERT INTO transactions (user_id, invoice_id, amount_usd, amount_toman, gateway, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.user.userId, invoiceId, usd, amountToman, gateway || 'wallex', 'PENDING']
        );
        saveDatabase();

        // آدرس‌های دریافت ولت
        const trc20Address = process.env.WALLEX_USDT_TRC20_ADDRESS || process.env.TRX_TRC20_ADDRESS || 'TD8ue5Ta8S9Hu1K1MwiVmRmKrcTsweD7xP';
        const bscAddress = process.env.WALLEX_USDT_BSC_ADDRESS || '0x19b3c81ffe912e995c20cef4db50f289379bd9c7';

        res.json({
            success: true,
            invoiceId,
            amountUsd: usd,
            amountToman,
            trc20Address,
            bscAddress,
            wallexLiveConnected: !!process.env.WALLEX_API_KEY,
            message: 'فاکتور ایجاد شد'
        });
    } catch (error) {
        console.error('Create invoice error:', error);
        res.status(500).json({ success: false, message: 'خطا در ایجاد فاکتور' });
    }
};

/**
 * اعتبارسنجی خودکار واریز تتر (TRC20 / BSC)
 */
exports.verifyTrc20 = async (req, res) => {
    try {
        const { invoiceId, txid } = req.body;
        if (!invoiceId || !txid || !txid.trim()) {
            return res.status(400).json({ success: false, message: 'اطلاعات فاکتور یا کد پیگیری (TXID) ناقص است.' });
        }

        const cleanTxid = txid.trim();
        const db = getDb();

        // 1. بررسی وجود فاکتور متعلق به کاربر
        const txResult = await db.exec('SELECT user_id, amount_usd, status FROM transactions WHERE invoice_id = ? AND user_id = ?', [invoiceId, req.user.userId]);
        
        if (txResult.length === 0 || txResult[0].values.length === 0) {
            return res.status(404).json({ success: false, message: 'فاکتور مورد نظر یافت نشد.' });
        }

        const [userId, amountUsd, status] = txResult[0].values[0];

        if (status === 'SUCCESS') {
            return res.json({ success: true, message: 'این فاکتور قبلاً تایید و پرداخت شده است.' });
        }

        // 2. جلوگیری از استفاده مجدد از یک کد تراکنش (Replay Attack)
        const duplicateCheck = await db.exec(
            "SELECT invoice_id FROM transactions WHERE txid = ? AND status = 'SUCCESS'",
            [cleanTxid]
        );
        if (duplicateCheck.length > 0 && duplicateCheck[0].values.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'این کد تراکنش (TXID) قبلاً برای فاکتور دیگری در سیستم ثبت و تایید شده است!'
            });
        }

        // 3. اعتبارسنجی تراکنش از طریق API بلاکچین
        const targetAddress = process.env.WALLEX_USDT_TRC20_ADDRESS || process.env.TRX_TRC20_ADDRESS;
        const verification = await paymentService.verifyDeposit({
            txid: cleanTxid,
            expectedAmountUsd: parseFloat(amountUsd),
            targetAddress
        });

        if (!verification.success) {
            return res.status(400).json({
                success: false,
                message: verification.message || 'تراکنش در والکس یا بلاکچین تایید نشد.'
            });
        }

        // 4. به‌روزرسانی وضعیت فاکتور و شارژ موجودی کاربر
        const finalChargedAmount = parseFloat(verification.depositedAmount || amountUsd);
        await db.run("UPDATE transactions SET status = 'SUCCESS', txid = ? WHERE invoice_id = ?",
            [cleanTxid, invoiceId]);
        await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [finalChargedAmount, userId]);
        saveDatabase();

        const userBalanceResult = await db.exec('SELECT balance FROM users WHERE id = ?', [userId]);
        const newBalance = parseFloat(userBalanceResult[0].values[0][0]);

        res.json({
            success: true,
            message: `تراکنش با موفقیت تایید شد (${verification.verifiedBy}). مبلغ $${finalChargedAmount.toFixed(2)} به کیف پول شما اضافه شد.`,
            newBalance,
            verifiedBy: verification.verifiedBy
        });
    } catch (error) {
        console.error('Verify TRC20 error:', error);
        res.status(500).json({ success: false, message: 'خطا در تایید تراکنش: ' + error.message });
    }
};

/**
 * پرداخت آزمایشی (Demo Mock Payment)
 */
exports.mockPay = async (req, res) => {
    try {
        const { invoiceId, amount } = req.query;
        const usd = parseFloat(amount) || 5;
        const db = getDb();

        await db.run("UPDATE transactions SET status = 'SUCCESS', txid = ? WHERE invoice_id = ?",
            ['MOCK_' + Date.now(), invoiceId]);

        const txResult = await db.exec('SELECT user_id FROM transactions WHERE invoice_id = ?', [invoiceId]);
        if (txResult.length > 0 && txResult[0].values.length > 0) {
            const userId = txResult[0].values[0][0];
            await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [usd, userId]);
        }
        saveDatabase();

        res.send(`
            <html dir="rtl" lang="fa">
                <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                    <h2 style="color: green;">پرداخت آزمایشی با موفقیت انجام شد!</h2>
                    <p>مبلغ $${usd.toFixed(2)} به کیف پول شما اضافه شد.</p>
                    <script>setTimeout(() => { window.location.href = '/'; }, 2500);</script>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('mockPay error:', error);
        res.status(500).send('خطا در پرداخت تستی');
    }
};

/**
 * دریافت نرخ زنده تتر
 */
exports.getWallexRate = async (req, res) => {
    try {
        const rate = await paymentService.getWallexRate();
        res.json({
            success: true,
            tomanRate: rate,
            wallexConnected: !!process.env.WALLEX_API_KEY
        });
    } catch (error) {
        res.json({ success: false, fallback: true, tomanRate: 191208 });
    }
};

/**
 * وضعیت اتصال حساب
 */
exports.getWallexStatus = async (req, res) => {
    try {
        const apiKey = process.env.WALLEX_API_KEY;
        const rate = await paymentService.getWallexRate();
        
        if (!apiKey) {
            return res.json({
                success: true,
                hasApiKey: false,
                wallexConnected: false,
                tomanRate: rate,
                mode: 'sandbox_or_manual',
                message: 'کلید WALLEX_API_KEY در فایل تنظیمات .env ثبت نشده است.'
            });
        }

        const balanceData = await paymentService.getWallexBalances();
        res.json({
            success: true,
            hasApiKey: true,
            wallexConnected: balanceData.success,
            tomanRate: rate,
            accountBalances: balanceData.success ? {
                usdt: balanceData.usdtBalance,
                tmn: balanceData.tmnBalance
            } : null,
            message: balanceData.success ? 'اتصال API برقرار و فعال است.' : balanceData.message
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطا در بررسی وضعیت: ' + error.message });
    }
};

/**
 * شارژ دستی (توسط کاربر یا ادمین)
 */
exports.deposit = async (req, res) => {
    try {
        const { amount } = req.body;
        const usd = parseFloat(amount) || 0;
        
        if (usd <= 0) {
            return res.status(400).json({ success: false, message: 'مبلغ نامعتبر است' });
        }

        const db = getDb();
        await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [usd, req.user.userId]);
        saveDatabase();

        const userBalanceResult = await db.exec('SELECT balance FROM users WHERE id = ?', [req.user.userId]);
        const newBalance = parseFloat(userBalanceResult[0].values[0][0]);

        res.json({ success: true, message: `$${usd.toFixed(2)} شارژ شد`, newBalance });
    } catch (error) {
        console.error('deposit error:', error);
        res.status(500).json({ success: false, message: 'خطا در شارژ کیف پول' });
    }
};

// ========================================================
// بخش واریز کارت به کارت (Card to Card System)
// ========================================================

/**
 * دریافت اطلاعات شماره کارت مدیر و وضعیت فعال بودن
 */
exports.getCardInfo = async (req, res) => {
    try {
        const db = getDb();
        const settingsRes = await db.exec("SELECT key, value FROM settings WHERE key LIKE 'card_%'");
        const settings = {};
        if (settingsRes.length > 0 && settingsRes[0].values) {
            settingsRes[0].values.forEach(([k, v]) => { settings[k] = v; });
        }
        const rate = await paymentService.getWallexRate();

        res.json({
            success: true,
            cardNumber: settings.card_number || '6037-9979-1234-5678',
            cardHolder: settings.card_holder || 'مدیریت سیم‌جت',
            bankName: settings.card_bank || 'بانک ملی ایران',
            enabled: settings.card_enabled !== 'false',
            tomanRate: rate
        });
    } catch (error) {
        console.error('getCardInfo error:', error);
        res.status(500).json({ success: false, message: 'خطا در دریافت مشخصات کارت بانکی' });
    }
};

/**
 * صدور فاکتور واریز کارت به کارت
 */
exports.createCardInvoice = async (req, res) => {
    try {
        const { amountUsd, amountToman: customToman } = req.body;
        const rate = await paymentService.getWallexRate();
        
        let usd = parseFloat(amountUsd) || 0;
        let toman = parseInt(customToman, 10) || 0;

        if (usd <= 0 && toman > 0) {
            usd = parseFloat((toman / rate).toFixed(2));
        } else if (usd > 0 && toman <= 0) {
            toman = Math.round(usd * rate);
        }

        if (usd <= 0 || toman <= 0) {
            return res.status(400).json({ success: false, message: 'مبلغ وارد شده معتبر نیست.' });
        }

        const db = getDb();
        // دریافت اطلاعات کارت
        const settingsRes = await db.exec("SELECT key, value FROM settings WHERE key LIKE 'card_%'");
        const settings = {};
        if (settingsRes.length > 0 && settingsRes[0].values) {
            settingsRes[0].values.forEach(([k, v]) => { settings[k] = v; });
        }

        if (settings.card_enabled === 'false') {
            return res.status(400).json({ success: false, message: 'واریز کارت به کارت موقتاً غیرفعال است.' });
        }

        const invoiceId = 'CARD_' + Date.now() + Math.floor(Math.random() * 1000);

        await db.run(
            `INSERT INTO transactions (user_id, invoice_id, amount_usd, amount_toman, gateway, status)
             VALUES (?, ?, ?, ?, 'card', 'PENDING')`,
            [req.user.userId, invoiceId, usd, toman]
        );
        saveDatabase();

        res.json({
            success: true,
            invoiceId,
            amountUsd: usd,
            amountToman: toman,
            cardNumber: settings.card_number || '6037-9979-1234-5678',
            cardHolder: settings.card_holder || 'مدیریت سیم‌جت',
            bankName: settings.card_bank || 'بانک ملی ایران',
            message: 'فاکتور کارت به کارت صادر شد.'
        });
    } catch (error) {
        console.error('createCardInvoice error:', error);
        res.status(500).json({ success: false, message: 'خطا در ایجاد فاکتور کارت به کارت' });
    }
};

/**
 * ثبت فیش / شماره پیگیری کارت به کارت توسط کاربر
 */
exports.submitCardReceipt = async (req, res) => {
    try {
        const { invoiceId, senderCard, trackingCode, receiptImage } = req.body;

        if (!invoiceId || (!trackingCode && !senderCard)) {
            return res.status(400).json({
                success: false,
                message: 'لطفاً حداقل شماره کارت واریزکننده یا شماره پیگیری تراکنش را وارد کنید.'
            });
        }

        const db = getDb();
        const check = await db.exec(
            "SELECT id, user_id, status FROM transactions WHERE invoice_id = ? AND user_id = ?",
            [invoiceId, req.user.userId]
        );

        if (check.length === 0 || check[0].values.length === 0) {
            return res.status(404).json({ success: false, message: 'فاکتور مورد نظر یافت نشد.' });
        }

        const [id, userId, status] = check[0].values[0];
        if (status === 'SUCCESS') {
            return res.status(400).json({ success: false, message: 'این فاکتور قبلاً تایید و کیف پول شارژ شده است.' });
        }

        await db.run(
            `UPDATE transactions 
             SET sender_card = ?, tracking_code = ?, receipt_image = ?, status = 'PENDING_APPROVAL', txid = ?
             WHERE invoice_id = ?`,
            [senderCard || '', trackingCode || '', receiptImage || null, trackingCode || senderCard, invoiceId]
        );
        saveDatabase();

        res.json({
            success: true,
            message: 'رسید پرداخت با موفقیت ثبت شد و در صف بررسی مدیریت قرار گرفت.',
            invoiceId
        });
    } catch (error) {
        console.error('submitCardReceipt error:', error);
        res.status(500).json({ success: false, message: 'خطا در ثبت رسید پرداخت' });
    }
};

// ========================================================
// بخش مدیریت کارت به کارت (Admin Panel Management)
// ========================================================

/**
 * دریافت تنظیمات کارت بانکی برای ادمین
 */
exports.adminGetCardSettings = async (req, res) => {
    try {
        const db = getDb();
        const settingsRes = await db.exec("SELECT key, value FROM settings WHERE key LIKE 'card_%'");
        const settings = {};
        if (settingsRes.length > 0 && settingsRes[0].values) {
            settingsRes[0].values.forEach(([k, v]) => { settings[k] = v; });
        }

        res.json({
            success: true,
            cardNumber: settings.card_number || '6037-9979-1234-5678',
            cardHolder: settings.card_holder || 'مدیریت سیم‌جت',
            bankName: settings.card_bank || 'بانک ملی ایران',
            enabled: settings.card_enabled !== 'false'
        });
    } catch (error) {
        console.error('adminGetCardSettings error:', error);
        res.status(500).json({ success: false, message: 'خطا در دریافت تنظیمات کارت' });
    }
};

/**
 * بروزرسانی تنظیمات کارت بانکی توسط ادمین
 */
exports.adminUpdateCardSettings = async (req, res) => {
    try {
        const { cardNumber, cardHolder, bankName, enabled } = req.body;
        const db = getDb();

        if (cardNumber) {
            await db.run("INSERT INTO settings (key, value) VALUES ('card_number', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [cardNumber.trim()]);
        }
        if (cardHolder) {
            await db.run("INSERT INTO settings (key, value) VALUES ('card_holder', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [cardHolder.trim()]);
        }
        if (bankName) {
            await db.run("INSERT INTO settings (key, value) VALUES ('card_bank', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [bankName.trim()]);
        }
        if (enabled !== undefined) {
            await db.run("INSERT INTO settings (key, value) VALUES ('card_enabled', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [enabled ? 'true' : 'false']);
        }
        saveDatabase();

        res.json({ success: true, message: 'تنظیمات کارت بانکی با موفقیت بروزرسانی شد.' });
    } catch (error) {
        console.error('adminUpdateCardSettings error:', error);
        res.status(500).json({ success: false, message: 'خطا در ذخیره تنظیمات کارت' });
    }
};

/**
 * دریافت لیست فیش‌ها و واریزهای کارت به کارت برای ادمین
 */
exports.adminGetCardRequests = async (req, res) => {
    try {
        const db = getDb();
        const requestsResult = await db.exec(`
            SELECT t.id, t.invoice_id, t.amount_usd, t.amount_toman, t.status, 
                   t.sender_card, t.tracking_code, t.receipt_image, t.admin_note, 
                   t.created_at, u.email, u.full_name, u.balance
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            WHERE t.gateway = 'card'
            ORDER BY t.id DESC
            LIMIT 150
        `);

        const requests = requestsResult.length > 0 && requestsResult[0].values ? requestsResult[0].values.map(r => ({
            id: r[0],
            invoiceId: r[1],
            amountUsd: parseFloat(r[2] || 0),
            amountToman: r[3],
            status: r[4],
            senderCard: r[5],
            trackingCode: r[6],
            receiptImage: r[7],
            adminNote: r[8],
            createdAt: r[9],
            userEmail: r[10],
            userName: r[11],
            userBalance: parseFloat(r[12] || 0)
        })) : [];

        const pendingCount = requests.filter(r => r.status === 'PENDING_APPROVAL').length;

        res.json({
            success: true,
            requests,
            pendingCount
        });
    } catch (error) {
        console.error('adminGetCardRequests error:', error);
        res.status(500).json({ success: false, message: 'خطا در دریافت لیست واریزی‌ها' });
    }
};

/**
 * تایید واریز کارت به کارت و شارژ خودکار موجودی کاربر
 */
exports.adminApproveCard = async (req, res) => {
    try {
        const { invoiceId } = req.body;
        if (!invoiceId) {
            return res.status(400).json({ success: false, message: 'شناسه فاکتور الزامی است.' });
        }

        const db = getDb();
        const txRes = await db.exec(
            "SELECT user_id, amount_usd, status FROM transactions WHERE invoice_id = ?",
            [invoiceId]
        );

        if (txRes.length === 0 || txRes[0].values.length === 0) {
            return res.status(404).json({ success: false, message: 'فاکتور یافت نشد.' });
        }

        const [userId, amountUsd, status] = txRes[0].values[0];

        if (status === 'SUCCESS') {
            return res.status(400).json({ success: false, message: 'این فاکتور قبلاً تایید و شارژ شده است.' });
        }

        const usd = parseFloat(amountUsd || 0);

        // 1. تغییر وضعیت به SUCCESS
        await db.run("UPDATE transactions SET status = 'SUCCESS' WHERE invoice_id = ?", [invoiceId]);

        // 2. افزایش موجودی کاربر
        await db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [usd, userId]);
        saveDatabase();

        const userBalRes = await db.exec("SELECT balance, email FROM users WHERE id = ?", [userId]);
        const newBalance = parseFloat(userBalRes[0].values[0][0]);
        const userEmail = userBalRes[0].values[0][1];

        res.json({
            success: true,
            message: `فاکتور تایید شد و مبلغ $${usd.toFixed(2)} به کیف پول کاربر (${userEmail}) اضافه شد.`,
            newBalance
        });
    } catch (error) {
        console.error('adminApproveCard error:', error);
        res.status(500).json({ success: false, message: 'خطا در تایید واریز' });
    }
};

/**
 * رد فیش کارت به کارت با درج دلیل
 */
exports.adminRejectCard = async (req, res) => {
    try {
        const { invoiceId, reason } = req.body;
        if (!invoiceId) {
            return res.status(400).json({ success: false, message: 'شناسه فاکتور الزامی است.' });
        }

        const db = getDb();
        const txRes = await db.exec(
            "SELECT user_id, status FROM transactions WHERE invoice_id = ?",
            [invoiceId]
        );

        if (txRes.length === 0 || txRes[0].values.length === 0) {
            return res.status(404).json({ success: false, message: 'فاکتور یافت نشد.' });
        }

        const [userId, status] = txRes[0].values[0];

        if (status === 'SUCCESS') {
            return res.status(400).json({ success: false, message: 'فاکتور تایید شده را نمی‌توان رد کرد.' });
        }

        await db.run(
            "UPDATE transactions SET status = 'REJECTED', admin_note = ? WHERE invoice_id = ?",
            [reason || 'اطلاعات واریزی مطابقت ندارد', invoiceId]
        );
        saveDatabase();

        res.json({
            success: true,
            message: 'درخواست واریز کارت به کارت رد شد.'
        });
    } catch (error) {
        console.error('adminRejectCard error:', error);
        res.status(500).json({ success: false, message: 'خطا در رد درخواست' });
    }
};
