const { Telegraf, Markup } = require('telegraf');
const { getDb, saveDatabase } = require('../database');
const paymentService = require('./paymentService');

let bot = null;

// نگهداری وضعیت‌های موقت کاربران (State Management)
const userStates = new Map();

/**
 * دریافت یا ساخت کاربر در دیتابیس بر اساس شناسه تلگرام
 */
async function getOrCreateTelegramUser(ctx) {
    const db = getDb();
    const tgId = ctx.from.id;
    const tgUsername = ctx.from.username || '';
    const fullName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'کاربر تلگرام';
    const adminTgId = process.env.TELEGRAM_ADMIN_ID ? parseInt(process.env.TELEGRAM_ADMIN_ID, 10) : 7725037224;
    const isAdmin = tgId === adminTgId;

    // ۱. بررسی بر اساس telegram_id
    const userRes = await db.exec('SELECT id, email, balance, is_admin FROM users WHERE telegram_id = ?', [tgId]);
    if (userRes.length > 0 && userRes[0].values.length > 0) {
        const [id, email, balance, dbIsAdmin] = userRes[0].values[0];
        if (isAdmin && !dbIsAdmin) {
            await db.run('UPDATE users SET is_admin = TRUE WHERE id = ?', [id]);
        }
        return { id, email, balance: parseFloat(balance || 0), isAdmin: isAdmin || !!dbIsAdmin };
    }

    // ۲. ساخت کاربر جدید
    const dummyEmail = `tg_${tgId}@telegram.local`;
    const dummyPass = 'TG_USER_AUTH_' + Date.now();

    await db.run(
        `INSERT INTO users (email, password, full_name, balance, is_admin, telegram_id, telegram_username)
         VALUES (?, ?, ?, 0, ?, ?, ?)
         ON CONFLICT (email) DO UPDATE
         SET telegram_id = EXCLUDED.telegram_id, telegram_username = EXCLUDED.telegram_username`,
        [dummyEmail, dummyPass, fullName, isAdmin, tgId, tgUsername]
    );
    saveDatabase();

    const createdRes = await db.exec('SELECT id, email, balance, is_admin FROM users WHERE telegram_id = ?', [tgId]);
    const [id, email, balance, dbIsAdmin] = createdRes[0].values[0];
    return { id, email, balance: parseFloat(balance || 0), isAdmin: !!dbIsAdmin };
}

/**
 * کیبورد اصلی ریپلای (کوتاه، تمیز و ۲ ستونه)
 */
function getMainKeyboard() {
    return Markup.keyboard([
        ['🛡 خرید ویندسکرایب', '💎 خرید جمنای پرو'],
        ['💰 موجودی و شارژ', '📋 سوابق سفارش‌ها'],
        ['☎️ پشتیبانی و راهنما', '🏠 منوی اصلی']
    ]).resize();
}

/**
 * فرمت‌بندی زیبای شماره کارت بانکی (۴ رقم ۴ رقم)
 */
function formatCardDisplay(num) {
    if (!num) return '';
    const clean = num.replace(/\D/g, '');
    return clean.match(/.{1,4}/g)?.join('  -  ') || num;
}

/**
 * نمایش منوی اصلی و پیام خوش‌آمد
 */
async function sendMainMenu(ctx, isEdit = false) {
    try {
        const user = await getOrCreateTelegramUser(ctx);
        userStates.delete(ctx.from.id);

        const name = ctx.from.first_name || 'کاربر گرامی';
        const welcomeHtml = `✨ <b>به سامانه هوشمند سیم‌جت خوش آمدید</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🚀 <b>ارائه‌دهنده سرویس‌های قانونی و بین‌المللی:</b>\n` +
            `▫️ <b>فیلترشکن ویندسکرایب Pro:</b> اتصال همزمان ۱۰ تا ۱۵ کاربر بدون محدودیت + ترافیک نامحدود\n` +
            `▫️ <b>اکانت جمنای پرو ۱۸ ماهه:</b> مدل‌های 4 Argon و 3.1 Pro + ۲ تا ۵ ترابایت ابری Google Drive\n\n` +
            `╭ 👤 <b>حساب کاربری:</b> ${name}\n` +
            `├ 🆔 <b>شناسه:</b> <code>${ctx.from.id}</code>\n` +
            `╰ 💰 <b>موجودی کیف‌پول:</b> <b>${user.balance.toFixed(2)} دلار</b>\n\n` +
            `👇 <i>جهت خرید سرویس یا افزایش موجودی از منوی زیر انتخاب نمایید:</i>`;

        if (isEdit && ctx.callbackQuery) {
            try {
                await ctx.editMessageText(welcomeHtml, {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [
                            Markup.button.callback('🛡 ویندسکرایب', 'action_buy_menu'),
                            Markup.button.callback('💎 جمنای پرو ۱۸ ماهه', 'action_buy_gemini')
                        ],
                        [Markup.button.callback('💰 افزایش موجودی / شارژ', 'charge_card')]
                    ])
                });
                return;
            } catch (e) {
                // fall through
            }
        }

        await ctx.reply(welcomeHtml, {
            parse_mode: 'HTML',
            ...getMainKeyboard()
        });
    } catch (err) {
        console.error('sendMainMenu error:', err);
        ctx.reply('خطایی رخ داد، لطفاً دوباره تلاش فرمایید.', getMainKeyboard());
    }
}

/**
 * نمایش صفحه خرید ویندسکرایب
 */
async function handleBuyWindscribe(ctx) {
    try {
        const db = getDb();
        const user = await getOrCreateTelegramUser(ctx);

        // دریافت قیمت از دیتابیس
        const priceRow = await db.exec("SELECT value FROM settings WHERE key = 'windscribe_monthly_price'");
        const priceUsd = priceRow.length > 0 && priceRow[0].values.length > 0 ? parseFloat(priceRow[0].values[0][0]) || 4.0 : 4.0;

        // موجودی انبار
        const countRow = await db.exec("SELECT count(*) FROM windscribe_accounts WHERE status = 'AVAILABLE'");
        const availableCount = countRow.length > 0 && countRow[0].values.length > 0 ? parseInt(countRow[0].values[0][0], 10) : 0;

        // نرخ روز تومان
        const rate = await paymentService.getWallexRate();
        const priceToman = Math.round(priceUsd * rate);

        let msg = `🛡 <b>پلن پرمیوم ۱ ماهه ویندسکرایب (ترافیک نامحدود)</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🔥 <b>ویژگی طلایی و اختصاصی:</b>\n` +
            `👥 <b>بدون محدودیت کاربر: امکان استفاده همزمان ۱۰ الی ۱۵ نفر</b>\n` +
            `<i>(ایده‌آل برای استفاده مشترک بین اعضای خانواده، دوستان یا همکاران بدون افت سرعت)</i>\n\n` +
            `💎 <b>مشخصات فنی سرویس:</b>\n` +
            `▫️ قابلیت اتصال همزمان ۱۰ تا ۱۵ کاربر و دستگاه\n` +
            `▫️ ترافیک کاملاً نامحدود و پرسرعت (سرورهای ۱۰ گیگابیتی)\n` +
            `▫️ دسترسی به معتبرترین لوکیشن‌ها و آی‌پی‌های ثابت\n` +
            `▫️ پروتکل‌های قدرتمند WireGuard, Stealth, Wstunnel\n` +
            `▫️ بدون قطعی و سازگار با تمامی اپراتورهای ایران\n\n` +
            `╭ 💵 <b>قیمت پلن:</b> <b>${priceUsd.toFixed(2)} دلار</b>\n` +
            `├ 🇮🇷 <b>معادل تومانی:</b> <b>${priceToman.toLocaleString()} تومان</b>\n` +
            `├ 📦 <b>موجودی انبار:</b> <b>${availableCount} اکانت آماده تحویل</b>\n` +
            `╰ 👛 <b>موجودی کیف‌پول شما:</b> <b>${user.balance.toFixed(2)} دلار</b>\n\n`;

        if (availableCount === 0) {
            msg += `⚠️ <b>در حال حاضر موجودی انبار به اتمام رسیده است.</b>\nبه زودی توسط مدیریت شارژ خواهد شد.`;
            await ctx.reply(msg, {
                parse_mode: 'HTML',
                ...getMainKeyboard(),
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🔙 بازگشت به منوی اصلی', 'back_to_main')]
                ])
            });
            return;
        }

        if (user.balance >= priceUsd) {
            msg += `✅ <i>موجودی شما برای خرید کافی است. برای تحویل آنی روی دکمه زیر بزنید:</i>`;
            await ctx.reply(msg, {
                parse_mode: 'HTML',
                ...getMainKeyboard(),
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('⚡️ تأیید خرید و دریافت آنی اکانت', `buy_ws_${priceUsd}`)],
                    [Markup.button.callback('🔙 بازگشت به منوی اصلی', 'back_to_main')]
                ])
            });
        } else {
            const deficit = (priceUsd - user.balance).toFixed(2);
            msg += `⚠️ <i>موجودی کیف‌پول شما کافی نیست (کسری: ${deficit} دلار).</i>\n` +
                `👇 <i>لطفاً ابتدا از یکی از روش‌های زیر حساب خود را شارژ فرمایید:</i>`;
            await ctx.reply(msg, {
                parse_mode: 'HTML',
                ...getMainKeyboard(),
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('💳 شارژ کارت به کارت (شتاب)', 'charge_card')],
                    [Markup.button.callback('🪙 شارژ با تتر (USDT)', 'charge_crypto')],
                    [Markup.button.callback('🔙 بازگشت به منوی اصلی', 'back_to_main')]
                ])
            });
        }
    } catch (err) {
        console.error('Buy hears error:', err);
        ctx.reply('خطا در دریافت اطلاعات پلن.');
    }
}

/**
 * نمایش صفحه خرید جمنای پرو ۱۸ ماهه
 */
async function handleBuyGemini(ctx) {
    try {
        const db = getDb();
        const user = await getOrCreateTelegramUser(ctx);

        // دریافت قیمت از دیتابیس
        const priceRow = await db.exec("SELECT value FROM settings WHERE key = 'gemini_18m_price'");
        const priceUsd = priceRow.length > 0 && priceRow[0].values.length > 0 ? parseFloat(priceRow[0].values[0][0]) || 12.0 : 12.0;

        // موجودی انبار لینک‌ها
        const countRow = await db.exec("SELECT count(*) FROM gemini_links WHERE status = 'AVAILABLE'");
        const availableCount = countRow.length > 0 && countRow[0].values.length > 0 ? parseInt(countRow[0].values[0][0], 10) : 0;

        // نرخ روز تومان
        const rate = await paymentService.getWallexRate();
        const priceToman = Math.round(priceUsd * rate);

        let msg = `💎 <b>اشتراک ۱۸ ماهه گوگل جمنای پرو (Gemini Advanced)</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🤖 <b>مدل‌های نسل جدید هوش مصنوعی در دسترس:</b>\n` +
            `▫️ <b>4 Argon:</b> حل وظایف بسیار پیچیده و سنگین (Complex tasks)\n` +
            `▫️ <b>3.1 Pro:</b> استدلال عمیق و منطق محاسباتی (Advanced reasoning)\n` +
            `▫️ <b>3.8 Flash:</b> دستیار جامع همه‌فن‌حریف (All-around help)\n` +
            `▫️ <b>3.5 Flash-Lite:</b> سریع‌ترین سرعت پاسخ‌دهی (Fastest answers)\n` +
            `▫️ <b>Thinking Level:</b> قابلیت تنظیم عمق تفکر و استدلال مدل\n\n` +
            `☁️ <b>فضای ابری اختصاصی:</b>\n` +
            `▫️ <b>۲ الی ۵ ترابایت (2TB تا 5TB)</b> فضای Google Drive و Google One\n` +
            `▫️ فعال‌سازی قانونی ۱۸ ماهه روی اکانت شخصی جیمیل شما\n` +
            `▫️ تحویل ۱۰۰٪ خودکار لینک فعال‌سازی\n\n` +
            `╭ 💵 <b>قیمت اشتراک ۱۸ ماهه:</b> <b>${priceUsd.toFixed(2)} دلار</b>\n` +
            `├ 🇮🇷 <b>معادل تومانی:</b> <b>${priceToman.toLocaleString()} تومان</b>\n` +
            `├ 📦 <b>موجودی انبار:</b> <b>${availableCount} لینک آماده تحویل</b>\n` +
            `╰ 👛 <b>موجودی کیف‌پول شما:</b> <b>${user.balance.toFixed(2)} دلار</b>\n\n`;

        if (availableCount === 0) {
            msg += `⚠️ <b>در حال حاضر موجودی انبار لینک‌ها به اتمام رسیده است.</b>\nبه زودی توسط مدیریت شارژ خواهد شد.`;
            await ctx.reply(msg, {
                parse_mode: 'HTML',
                ...getMainKeyboard(),
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🔙 بازگشت به منوی اصلی', 'back_to_main')]
                ])
            });
            return;
        }

        if (user.balance >= priceUsd) {
            msg += `✅ <i>موجودی شما کافی است. جهت صدور آنی لینک، دکمه زیر را لمس نمایید:</i>`;
            await ctx.reply(msg, {
                parse_mode: 'HTML',
                ...getMainKeyboard(),
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('⚡️ تأیید خرید و دریافت آنی لینک', `buy_gemini_${priceUsd}`)],
                    [Markup.button.callback('🔙 بازگشت به منوی اصلی', 'back_to_main')]
                ])
            });
        } else {
            const deficit = (priceUsd - user.balance).toFixed(2);
            msg += `⚠️ <i>موجودی کیف‌پول شما کافی نیست (کسری: ${deficit} دلار).</i>\n` +
                `👇 <i>لطفاً ابتدا از یکی از روش‌های زیر حساب خود را شارژ فرمایید:</i>`;
            await ctx.reply(msg, {
                parse_mode: 'HTML',
                ...getMainKeyboard(),
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('💳 شارژ کارت به کارت (شتاب)', 'charge_card')],
                    [Markup.button.callback('🪙 شارژ با تتر (USDT)', 'charge_crypto')],
                    [Markup.button.callback('🔙 بازگشت به منوی اصلی', 'back_to_main')]
                ])
            });
        }
    } catch (err) {
        console.error('Buy Gemini error:', err);
        ctx.reply('خطا در دریافت اطلاعات پلن جمنای.');
    }
}

/**
 * نمایش صفحه موجودی و کیف‌پول
 */
async function handleWallet(ctx) {
    try {
        const user = await getOrCreateTelegramUser(ctx);
        const rate = await paymentService.getWallexRate();
        const tomanBalance = Math.round(user.balance * rate);

        const msg = `💼 <b>کیف‌پول و حساب مالی شما</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `╭ 💰 <b>موجودی دلاری:</b> <b>${user.balance.toFixed(2)} دلار</b>\n` +
            `├ 🇮🇷 <b>معادل تومانی:</b> <b>${tomanBalance.toLocaleString()} تومان</b>\n` +
            `╰ 📈 <b>نرخ روز هر تتر:</b> <b>${rate.toLocaleString()} تومان</b>\n\n` +
            `👇 <i>جهت افزایش موجودی، یکی از روش‌های زیر را انتخاب کنید:</i>`;

        await ctx.reply(msg, {
            parse_mode: 'HTML',
            ...getMainKeyboard(),
            ...Markup.inlineKeyboard([
                [Markup.button.callback('💳 واریز کارت به کارت (شتاب)', 'charge_card')],
                [Markup.button.callback('🪙 شارژ با تتر (USDT)', 'charge_crypto')],
                [
                    Markup.button.callback('🔄 بروزرسانی', 'refresh_balance'),
                    Markup.button.callback('🔙 بازگشت به منو', 'back_to_main')
                ]
            ])
        });
    } catch (err) {
        console.error('Balance error:', err);
        ctx.reply('خطا در دریافت موجودی.');
    }
}

/**
 * نمایش سوابق سفارشات (ویندسکرایب و جمنای)
 */
async function handleOrders(ctx) {
    try {
        const db = getDb();
        const user = await getOrCreateTelegramUser(ctx);

        const wsOrdersRes = await db.exec(
            'SELECT order_id, username, password, plan_name, price_usd, created_at FROM windscribe_orders WHERE user_id = ? ORDER BY id DESC LIMIT 5',
            [user.id]
        );

        const geminiOrdersRes = await db.exec(
            'SELECT order_id, invite_link, plan_name, price_usd, created_at FROM gemini_orders WHERE user_id = ? ORDER BY id DESC LIMIT 5',
            [user.id]
        );

        const hasWs = wsOrdersRes.length > 0 && wsOrdersRes[0].values.length > 0;
        const hasGemini = geminiOrdersRes.length > 0 && geminiOrdersRes[0].values.length > 0;

        if (!hasWs && !hasGemini) {
            return ctx.reply('شما هنوز هیچ سفارشی در سیستم ثبت نکرده‌اید.', {
                ...getMainKeyboard(),
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback('🛡 ویندسکرایب', 'action_buy_menu'),
                        Markup.button.callback('💎 جمنای پرو', 'action_buy_gemini')
                    ],
                    [Markup.button.callback('🔙 بازگشت به منوی اصلی', 'back_to_main')]
                ])
            });
        }

        let msg = `📋 <b>سوابق سفارش‌های شما</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        if (hasGemini) {
            msg += `💎 <b>اکانت‌های جمنای پرو ۱۸ ماهه:</b>\n`;
            for (const order of geminiOrdersRes[0].values) {
                const [orderId, inviteLink, planName, priceUsd, createdAt] = order;
                const dateStr = new Date(createdAt).toLocaleDateString('fa-IR');
                msg += `🔖 <code>${orderId}</code> (${dateStr})\n` +
                    `🔗 <b>لینک فعال‌سازی:</b>\n<code>${inviteLink}</code>\n` +
                    `💵 <b>مبلغ:</b> <b>${parseFloat(priceUsd).toFixed(2)} دلار</b>\n` +
                    `▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️\n\n`;
            }
        }

        if (hasWs) {
            msg += `🛡 <b>اکانت‌های ویندسکرایب Pro:</b>\n`;
            for (const order of wsOrdersRes[0].values) {
                const [orderId, username, password, planName, priceUsd, createdAt] = order;
                const dateStr = new Date(createdAt).toLocaleDateString('fa-IR');
                msg += `🔖 <code>${orderId}</code> (${dateStr})\n` +
                    `👤 <b>یوزرنیم:</b> <code>${username}</code>\n` +
                    `🔑 <b>رمز:</b> <code>${password}</code>\n` +
                    `💵 <b>مبلغ:</b> <b>${parseFloat(priceUsd).toFixed(2)} دلار</b>\n` +
                    `▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️\n\n`;
            }
        }

        await ctx.reply(msg, {
            parse_mode: 'HTML',
            ...getMainKeyboard(),
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔙 بازگشت به منوی اصلی', 'back_to_main')]
            ])
        });
    } catch (err) {
        console.error('My orders error:', err);
        ctx.reply('خطا در دریافت سوابق سفارشات.');
    }
}

/**
 * نمایش صفحه راهنما و پشتیبانی
 */
async function handleSupport(ctx) {
    const helpMsg = `☎️ <b>مرکز پشتیبانی و ارتباط با سیم‌جت</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `در صورت نیاز به راهنمایی، پیگیری سفارش‌ها یا گزارش هرگونه مشکل:\n\n` +
        `▫️ <b>پشتیبانی در تلگرام:</b> @onstagh_bot\n` +
        `▫️ <b>ساعات پاسخگویی:</b> ۲۴ ساعته در تمامی ایام هفته\n` +
        `▫️ <b>تضمین تحویل:</b> ۱۰۰٪ اکانت‌ها و لینک‌ها تست‌شده و فعال تحویل داده می‌شوند.`;

    await ctx.reply(helpMsg, {
        parse_mode: 'HTML',
        ...getMainKeyboard(),
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🔙 بازگشت به منوی اصلی', 'back_to_main')]
        ])
    });
}

/**
 * راه‌اندازی ربات تلگرام
 */
function initTelegramBot() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const adminId = process.env.TELEGRAM_ADMIN_ID ? parseInt(process.env.TELEGRAM_ADMIN_ID, 10) : 7725037224;

    if (!token) {
        console.log('⚠️ TELEGRAM_BOT_TOKEN not configured. Skipping Telegram bot.');
        return null;
    }

    try {
        bot = new Telegraf(token);

        // تنظیم دستورات رسمی تلگرام (دکمه دائمی Menu کنار کادر پیام)
        bot.telegram.setMyCommands([
            { command: 'start', description: '🏠 شروع مجدد و منوی اصلی' },
            { command: 'gemini', description: '💎 خرید اکانت جمنای پرو ۱۸ ماهه' },
            { command: 'windscribe', description: '🛡 خرید اکانت ویندسکرایب' },
            { command: 'wallet', description: '💰 موجودی و شارژ کیف‌پول' },
            { command: 'orders', description: '📋 سوابق خریدهای من' },
            { command: 'support', description: '☎️ پشتیبانی و راهنما' },
            { command: 'cancel', description: '❌ لغو عملیات و بازگشت' }
        ]).catch((err) => {
            console.warn('Could not set telegram commands:', err.message);
        });

        // ۱. دستورات شروع و منوی اصلی
        bot.start((ctx) => sendMainMenu(ctx));
        bot.command('menu', (ctx) => sendMainMenu(ctx));
        bot.hears(/^(🏠\s*)?(بازگشت به منوی اصلی|منوی اصلی|استارت|شروع)$/i, (ctx) => sendMainMenu(ctx));
        bot.action('back_to_main', async (ctx) => {
            await ctx.answerCbQuery();
            userStates.delete(ctx.from.id);
            return sendMainMenu(ctx);
        });

        // ۲. لغو عملیات (Cancel)
        bot.command('cancel', async (ctx) => {
            userStates.delete(ctx.from.id);
            await ctx.reply('❌ عملیات جاری لغو گردید.', getMainKeyboard());
            return sendMainMenu(ctx);
        });
        bot.action('cancel_invoice', async (ctx) => {
            await ctx.answerCbQuery('فاکتور لغو شد');
            userStates.delete(ctx.from.id);
            await ctx.reply('❌ فاکتور لغو شد و به منوی اصلی بازگشتید.', getMainKeyboard());
            return sendMainMenu(ctx);
        });

        // ۳. خرید ویندسکرایب
        bot.hears(/خرید.*ویندسکرایب/i, handleBuyWindscribe);
        bot.command(['windscribe', 'buy_windscribe'], handleBuyWindscribe);
        bot.action('action_buy_menu', async (ctx) => {
            await ctx.answerCbQuery();
            return handleBuyWindscribe(ctx);
        });

        // ۴. خرید جمنای پرو ۱۸ ماهه
        bot.hears(/(جمنای|gemini)/i, handleBuyGemini);
        bot.command(['gemini', 'buy_gemini'], handleBuyGemini);
        bot.action('action_buy_gemini', async (ctx) => {
            await ctx.answerCbQuery();
            return handleBuyGemini(ctx);
        });

        // ۵. اکشن نهایی تأیید خرید اکانت ویندسکرایب (`buy_ws_...`)
        bot.action(/^buy_ws_([\d.]+)$/, async (ctx) => {
            try {
                await ctx.answerCbQuery('در حال پردازش و تحویل سفارش...');
                const db = getDb();
                const user = await getOrCreateTelegramUser(ctx);

                const priceRow = await db.exec("SELECT value FROM settings WHERE key = 'windscribe_monthly_price'");
                const priceUsd = priceRow.length > 0 && priceRow[0].values.length > 0 ? parseFloat(priceRow[0].values[0][0]) || 4.0 : 4.0;

                if (user.balance < priceUsd) {
                    return ctx.reply('⚠️ موجودی کیف‌پول شما کافی نیست.', {
                        ...getMainKeyboard(),
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback('💳 افزایش موجودی', 'charge_card')],
                            [Markup.button.callback('🔙 بازگشت به منوی اصلی', 'back_to_main')]
                        ])
                    });
                }

                const accRow = await db.exec("SELECT id, username, password FROM windscribe_accounts WHERE status = 'AVAILABLE' ORDER BY id ASC LIMIT 1");
                if (accRow.length === 0 || accRow[0].values.length === 0) {
                    return ctx.reply('⚠️ متاسفانه موجودی انبار به اتمام رسیده است.', {
                        ...getMainKeyboard(),
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback('🔙 بازگشت به منوی اصلی', 'back_to_main')]
                        ])
                    });
                }

                const [accountId, username, password] = accRow[0].values[0];
                const orderId = 'WS_TG_' + Date.now().toString().slice(-8);

                const rate = await paymentService.getWallexRate();
                const priceToman = Math.round(priceUsd * rate);

                await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [priceUsd, user.id]);
                await db.run(
                    "UPDATE windscribe_accounts SET status = 'SOLD', sold_to_user_id = ?, sold_at = CURRENT_TIMESTAMP, order_id = ? WHERE id = ?",
                    [user.id, orderId, accountId]
                );
                await db.run(
                    `INSERT INTO windscribe_orders (user_id, order_id, account_id, username, password, plan_name, price_usd, price_toman)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [user.id, orderId, accountId, username, password, 'پلن ۱ ماهه نامحدود تلگرام', priceUsd, priceToman]
                );
                saveDatabase();

                const newBalance = user.balance - priceUsd;

                const successMsg = `🎉 <b>اکانت ویندسکرایب شما با موفقیت صادر شد!</b>\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `🔖 <b>شماره سفارش:</b> <code>${orderId}</code>\n` +
                    `💵 <b>مبلغ پرداختی:</b> <b>${priceUsd.toFixed(2)} دلار</b> (${priceToman.toLocaleString()} تومان)\n\n` +
                    `👤 <b>نام کاربری (Username):</b>\n` +
                    `<code>${username}</code>\n` +
                    `<i>(جهت کپی نام‌کاربری لمس فرمایید)</i>\n\n` +
                    `🔑 <b>رمز عبور (Password):</b>\n` +
                    `<code>${password}</code>\n` +
                    `<i>(جهت کپی رمز عبور لمس فرمایید)</i>\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `💰 <b>موجودی باقی‌مانده کیف‌پول:</b> <b>${newBalance.toFixed(2)} دلار</b>\n\n` +
                    `💡 <b>راهنمای اتصال:</b> نرم‌افزار رسمی Windscribe را باز کنید، مشخصات فوق را در بخش لاگین وارد کرده و از پروتکل <b>WireGuard</b> یا <b>Stealth</b> استفاده نمایید.`;

                await ctx.reply(successMsg, {
                    parse_mode: 'HTML',
                    ...getMainKeyboard(),
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🏠 بازگشت به منوی اصلی', 'back_to_main')]
                    ])
                });
            } catch (err) {
                console.error('Buy action error:', err);
                ctx.reply('خطا در تکمیل خرید اکانت: ' + err.message);
            }
        });

        // ۶. اکشن نهایی تأیید خرید اکانت جمنای پرو (`buy_gemini_...`)
        bot.action(/^buy_gemini_([\d.]+)$/, async (ctx) => {
            try {
                await ctx.answerCbQuery('در حال پردازش و صدور لینک...');
                const db = getDb();
                const user = await getOrCreateTelegramUser(ctx);

                const priceRow = await db.exec("SELECT value FROM settings WHERE key = 'gemini_18m_price'");
                const priceUsd = priceRow.length > 0 && priceRow[0].values.length > 0 ? parseFloat(priceRow[0].values[0][0]) || 12.0 : 12.0;

                if (user.balance < priceUsd) {
                    return ctx.reply('⚠️ موجودی کیف‌پول شما کافی نیست.', {
                        ...getMainKeyboard(),
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback('💳 افزایش موجودی', 'charge_card')],
                            [Markup.button.callback('🔙 بازگشت به منوی اصلی', 'back_to_main')]
                        ])
                    });
                }

                // گرفتن ۱ لینک موجود از انبار
                const linkRow = await db.exec("SELECT id, invite_link FROM gemini_links WHERE status = 'AVAILABLE' ORDER BY id ASC LIMIT 1");
                if (linkRow.length === 0 || linkRow[0].values.length === 0) {
                    return ctx.reply('⚠️ متاسفانه موجودی لینک‌های جمنای به اتمام رسیده است.', {
                        ...getMainKeyboard(),
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback('🔙 بازگشت به منوی اصلی', 'back_to_main')]
                        ])
                    });
                }

                const [linkId, inviteLink] = linkRow[0].values[0];
                const orderId = 'GEM_TG_' + Date.now().toString().slice(-8);

                const instrRow = await db.exec("SELECT value FROM settings WHERE key = 'gemini_instructions'");
                const instructions = instrRow.length > 0 && instrRow[0].values.length > 0 
                    ? instrRow[0].values[0][0] 
                    : 'روی لینک فعال‌سازی بزنید و با اکانت جیمیل خود وارد شوید تا پلن فعال شود.';

                const rate = await paymentService.getWallexRate();
                const priceToman = Math.round(priceUsd * rate);

                // کسر موجودی و ثبت سفارش
                await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [priceUsd, user.id]);
                await db.run(
                    "UPDATE gemini_links SET status = 'SOLD', sold_to_user_id = ?, sold_at = CURRENT_TIMESTAMP, order_id = ? WHERE id = ?",
                    [user.id, orderId, linkId]
                );
                await db.run(
                    `INSERT INTO gemini_orders (user_id, order_id, link_id, invite_link, plan_name, price_usd, price_toman, instructions)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [user.id, orderId, linkId, inviteLink, 'اکانت جمنای پرو ۱۸ ماهه', priceUsd, priceToman, instructions]
                );
                saveDatabase();

                const newBalance = user.balance - priceUsd;

                const successMsg = `🎉 <b>اشتراک ۱۸ ماهه جمنای پرو با موفقیت صادر شد!</b>\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `🔖 <b>شماره سفارش:</b> <code>${orderId}</code>\n` +
                    `💵 <b>مبلغ پرداختی:</b> <b>${priceUsd.toFixed(2)} دلار</b> (${priceToman.toLocaleString()} تومان)\n\n` +
                    `🔗 <b>لینک اختصاصی فعال‌سازی:</b>\n` +
                    `<code>${inviteLink}</code>\n` +
                    `<i>(جهت کپی لینک روی آن ضربه بزنید یا از دکمه زیر مستقیماً باز فرمایید)</i>\n\n` +
                    `📌 <b>راهنمای فعال‌سازی:</b>\n` +
                    `${instructions}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `💰 <b>موجودی باقی‌مانده کیف‌پول:</b> <b>${newBalance.toFixed(2)} دلار</b>`;

                const buttons = [];
                if (inviteLink.startsWith('http://') || inviteLink.startsWith('https://')) {
                    buttons.push([Markup.button.url('🚀 ورود به لینک فعال‌سازی', inviteLink)]);
                }
                buttons.push([Markup.button.callback('🏠 بازگشت به منوی اصلی', 'back_to_main')]);

                await ctx.reply(successMsg, {
                    parse_mode: 'HTML',
                    ...getMainKeyboard(),
                    ...Markup.inlineKeyboard(buttons)
                });
            } catch (err) {
                console.error('Buy Gemini action error:', err);
                ctx.reply('خطا در تکمیل سفارش جمنای: ' + err.message);
            }
        });

        // ۷. موجودی و شارژ کیف‌پول
        bot.hears(/موجودی/i, handleWallet);
        bot.command('wallet', handleWallet);

        // ۸. اکشن انتخاب شارژ کارت به کارت
        bot.action('charge_card', async (ctx) => {
            try {
                await ctx.answerCbQuery();
                const rate = await paymentService.getWallexRate();

                const msg = `💳 <b>افزایش موجودی با کارت به کارت (شتاب)</b>\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `📊 نرخ روز: هر دلار معادل <b>${rate.toLocaleString()} تومان</b>\n\n` +
                    `👇 <i>مبلغ مورد نظر جهت شارژ را انتخاب فرمایید:</i>`;

                await ctx.reply(msg, {
                    parse_mode: 'HTML',
                    ...getMainKeyboard(),
                    ...Markup.inlineKeyboard([
                        [
                            Markup.button.callback('۴ دلار (ویندسکرایب)', 'init_card_4'),
                            Markup.button.callback('۱۲ دلار (جمنای پرو)', 'init_card_12')
                        ],
                        [
                            Markup.button.callback('۲۰ دلار', 'init_card_20'),
                            Markup.button.callback('۵۰ دلار', 'init_card_50')
                        ],
                        [
                            Markup.button.callback('🔙 بازگشت به منوی اصلی', 'back_to_main')
                        ]
                    ])
                });
            } catch (err) {
                console.error('charge_card error:', err);
            }
        });

        // ۹. تولید فاکتور کارت به کارت برای مبلغ خاص
        bot.action(/^init_card_(\d+)$/, async (ctx) => {
            try {
                await ctx.answerCbQuery();
                const usd = parseInt(ctx.match[1], 10);
                const db = getDb();
                const user = await getOrCreateTelegramUser(ctx);

                // دریافت تنظیمات کارت
                const settingsRes = await db.exec("SELECT key, value FROM settings WHERE key LIKE 'card_%'");
                const settings = {};
                if (settingsRes.length > 0 && settingsRes[0].values) {
                    settingsRes[0].values.forEach(([k, v]) => { settings[k] = v; });
                }

                if (settings.card_enabled === 'false') {
                    return ctx.reply('⚠️ واریز کارت به کارت موقتاً غیرفعال است.', {
                        ...getMainKeyboard(),
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback('🔙 بازگشت به منوی اصلی', 'back_to_main')]
                        ])
                    });
                }

                const rate = await paymentService.getWallexRate();
                const amountToman = Math.round(usd * rate);
                const invoiceId = 'CARD_TG_' + Date.now().toString().slice(-8);

                // ذخیره در جدول تراکنش‌ها
                await db.run(
                    `INSERT INTO transactions (user_id, invoice_id, amount_usd, amount_toman, gateway, status, telegram_chat_id)
                     VALUES (?, ?, ?, ?, 'card', 'PENDING', ?)`,
                    [user.id, invoiceId, usd, amountToman, ctx.chat.id]
                );
                saveDatabase();

                // ذخیره وضعیت کاربر
                userStates.set(ctx.from.id, {
                    action: 'WAITING_CARD_RECEIPT',
                    invoiceId,
                    amountUsd: usd,
                    amountToman
                });

                const rawCardNumber = settings.card_number || '6037-9979-5555-4444';
                const cardHolder = settings.card_holder || 'مدیریت سیم‌جت';
                const bankName = settings.card_bank || 'بانک پاسارگاد';
                const cleanCard = rawCardNumber.replace(/\D/g, '');

                const invoiceHtml = `🧾 <b>فاکتور پرداخت کارت به کارت</b>\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `💎 <b>مبلغ دقیق قابل انتقال:</b>\n` +
                    `👉 <b><code>${amountToman.toLocaleString()} تومان</code></b>\n` +
                    `<i>(معادل ${usd}.00 دلار)</i>\n\n` +
                    `🏦 <b>مشخصات حساب بانکی مقصد:</b>\n` +
                    `▫️ بانک صادرکننده: <b>${bankName}</b>\n` +
                    `▫️ به نام: <b>${cardHolder}</b>\n` +
                    `▫️ شماره کارت (جهت کپی لمس کنید):\n` +
                    `👉 <code>${cleanCard}</code>\n\n` +
                    `🔖 شناسه فاکتور: <code>${invoiceId}</code>\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `📸 <b>مرحله بعد:</b>\n` +
                    `پس از واریز وجه، لطفاً <b>عکس اسکرین‌شات رسید</b> یا <b>کد پیگیری</b> را همینجا ارسال فرمایید.\n\n` +
                    `❌ <i>در صورت تمایل به لغو، روی دکمه زیر بزنید:</i>`;

                await ctx.reply(invoiceHtml, {
                    parse_mode: 'HTML',
                    ...getMainKeyboard(),
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('❌ لغو فاکتور و بازگشت به منو', 'cancel_invoice')]
                    ])
                });
            } catch (err) {
                console.error('init_card error:', err);
                ctx.reply('خطا در صدور فاکتور.');
            }
        });

        // ۱۰. اکشن شارژ کریپتو
        bot.action('charge_crypto', async (ctx) => {
            try {
                await ctx.answerCbQuery();
                const bscAddress = process.env.WALLEX_USDT_BSC_ADDRESS || '0x19b3c81ffe912e995c20cef4db50f289379bd9c7';
                const trc20Address = process.env.WALLEX_USDT_TRC20_ADDRESS || 'TD8ue5Ta8S9Hu1K1MwiVmRmKrcTsweD7xP';
                const rate = await paymentService.getWallexRate();

                const msg = `🪙 <b>شارژ حساب با ارز دیجیتال تتر (USDT)</b>\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `📈 نرخ لحظه‌ای تتر: <b>${rate.toLocaleString()} تومان</b>\n\n` +
                    `⚡️ <b>شبکه BSC (BEP20 - کارمزد فوق‌العاده پایین):</b>\n` +
                    `<code>${bscAddress}</code>\n` +
                    `<i>(جهت کپی آدرس لمس کنید)</i>\n\n` +
                    `🌐 <b>شبکه ترون (TRC20):</b>\n` +
                    `<code>${trc20Address}</code>\n` +
                    `<i>(جهت کپی آدرس لمس کنید)</i>\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `پس از انتقال تتر، کد رهگیری هش (TXID) را ارسال نمایید.`;

                await ctx.reply(msg, {
                    parse_mode: 'HTML',
                    ...getMainKeyboard(),
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🔙 بازگشت به منوی اصلی', 'back_to_main')]
                    ])
                });
            } catch (err) {
                console.error('charge_crypto error:', err);
            }
        });

        // ۱۱. دریافت فیش از کاربر با خروج ایمن
        bot.on(['photo', 'text'], async (ctx, next) => {
            const state = userStates.get(ctx.from.id);
            if (!state || state.action !== 'WAITING_CARD_RECEIPT') {
                return next();
            }

            if (ctx.message.text) {
                const text = ctx.message.text.trim();
                if (text.startsWith('/') || /^(🏠|انصراف|لغو|بازگشت|منوی اصلی|شروع|خرید|موجودی|سوابق|پشتیبانی|جمنای)/i.test(text)) {
                    userStates.delete(ctx.from.id);
                    if (/^(انصراف|لغو|بازگشت)/i.test(text) || text === '/cancel') {
                        await ctx.reply('❌ عملیات ارسال رسید لغو شد.', getMainKeyboard());
                        return sendMainMenu(ctx);
                    }
                    return next();
                }
            }

            try {
                const db = getDb();
                const { invoiceId, amountUsd, amountToman } = state;

                let trackingCode = '';
                let photoFileId = null;

                if (ctx.message.photo && ctx.message.photo.length > 0) {
                    photoFileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
                    trackingCode = ctx.message.caption || 'دارای تصویر فیش';
                } else if (ctx.message.text) {
                    trackingCode = ctx.message.text.trim();
                }

                await db.run(
                    `UPDATE transactions 
                     SET tracking_code = ?, status = 'PENDING_APPROVAL', txid = ?
                     WHERE invoice_id = ?`,
                    [trackingCode, trackingCode, invoiceId]
                );
                saveDatabase();

                userStates.delete(ctx.from.id);

                const userConfirmHtml = `✅ <b>رسید پرداخت شما با موفقیت دریافت شد!</b>\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `🔖 شناسه فاکتور: <code>${invoiceId}</code>\n` +
                    `💵 مبلغ: <b>${amountUsd}.00 دلار</b> (${amountToman.toLocaleString()} تومان)\n\n` +
                    `⏳ فیش واریزی در صف بررسی بخش مدیریت قرار گرفت. پس از استعلام بانکی، حساب شما به‌صورت خودکار شارژ خواهد شد.`;

                await ctx.reply(userConfirmHtml, {
                    parse_mode: 'HTML',
                    ...getMainKeyboard(),
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🏠 بازگشت به منوی اصلی', 'back_to_main')]
                    ])
                });

                if (adminId) {
                    const userName = ctx.from.first_name || 'کاربر';
                    const userHandle = ctx.from.username ? `@${ctx.from.username}` : 'ندارد';

                    const adminMsg = `🔔 <b>فیش واریز جدید کارت به کارت (نیازمند تایید)</b>\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `👤 <b>کاربر:</b> ${userName} (${userHandle})\n` +
                        `🆔 <b>شناسه تلگرام:</b> <code>${ctx.from.id}</code>\n` +
                        `💵 <b>مبلغ فاکتور:</b> <b>${amountToman.toLocaleString()} تومان</b> (${amountUsd}.00 دلار)\n` +
                        `🔢 <b>کد پیگیری / توضیحات:</b>\n<code>${trackingCode}</code>\n\n` +
                        `🔖 <b>شناسه فاکتور:</b> <code>${invoiceId}</code>\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `👇 <i>جهت تعیین وضعیت، روی یکی از دکمه‌های زیر بزنید:</i>`;

                    const adminKeyboard = Markup.inlineKeyboard([
                        [
                            Markup.button.callback(`✅ تأیید و شارژ (${amountUsd} دلار)`, `admin_approve_${invoiceId}`),
                            Markup.button.callback('❌ رد درخواست', `admin_reject_${invoiceId}`)
                        ]
                    ]);

                    if (photoFileId) {
                        await ctx.telegram.sendPhoto(adminId, photoFileId, {
                            caption: adminMsg,
                            parse_mode: 'HTML',
                            ...adminKeyboard
                        });
                    } else {
                        await ctx.telegram.sendMessage(adminId, adminMsg, {
                            parse_mode: 'HTML',
                            ...adminKeyboard
                        });
                    }
                }
            } catch (err) {
                console.error('Handle receipt error:', err);
                ctx.reply('خطا در ثبت رسید.');
            }
        });

        // ۱۲. تأیید فیش توسط ادمین در تلگرام (`admin_approve_...`)
        bot.action(/^admin_approve_(.+)$/, async (ctx) => {
            try {
                if (ctx.from.id !== adminId) {
                    return ctx.answerCbQuery('⛔️ شما دسترسی مدیریت ندارید.', { show_alert: true });
                }

                const invoiceId = ctx.match[1];
                const db = getDb();

                const txRes = await db.exec(
                    'SELECT user_id, amount_usd, status, telegram_chat_id FROM transactions WHERE invoice_id = ?',
                    [invoiceId]
                );

                if (txRes.length === 0 || txRes[0].values.length === 0) {
                    return ctx.answerCbQuery('فاکتور یافت نشد.', { show_alert: true });
                }

                const [userId, amountUsd, status, tgChatId] = txRes[0].values[0];

                if (status === 'SUCCESS') {
                    return ctx.answerCbQuery('این فاکتور قبلاً تایید و شارژ شده است.', { show_alert: true });
                }

                const usd = parseFloat(amountUsd || 0);

                await db.run("UPDATE transactions SET status = 'SUCCESS' WHERE invoice_id = ?", [invoiceId]);
                await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [usd, userId]);
                saveDatabase();

                await ctx.answerCbQuery('✅ حساب کاربر با موفقیت شارژ شد.');

                const adminApprovedNote = `\n\n✅ <b>این فاکتور توسط شما تأیید شد و مبلغ ${usd.toFixed(2)} دلار به حساب کاربر افزوده گردید.</b>`;
                try {
                    await ctx.editMessageCaption(
                        `${ctx.callbackQuery.message.caption || ''}${adminApprovedNote}`,
                        { parse_mode: 'HTML' }
                    );
                } catch (e) {
                    try {
                        await ctx.editMessageText(
                            `${ctx.callbackQuery.message.text || ''}${adminApprovedNote}`,
                            { parse_mode: 'HTML' }
                        );
                    } catch (e2) {}
                }

                if (tgChatId) {
                    const userBalanceRes = await db.exec('SELECT balance FROM users WHERE id = ?', [userId]);
                    const newBal = parseFloat(userBalanceRes[0].values[0][0]);

                    const userNotice = `🎉 <b>واریز شما با موفقیت تأیید شد!</b>\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `✅ مبلغ <b>${usd.toFixed(2)} دلار</b> به کیف‌پول شما اضافه شد.\n` +
                        `💰 <b>موجودی جدید شما:</b> <b>${newBal.toFixed(2)} دلار</b>\n\n` +
                        `👇 <i>اکنون می‌توانید سرویس مورد نظرتان (ویندسکرایب یا جمنای پرو) را آنی خریداری فرمایید:</i>`;

                    await bot.telegram.sendMessage(tgChatId, userNotice, {
                        parse_mode: 'HTML',
                        ...getMainKeyboard(),
                        ...Markup.inlineKeyboard([
                            [
                                Markup.button.callback('🛡 ویندسکرایب', 'action_buy_menu'),
                                Markup.button.callback('💎 جمنای پرو ۱۸ ماهه', 'action_buy_gemini')
                            ],
                            [Markup.button.callback('🏠 بازگشت به منوی اصلی', 'back_to_main')]
                        ])
                    });
                }
            } catch (err) {
                console.error('admin_approve error:', err);
                ctx.answerCbQuery('خطا در تایید: ' + err.message);
            }
        });

        // ۱۳. رد فیش توسط ادمین در تلگرام (`admin_reject_...`)
        bot.action(/^admin_reject_(.+)$/, async (ctx) => {
            try {
                if (ctx.from.id !== adminId) {
                    return ctx.answerCbQuery('⛔️ شما دسترسی مدیریت ندارید.', { show_alert: true });
                }

                const invoiceId = ctx.match[1];
                const db = getDb();

                const txRes = await db.exec(
                    'SELECT user_id, status, telegram_chat_id FROM transactions WHERE invoice_id = ?',
                    [invoiceId]
                );

                if (txRes.length === 0 || txRes[0].values.length === 0) {
                    return ctx.answerCbQuery('فاکتور یافت نشد.', { show_alert: true });
                }

                const [userId, status, tgChatId] = txRes[0].values[0];

                if (status === 'SUCCESS') {
                    return ctx.answerCbQuery('فاکتور قبلاً تایید شده است.', { show_alert: true });
                }

                await db.run("UPDATE transactions SET status = 'REJECTED' WHERE invoice_id = ?", [invoiceId]);
                saveDatabase();

                await ctx.answerCbQuery('❌ فیش رد شد.');

                const adminRejectNote = `\n\n❌ <b>این فیش توسط شما رد شد.</b>`;
                try {
                    await ctx.editMessageCaption(
                        `${ctx.callbackQuery.message.caption || ''}${adminRejectNote}`,
                        { parse_mode: 'HTML' }
                    );
                } catch (e) {
                    try {
                        await ctx.editMessageText(
                            `${ctx.callbackQuery.message.text || ''}${adminRejectNote}`,
                            { parse_mode: 'HTML' }
                        );
                    } catch (e2) {}
                }

                if (tgChatId) {
                    const rejectNotice = `⚠️ <b>عدم تایید واریز</b>\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `متاسفانه فیش ارسالی شما برای فاکتور <code>${invoiceId}</code> از سوی بخش مالی تأیید نشد.\n\n` +
                        `▫️ در صورت کسر وجه از حساب، با پشتیبانی در ارتباط باشید.`;

                    await bot.telegram.sendMessage(tgChatId, rejectNotice, {
                        parse_mode: 'HTML',
                        ...getMainKeyboard(),
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback('🏠 بازگشت به منوی اصلی', 'back_to_main')]
                        ])
                    });
                }
            } catch (err) {
                console.error('admin_reject error:', err);
            }
        });

        // ۱۴. سوابق خریدها
        bot.hears(/(سوابق|سفارش)/i, handleOrders);
        bot.command('orders', handleOrders);

        // ۱۵. پشتیبانی
        bot.hears(/پشتیبانی/i, handleSupport);
        bot.command('support', handleSupport);

        // ۱۶. به‌روزرسانی موجودی
        bot.action('refresh_balance', async (ctx) => {
            try {
                await ctx.answerCbQuery('موجودی به‌روز شد');
                const user = await getOrCreateTelegramUser(ctx);
                await ctx.reply(`💰 <b>موجودی به‌روزرسانی‌شده شما:</b> <b>${user.balance.toFixed(2)} دلار</b>`, {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🔙 بازگشت به منوی اصلی', 'back_to_main')]
                    ])
                });
            } catch (e) {}
        });

        // لانچ ربات
        bot.telegram.getMe().then((me) => {
            console.log(`🤖 Telegram Bot (@${me.username}) connected and online!`);
        }).catch((err) => {
            console.error('❌ Telegram Bot getMe error:', err.message);
        });

        bot.launch({
            dropPendingUpdates: true
        }).catch((e) => {
            console.error('❌ Telegram Bot polling error:', e.message);
        });

        process.once('SIGINT', () => bot && bot.stop('SIGINT'));
        process.once('SIGTERM', () => bot && bot.stop('SIGTERM'));

        return bot;
    } catch (err) {
        console.error('Telegram bot init error:', err.message);
        return null;
    }
}

module.exports = { initTelegramBot, getBot: () => bot };
