const { getDb, saveDatabase } = require('../database');
const paymentService = require('../services/paymentService');

/**
 * دریافت اطلاعات پلن و موجودی انبار برای عموم کاربران
 */
exports.getPlanInfo = async (req, res) => {
    try {
        const db = getDb();

        // دریافت قیمت دلاری از تنظیمات
        const priceRow = await db.exec("SELECT value FROM settings WHERE key = 'windscribe_monthly_price'");
        const priceUsd = priceRow.length > 0 && priceRow[0].values.length > 0 
            ? parseFloat(priceRow[0].values[0][0]) || 4.0 
            : 4.0;

        // دریافت عنوان پلن
        const titleRow = await db.exec("SELECT value FROM settings WHERE key = 'windscribe_plan_title'");
        const planTitle = titleRow.length > 0 && titleRow[0].values.length > 0 
            ? titleRow[0].values[0][0] 
            : 'اکانت پرمیوم ۱ ماهه ویندسکرایب (نامحدود)';

        // دریافت تعداد اکانت‌های موجود در انبار
        const countRow = await db.exec("SELECT count(*) FROM windscribe_accounts WHERE status = 'AVAILABLE'");
        const availableCount = countRow.length > 0 && countRow[0].values.length > 0 
            ? parseInt(countRow[0].values[0][0], 10) 
            : 0;

        // محاسبه معادل تومانی با نرخ زنده والکس
        const rate = await paymentService.getWallexRate();
        const priceToman = Math.round(priceUsd * rate);

        res.json({
            success: true,
            plan: {
                title: planTitle,
                priceUsd,
                priceToman,
                rate,
                availableCount,
                features: [
                    '👥 بدون محدودیت در تعداد کاربر (استفاده همزمان ۱۰ الی ۱۵ نفر)',
                    '🚀 ترافیک کاملاً نامحدود و پرسرعت (سرورهای ۱۰ گیگابیتی)',
                    '📱 اتصال همزمان روی ویندوز، اندروید، iOS و مک',
                    '🛡 پروتکل‌های قدرتمند WireGuard, Stealth, Wstunnel',
                    '🌍 دسترسی به معتبرترین لوکیشن‌ها با آی‌پی‌های ثابت',
                    '⚡️ بدون قطعی و کاملاً سازگار با تمامی اپراتورهای ایران'
                ]
            }
        });
    } catch (error) {
        console.error('getPlanInfo error:', error);
        res.status(500).json({ success: false, message: 'خطا در دریافت اطلاعات پلن' });
    }
};

/**
 * خرید اکانت ویندسکرایب و تحویل آنی یوزرنیم و پسورد
 */
exports.buyAccount = async (req, res) => {
    try {
        const db = getDb();
        const userId = req.user.userId;

        // 1. دریافت قیمت فعلی
        const priceRow = await db.exec("SELECT value FROM settings WHERE key = 'windscribe_monthly_price'");
        const priceUsd = priceRow.length > 0 && priceRow[0].values.length > 0 
            ? parseFloat(priceRow[0].values[0][0]) || 4.0 
            : 4.0;

        // 2. بررسی موجودی کیف پول کاربر
        const userRow = await db.exec('SELECT balance FROM users WHERE id = ?', [userId]);
        if (userRow.length === 0 || userRow[0].values.length === 0) {
            return res.status(404).json({ success: false, message: 'کاربر یافت نشد' });
        }
        const currentBalance = parseFloat(userRow[0].values[0][0] || 0);

        if (currentBalance < priceUsd) {
            return res.status(400).json({
                success: false,
                message: `موجودی کیف پول شما کافی نیست. موجودی فعلی: $${currentBalance.toFixed(2)} - قیمت پلن: $${priceUsd.toFixed(2)}`
            });
        }

        // 3. پیدا کردن یک اکانت موجود در انبار
        const accountRow = await db.exec("SELECT id, username, password FROM windscribe_accounts WHERE status = 'AVAILABLE' ORDER BY id ASC LIMIT 1");
        if (accountRow.length === 0 || accountRow[0].values.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'موجودی انبار اکانت‌های ویندسکرایب در حال حاضر به اتمام رسیده است. به زودی توسط ادمین شارژ می‌شود.'
            });
        }

        const [accountId, username, password] = accountRow[0].values[0];
        const orderId = 'WS_' + Date.now() + Math.floor(Math.random() * 1000);

        // 4. محاسبه نرخ تومان
        const rate = await paymentService.getWallexRate();
        const priceToman = Math.round(priceUsd * rate);

        // 5. کسر موجودی از کیف پول کاربر
        await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [priceUsd, userId]);

        // 6. تغییر وضعیت اکانت در انبار به SOLD
        await db.run(
            "UPDATE windscribe_accounts SET status = 'SOLD', sold_to_user_id = ?, sold_at = CURRENT_TIMESTAMP, order_id = ? WHERE id = ?",
            [userId, orderId, accountId]
        );

        // 7. ثبت در جدول سفارشات ویندسکرایب
        await db.run(
            `INSERT INTO windscribe_orders (user_id, order_id, account_id, username, password, plan_name, price_usd, price_toman)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, orderId, accountId, username, password, 'پلن ۱ ماهه نامحدود', priceUsd, priceToman]
        );

        saveDatabase();

        // 8. دریافت موجودی جدید
        const newBalance = parseFloat((await db.exec('SELECT balance FROM users WHERE id = ?', [userId]))[0].values[0][0]);

        res.json({
            success: true,
            message: 'اکانت ویندسکرایب با موفقیت خریداری و تحویل شد!',
            order: {
                orderId,
                username,
                password,
                planName: 'پلن ۱ ماهه نامحدود',
                priceUsd,
                priceToman
            },
            newBalance
        });
    } catch (error) {
        console.error('buyAccount error:', error);
        res.status(500).json({ success: false, message: 'خطا در خرید اکانت: ' + error.message });
    }
};

/**
 * دریافت تاریخچه سفارشات اکانت ویندسکرایب کاربر جاری
 */
exports.getMyOrders = async (req, res) => {
    try {
        const db = getDb();
        const result = await db.exec(
            'SELECT order_id, username, password, plan_name, price_usd, price_toman, created_at FROM windscribe_orders WHERE user_id = ? ORDER BY id DESC',
            [req.user.userId]
        );

        const orders = result.length > 0 ? result[0].values.map(r => ({
            orderId: r[0],
            username: r[1],
            password: r[2],
            planName: r[3],
            priceUsd: parseFloat(r[4] || 0),
            priceToman: r[5],
            createdAt: r[6]
        })) : [];

        res.json({ success: true, orders });
    } catch (error) {
        console.error('getMyOrders error:', error);
        res.status(500).json({ success: false, message: 'خطا در دریافت سفارشات' });
    }
};

// ========================================================
// بخش مدیریت ادمین (Admin Management)
// ========================================================

/**
 * دریافت موجودی انبار و گزارش اکانت‌ها برای ادمین
 */
exports.adminGetInventory = async (req, res) => {
    try {
        const db = getDb();

        // آمار کلی
        const totalCount = parseInt((await db.exec("SELECT count(*) FROM windscribe_accounts"))[0]?.values[0][0] || 0, 10);
        const availableCount = parseInt((await db.exec("SELECT count(*) FROM windscribe_accounts WHERE status = 'AVAILABLE'"))[0]?.values[0][0] || 0, 10);
        const soldCount = parseInt((await db.exec("SELECT count(*) FROM windscribe_accounts WHERE status = 'SOLD'"))[0]?.values[0][0] || 0, 10);

        // قیمت فعلی
        const priceRow = await db.exec("SELECT value FROM settings WHERE key = 'windscribe_monthly_price'");
        const priceUsd = priceRow.length > 0 && priceRow[0].values.length > 0 
            ? parseFloat(priceRow[0].values[0][0]) || 4.0 
            : 4.0;

        // لیست اکانت‌های موجود و فروخته‌شده
        const accountsResult = await db.exec(`
            SELECT a.id, a.username, a.password, a.status, a.created_at, a.sold_at, a.order_id, u.email as buyer_email
            FROM windscribe_accounts a
            LEFT JOIN users u ON a.sold_to_user_id = u.id
            ORDER BY a.id DESC LIMIT 100
        `);

        const accounts = accountsResult.length > 0 ? accountsResult[0].values.map(r => ({
            id: r[0],
            username: r[1],
            password: r[2],
            status: r[3],
            createdAt: r[4],
            soldAt: r[5],
            orderId: r[6],
            buyerEmail: r[7]
        })) : [];

        res.json({
            success: true,
            stats: {
                totalCount,
                availableCount,
                soldCount,
                priceUsd
            },
            accounts
        });
    } catch (error) {
        console.error('adminGetInventory error:', error);
        res.status(500).json({ success: false, message: 'خطا در دریافت آمار انبار' });
    }
};

/**
 * افزودن دسته‌ای یا تکی اکانت‌ها به انبار توسط ادمین
 */
exports.adminAddAccounts = async (req, res) => {
    try {
        const { rawText, accounts } = req.body;
        const db = getDb();
        const toInsert = [];

        // اگر آرایه‌ای از اکانت‌ها فرستاده شده بود
        if (Array.isArray(accounts)) {
            for (const item of accounts) {
                if (item.username && item.password) {
                    toInsert.push({ username: item.username.trim(), password: item.password.trim() });
                }
            }
        }

        // اگر متن چندخطی فرستاده شده بود (پشتیبانی از user:pass یا user,pass یا user\tpass یا user pass)
        if (typeof rawText === 'string') {
            const lines = rawText.split('\n');
            for (let line of lines) {
                line = line.trim();
                if (!line) continue;

                let u = '', p = '';
                if (line.includes(':')) {
                    const parts = line.split(':');
                    u = parts[0]?.trim();
                    p = parts.slice(1).join(':')?.trim();
                } else if (line.includes(',')) {
                    const parts = line.split(',');
                    u = parts[0]?.trim();
                    p = parts.slice(1).join(',')?.trim();
                } else if (line.includes('|')) {
                    const parts = line.split('|');
                    u = parts[0]?.trim();
                    p = parts.slice(1).join('|')?.trim();
                } else {
                    const parts = line.split(/\s+/);
                    if (parts.length >= 2) {
                        u = parts[0]?.trim();
                        p = parts.slice(1).join(' ')?.trim();
                    }
                }

                if (u && p) {
                    toInsert.push({ username: u, password: p });
                }
            }
        }

        if (toInsert.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'هیچ یوزرنیم و پسوردی شناسایی نشد. لطفاً در هر سطر فرمت "username:password" را وارد کنید.'
            });
        }

        let addedCount = 0;
        for (const acc of toInsert) {
            await db.run(
                "INSERT INTO windscribe_accounts (username, password, plan_type, status) VALUES (?, ?, 'monthly_unlimited', 'AVAILABLE')",
                [acc.username, acc.password]
            );
            addedCount++;
        }

        saveDatabase();

        const countRow = await db.exec("SELECT count(*) FROM windscribe_accounts WHERE status = 'AVAILABLE'");
        const currentAvailable = parseInt(countRow[0].values[0][0], 10);

        res.json({
            success: true,
            message: `تعداد ${addedCount} اکانت با موفقیت به انبار ویندسکرایب اضافه شد.`,
            addedCount,
            currentAvailable
        });
    } catch (error) {
        console.error('adminAddAccounts error:', error);
        res.status(500).json({ success: false, message: 'خطا در ثبت اکانت‌ها: ' + error.message });
    }
};

/**
 * تغییر قیمت دلاری پلن توسط ادمین
 */
exports.adminUpdatePrice = async (req, res) => {
    try {
        const { priceUsd } = req.body;
        const newPrice = parseFloat(priceUsd);

        if (isNaN(newPrice) || newPrice <= 0) {
            return res.status(400).json({ success: false, message: 'مبلغ دلاری نامعتبر است' });
        }

        const db = getDb();
        await db.run(
            "INSERT INTO settings (key, value) VALUES ('windscribe_monthly_price', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
            [newPrice.toFixed(2)]
        );
        saveDatabase();

        res.json({
            success: true,
            message: `قیمت پلن ماهانه ویندسکرایب با موفقیت به $${newPrice.toFixed(2)} تغییر یافت.`,
            priceUsd: newPrice
        });
    } catch (error) {
        console.error('adminUpdatePrice error:', error);
        res.status(500).json({ success: false, message: 'خطا در بروزرسانی قیمت' });
    }
};

/**
 * حذف یک اکانت فروخته‌نشده از انبار توسط ادمین
 */
exports.adminDeleteAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const check = await db.exec("SELECT status FROM windscribe_accounts WHERE id = ?", [id]);
        if (check.length === 0 || check[0].values.length === 0) {
            return res.status(404).json({ success: false, message: 'اکانت یافت نشد' });
        }

        const status = check[0].values[0][0];
        if (status === 'SOLD') {
            return res.status(400).json({ success: false, message: 'امکان حذف اکانت فروخته‌شده وجود ندارد.' });
        }

        await db.run("DELETE FROM windscribe_accounts WHERE id = ?", [id]);
        saveDatabase();

        res.json({ success: true, message: 'اکانت از انبار حذف شد.' });
    } catch (error) {
        console.error('adminDeleteAccount error:', error);
        res.status(500).json({ success: false, message: 'خطا در حذف اکانت' });
    }
};
