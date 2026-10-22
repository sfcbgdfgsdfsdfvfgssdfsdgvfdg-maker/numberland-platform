const { getDb, saveDatabase } = require('../database');
const paymentService = require('../services/paymentService');

/**
 * دریافت اطلاعات پلن جمنای پرو ۱۸ ماهه و موجودی انبار برای عموم کاربران
 */
exports.getPlanInfo = async (req, res) => {
    try {
        const db = getDb();

        // دریافت قیمت دلاری از تنظیمات
        const priceRow = await db.exec("SELECT value FROM settings WHERE key = 'gemini_18m_price'");
        const priceUsd = priceRow.length > 0 && priceRow[0].values.length > 0 
            ? parseFloat(priceRow[0].values[0][0]) || 12.0 
            : 12.0;

        // دریافت عنوان پلن
        const titleRow = await db.exec("SELECT value FROM settings WHERE key = 'gemini_plan_title'");
        const planTitle = titleRow.length > 0 && titleRow[0].values.length > 0 
            ? titleRow[0].values[0][0] 
            : 'اکانت جمنای پرو ۱۸ ماهه (Google Gemini Advanced)';

        // راهنمای فعال‌سازی
        const instrRow = await db.exec("SELECT value FROM settings WHERE key = 'gemini_instructions'");
        const instructions = instrRow.length > 0 && instrRow[0].values.length > 0 
            ? instrRow[0].values[0][0] 
            : 'روی لینک فعال‌سازی کلیک کرده و با اکانت گوگل (جیمیل) خود وارد شوید تا پلن پرمیوم ۱۸ ماهه فعال گردد.';

        // تعداد لینک‌های موجود در انبار
        const countRow = await db.exec("SELECT count(*) FROM gemini_links WHERE status = 'AVAILABLE'");
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
                instructions,
                durationMonths: 18,
                features: [
                    '🤖 دسترسی به مدل‌های پرچمدار و نسل جدید: 4 Argon و 3.1 Pro',
                    '🧠 قابلیت تنظیم سطح تفکر و استدلال (Thinking Level)',
                    '☁️ ۲ الی ۵ ترابایت (2TB تا 5TB) فضای ابری اختصاصی Google Drive',
                    '⚡️ دسترسی کامل به مدل‌های پرسرعت 3.8 Flash و 3.5 Flash-Lite',
                    '📚 پنجره زمینه بسیار حجیم برای تحلیل کتاب‌ها، فایل‌ها و کدهای پیچیده',
                    '🔒 فعال‌سازی قانونی ۱۸ ماهه روی اکانت شخصی جیمیل شما با تحویل آنی'
                ]
            }
        });
    } catch (error) {
        console.error('getGeminiPlanInfo error:', error);
        res.status(500).json({ success: false, message: 'خطا در دریافت اطلاعات پلن جمنای' });
    }
};

/**
 * خرید اکانت جمنای پرو و تحویل آنی لینک اختصاصی
 */
exports.buyAccount = async (req, res) => {
    try {
        const db = getDb();
        const userId = req.user.userId;

        // ۱. دریافت قیمت فعلی
        const priceRow = await db.exec("SELECT value FROM settings WHERE key = 'gemini_18m_price'");
        const priceUsd = priceRow.length > 0 && priceRow[0].values.length > 0 
            ? parseFloat(priceRow[0].values[0][0]) || 12.0 
            : 12.0;

        // ۲. بررسی موجودی کیف پول کاربر
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

        // ۳. پیدا کردن یک لینک معتبر و موجود در انبار
        const linkRow = await db.exec("SELECT id, invite_link FROM gemini_links WHERE status = 'AVAILABLE' ORDER BY id ASC LIMIT 1");
        if (linkRow.length === 0 || linkRow[0].values.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'موجودی لینک‌های اکانت جمنای پرو در حال حاضر به اتمام رسیده است. به زودی توسط مدیریت شارژ می‌شود.'
            });
        }

        const [linkId, inviteLink] = linkRow[0].values[0];
        const orderId = 'GEMINI_' + Date.now() + Math.floor(Math.random() * 1000);

        // ۴. دریافت تنظیمات راهنما و عنوان
        const instrRow = await db.exec("SELECT value FROM settings WHERE key = 'gemini_instructions'");
        const instructions = instrRow.length > 0 && instrRow[0].values.length > 0 
            ? instrRow[0].values[0][0] 
            : 'روی لینک فعال‌سازی کلیک کرده و با اکانت گوگل (جیمیل) خود وارد شوید تا پلن پرمیوم ۱۸ ماهه فعال گردد.';

        // ۵. محاسبه نرخ روز تومانی
        const rate = await paymentService.getWallexRate();
        const priceToman = Math.round(priceUsd * rate);

        // ۶. کسر موجودی از کیف پول کاربر
        await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [priceUsd, userId]);

        // ۷. ثبت خروج لینک از انبار
        await db.run(
            "UPDATE gemini_links SET status = 'SOLD', sold_to_user_id = ?, sold_at = CURRENT_TIMESTAMP, order_id = ? WHERE id = ?",
            [userId, orderId, linkId]
        );

        // ۸. ثبت در جدول سفارشات جمنای
        await db.run(
            `INSERT INTO gemini_orders (user_id, order_id, link_id, invite_link, plan_name, price_usd, price_toman, instructions)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, orderId, linkId, inviteLink, 'اکانت جمنای پرو ۱۸ ماهه', priceUsd, priceToman, instructions]
        );

        saveDatabase();

        // ۹. دریافت موجودی به‌روزرسانی شده
        const newBalance = parseFloat((await db.exec('SELECT balance FROM users WHERE id = ?', [userId]))[0].values[0][0]);

        res.json({
            success: true,
            message: 'اکانت جمنای پرو ۱۸ ماهه با موفقیت خریداری شد و لینک فعال‌سازی صادر گردید!',
            order: {
                orderId,
                inviteLink,
                instructions,
                planName: 'اکانت جمنای پرو ۱۸ ماهه (Gemini Advanced)',
                priceUsd,
                priceToman
            },
            newBalance
        });
    } catch (error) {
        console.error('buyGeminiAccount error:', error);
        res.status(500).json({ success: false, message: 'خطا در خرید اکانت جمنای: ' + error.message });
    }
};

/**
 * دریافت تاریخچه سفارشات جمنای پرو برای کاربر جاری
 */
exports.getMyOrders = async (req, res) => {
    try {
        const db = getDb();
        const result = await db.exec(
            'SELECT order_id, invite_link, plan_name, price_usd, price_toman, instructions, created_at FROM gemini_orders WHERE user_id = ? ORDER BY id DESC',
            [req.user.userId]
        );

        const orders = result.length > 0 ? result[0].values.map(r => ({
            orderId: r[0],
            inviteLink: r[1],
            planName: r[2],
            priceUsd: parseFloat(r[3] || 0),
            priceToman: r[4],
            instructions: r[5],
            createdAt: r[6]
        })) : [];

        res.json({ success: true, orders });
    } catch (error) {
        console.error('getGeminiOrders error:', error);
        res.status(500).json({ success: false, message: 'خطا در دریافت سفارشات جمنای' });
    }
};

// ========================================================
// بخش مدیریت ادمین (Admin Management)
// ========================================================

/**
 * دریافت آمار انبار و لیست لینک‌ها برای ادمین
 */
exports.adminGetInventory = async (req, res) => {
    try {
        const db = getDb();

        const totalCount = parseInt((await db.exec("SELECT count(*) FROM gemini_links"))[0]?.values[0][0] || 0, 10);
        const availableCount = parseInt((await db.exec("SELECT count(*) FROM gemini_links WHERE status = 'AVAILABLE'"))[0]?.values[0][0] || 0, 10);
        const soldCount = parseInt((await db.exec("SELECT count(*) FROM gemini_links WHERE status = 'SOLD'"))[0]?.values[0][0] || 0, 10);

        // قیمت فعلی
        const priceRow = await db.exec("SELECT value FROM settings WHERE key = 'gemini_18m_price'");
        const priceUsd = priceRow.length > 0 && priceRow[0].values.length > 0 
            ? parseFloat(priceRow[0].values[0][0]) || 12.0 
            : 12.0;

        // متن راهنما
        const instrRow = await db.exec("SELECT value FROM settings WHERE key = 'gemini_instructions'");
        const instructions = instrRow.length > 0 && instrRow[0].values.length > 0 
            ? instrRow[0].values[0][0] 
            : '';

        // لیست لینک‌ها
        const linksResult = await db.exec(`
            SELECT g.id, g.invite_link, g.status, g.note, g.created_at, g.sold_at, g.order_id, u.email as buyer_email
            FROM gemini_links g
            LEFT JOIN users u ON g.sold_to_user_id = u.id
            ORDER BY g.id DESC LIMIT 150
        `);

        const links = linksResult.length > 0 ? linksResult[0].values.map(r => ({
            id: r[0],
            inviteLink: r[1],
            status: r[2],
            note: r[3],
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
                priceUsd,
                instructions
            },
            links
        });
    } catch (error) {
        console.error('adminGetGeminiInventory error:', error);
        res.status(500).json({ success: false, message: 'خطا در دریافت آمار انبار جمنای' });
    }
};

/**
 * افزودن گروهی لینک‌های فعال‌سازی به انبار توسط ادمین
 */
exports.adminAddLinks = async (req, res) => {
    try {
        const { rawText, links, note } = req.body;
        const db = getDb();
        const toInsert = [];

        // اگر آرایه‌ای ارسال شده باشد
        if (Array.isArray(links)) {
            for (const item of links) {
                const linkStr = typeof item === 'string' ? item.trim() : item?.link?.trim();
                if (linkStr) toInsert.push({ link: linkStr, note: item?.note || note || '' });
            }
        }

        // اگر متن چندخطی ارسال شده باشد (هر سطر یک لینک)
        if (typeof rawText === 'string') {
            const lines = rawText.split('\n');
            for (let line of lines) {
                line = line.trim();
                if (!line) continue;
                toInsert.push({ link: line, note: note || '' });
            }
        }

        if (toInsert.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'هیچ لینکی یافت نشد. لطفاً در هر سطر یک لینک فعال‌سازی وارد فرمایید.'
            });
        }

        let addedCount = 0;
        for (const item of toInsert) {
            await db.run(
                "INSERT INTO gemini_links (invite_link, plan_type, status, note) VALUES (?, 'gemini_pro_18m', 'AVAILABLE', ?)",
                [item.link, item.note]
            );
            addedCount++;
        }

        saveDatabase();

        const countRow = await db.exec("SELECT count(*) FROM gemini_links WHERE status = 'AVAILABLE'");
        const currentAvailable = parseInt(countRow[0].values[0][0], 10);

        res.json({
            success: true,
            message: `تعداد ${addedCount} لینک فعال‌سازی با موفقیت به انبار جمنای پرو اضافه شد.`,
            addedCount,
            currentAvailable
        });
    } catch (error) {
        console.error('adminAddGeminiLinks error:', error);
        res.status(500).json({ success: false, message: 'خطا در ثبت لینک‌ها: ' + error.message });
    }
};

/**
 * تغییر قیمت و تنظیمات پلن جمنای توسط ادمین
 */
exports.adminUpdateSettings = async (req, res) => {
    try {
        const { priceUsd, instructions, planTitle } = req.body;
        const db = getDb();

        if (priceUsd !== undefined) {
            const newPrice = parseFloat(priceUsd);
            if (isNaN(newPrice) || newPrice <= 0) {
                return res.status(400).json({ success: false, message: 'مبلغ دلاری نامعتبر است' });
            }
            await db.run(
                "INSERT INTO settings (key, value) VALUES ('gemini_18m_price', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
                [newPrice.toFixed(2)]
            );
        }

        if (instructions !== undefined) {
            await db.run(
                "INSERT INTO settings (key, value) VALUES ('gemini_instructions', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
                [instructions.trim()]
            );
        }

        if (planTitle !== undefined) {
            await db.run(
                "INSERT INTO settings (key, value) VALUES ('gemini_plan_title', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
                [planTitle.trim()]
            );
        }

        saveDatabase();

        res.json({
            success: true,
            message: 'تنظیمات پلن جمنای پرو ۱۸ ماهه با موفقیت ذخیره شد.'
        });
    } catch (error) {
        console.error('adminUpdateGeminiSettings error:', error);
        res.status(500).json({ success: false, message: 'خطا در بروزرسانی تنظیمات' });
    }
};

/**
 * حذف یک لینک استفاده‌نشده از انبار توسط ادمین
 */
exports.adminDeleteLink = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const check = await db.exec("SELECT status FROM gemini_links WHERE id = ?", [id]);
        if (check.length === 0 || check[0].values.length === 0) {
            return res.status(404).json({ success: false, message: 'لینک یافت نشد' });
        }

        const status = check[0].values[0][0];
        if (status === 'SOLD') {
            return res.status(400).json({ success: false, message: 'امکان حذف لینک فروخته‌شده وجود ندارد.' });
        }

        await db.run("DELETE FROM gemini_links WHERE id = ?", [id]);
        saveDatabase();

        res.json({ success: true, message: 'لینک از انبار حذف شد.' });
    } catch (error) {
        console.error('adminDeleteGeminiLink error:', error);
        res.status(500).json({ success: false, message: 'خطا در حذف لینک' });
    }
};
