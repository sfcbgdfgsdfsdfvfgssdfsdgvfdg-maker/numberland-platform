# راهنمای جامع مکانیزم پوش و دیپلوی (Push & Deployment Guide)
پروژه: **SimJet & Numberland Platform**  
مخزن گیت‌هاب: [https://github.com/sfcbgdfgsdfsdfvfgssdfsdgvfdg-maker/numberland-platform](https://github.com/sfcbgdfgsdfsdfvfgssdfsdgvfdg-maker/numberland-platform)  
دامنه پروداکشن: [https://simjet.onrender.com](https://simjet.onrender.com)  
ربات تلگرام: [@onstagh_bot](https://t.me/onstagh_bot)

---

## ۱. معماری کلی چرخه استقرار (CI/CD Workflow)

جریان انتشار برنامه به صورت **Git-Driven Continuous Deployment** پیاده‌سازی شده است:

```
[ کدنویسی و تست محلی ]
        │
        ▼
[ بررسی سلامت بیلد (npm run build) ]
        │
        ▼
[ کامیت و پوش به گیت‌هاب (git push origin main) ]
        │
        ▼
[ تریگر خودکار وب‌هوک Render ]
        │
   ┌────┴──────────────────────────────┐
   │ فرایند بیلد (Build Command)       │
   │ 1. npm --prefix server install    │
   │ 2. npm --prefix client install    │
   │ 3. vite build -> client/dist      │
   └────┬──────────────────────────────┘
        │
        ▼
[ اجرای سرویس پروداکشن (npm start -> node server/src/server.js) ]
        │
   ┌────┴──────────────────────────────┐
   │ سرو فرانت‌اند React از client/dist │
   │ APIهای اکسپرس و شماره مجازی       │
   │ اتصال پایدار به Neon PostgreSQL   │
   │ اجرای ۲۴ ساعته ربات تلگرام        │
   └───────────────────────────────────┘
```

---

## ۲. دستورات استاندارد پوش به گیت‌هاب (Push Steps)

پیش از ارسال تغییرات به گیت‌هاب:

### گام ۱: تست بیلد فرانت‌اند و بک‌اند
```bash
npm run build
```

### گام ۲: بررسی وضعیت فایل‌ها
```bash
git status
```
*مطمئن شوید فایل‌های موقت، کلیدهای محرمانه و متغیرهای `.env` وارد لیست کامیت نشوند.*

### گام ۳: استیج و ثبت کامیت با پیام معنادار
```bash
git add .
git commit -m "feat/fix: توضیح تغییرات"
```

### گام ۴: ارسال به برنچ اصلی
```bash
git push origin main
```
به محض رسیدن کامیت به شاخه `main`، سرور Render رویداد Push را دریافت کرده و دیپلوی خودکار آغاز می‌شود.

---

## ۳. نحوه عملکرد بیلد و اجرا در سرور Render

تنظیمات اصلی هاست داخل فایل [render.yaml](render.yaml) تعریف شده است:

### دستور بیلد (`buildCommand`):
```bash
npm run build
```
این دستور:
1. پکیج‌های سرور را نصب می‌کند (`npm --prefix server install`).
2. پکیج‌های کلاینت را نصب می‌کند (`npm --prefix client install`).
3. باندل بهینه React را در پوشه `client/dist/` تولید می‌کند (`vite build`).

### دستور اجرا (`startCommand`):
```bash
npm start
```
سرور Express روی آدرس `0.0.0.0` و پورت تعیین‌شده توسط رندر (یا پورت 5000) بالا می‌آید.

---

## ۴. مکانیزم بیدار نگه‌داشتن ۲۴ ساعته سرور با UptimeRobot (Keep-Alive)

### ۱. چرایی و مسئله فنی پلن رایگان Render (Spin Down)
در پلن رایگان (Free Tier) هاست Render:
- سرور در صورتی که به مدت **۱۵ دقیقه** هیچ ترافیک ورودی HTTP دریافت نکند، به خواب موقت (**Spin Down**) می‌رود.
- هنگام خواب رفتن سرور:
  - اولین بازدیدی که بعد از خواب به سایت برسد، بین **۳۰ تا ۵۰ ثانیه** معطل بالا آمدن کانتینر (Cold Start) خواهد شد.
  - پروسه‌های پس‌زمینه (نظیر **بات‌های تلگرام Telegraf**، کارهای زمان‌بندی‌شده، و وب‌سوکت‌ها) تا زمان رسیدن درخواست جدید متوقف می‌مانند.

### ۲. راه‌حل طلایی: مانیتورینگ خودکار UptimeRobot
با ثبت سرویس در سامانه رایگان [UptimeRobot](https://uptimerobot.com) و ارسال پینگ دوره‌ای (هر ۵ دقیقه)، رندر هرگز به آستانه ۱۵ دقیقه بی‌کاری نمی‌رسد؛ در نتیجه:
- ✅ **سرور ۲۴ ساعته و ۷ روز هفته کاملاً بیدار و آنلاین می‌ماند.**
- ✅ بات تلگرام هرگز متوقف نمی‌شود و پیام‌ها بلافاصله پردازش می‌شوند.
- ✅ هیچ کاربری با لودینگ طولانی Cold Start مواجه نمی‌گردد.
- ✅ در صورت هرگونه خطای سرور، ایمیل هشدار آنی برای شما ارسال می‌شود.

### ۳. ساخت روت بهینه و سبک `/health` در سرور
برای جلوگیری از فشار الکی به دیتابیس (مثل Neon PostgreSQL) در هر پینگ ۵ دقیقه‌ای، یک روت اختصاصی و فوق‌سریع در کدهای سرور تعریف شده است:

```javascript
// روت پایش سلامت بدون کوئری دیتابیس (پاسخ در کمتر از ۵ میلی‌ثانیه)
app.get(['/health', '/ping', '/api/health'], (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
    });
});
```

### ۴. گام‌های پیکربندی در UptimeRobot (ظرف ۳۰ ثانیه):
1. در [uptimerobot.com](https://uptimerobot.com) وارد شوید.
2. روی دکمه **`+ Add New Monitor`** کلیک کنید.
3. مقادیر را به ترتیب زیر وارد نمایید:
   - **Monitor Type:** گزینه `HTTP(s)`
   - **Friendly Name:** نام دلخواه (مثال: `SimJet Production`)
   - **URL (or IP):** `https://simjet.onrender.com/health`
   - **Monitoring Interval:** روی `Every 5 minutes` (پیش‌فرض رایگان)
4. در بخش **Alert Contacts To Notify** تیک ایمیل خود را بزنید.
5. دکمه **Create Monitor** را بزنید.

---

## ۵. نکته مهم در سازگاری Express 5 و مسیرهای SPA Fallback

در نسخه‌های Express 5 به دلیل ارتقای کتابخانه `path-to-regexp`، استفاده مستقیم از کاراکتر ستاره بدون نام در روت‌ها مانند `app.get('*')` باعث پرتاب خطای زیر در محیط پروداکشن می‌شود:
```text
PathError: Missing parameter name at index 1: *
```

### راه‌حل استاندارد:
استفاده از میدل‌ویر شرطی که هم در Express 4 و هم در Express 5 بدون باگ اجرا می‌شود:

```javascript
if (fs.existsSync(clientDist)) {
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api')) {
            return res.sendFile(path.join(clientDist, 'index.html'));
        }
        next();
    });
}
```
