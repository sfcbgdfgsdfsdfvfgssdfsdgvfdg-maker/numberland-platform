import React from 'react';

export default function ArchitectureGuide() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">چگونه اپلیکیشن شماره مجازی بسازیم؟ (راهنمای فنی)</h2>
        <p className="text-sm text-slate-500 mt-1">معماری کامل ساخت سیستم شماره مجازی به همراه Delivery Rate و اتصال به Wallex Pay</p>
      </div>

      {/* Flow Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-2 font-bold">۱</div>
          <h3 className="font-bold text-slate-800 text-sm">فرانت‌اند (React / Vite)</h3>
          <p className="text-xs text-slate-500 mt-1">طراحی وب اپلیکیشن پیشرفته با کامپوننت‌های ماژولار و نمایش آنی Delivery Rate.</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2 font-bold">۲</div>
          <h3 className="font-bold text-slate-800 text-sm">سرور بک‌اند (Node.js/Express)</h3>
          <p className="text-xs text-slate-500 mt-1">مدیریت کاربران، کیف پول، اعتبارسنجی اتوماتیک واریزی‌های TRC20 و ارتباط امن با API.</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 font-bold">۳</div>
          <h3 className="font-bold text-slate-800 text-sm">تامین‌کننده 5SIM & Wallex</h3>
          <p className="text-xs text-slate-500 mt-1">دریافت آنی قیمت، نرخ تحویل SMS (Delivery Rate) و نرخ تومان زنده صرافی.</p>
        </div>
      </div>

      {/* Code Example Snippet */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-800 text-sm">نمونه کد اتصال بک‌اند به API اصلی (Node.js/Axios):</h3>
        <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs dir-ltr overflow-x-auto">
<pre><code>{`// 1. دریافت لیست قیمت‌ها و نرخ دلیوری (Delivery Rate)
const axios = require('axios');

async function get5SimPrices() {
  const res = await axios.get('https://5sim.net/v1/guest/prices?country=usa&product=telegram');
  // پاسخ شامل cost, count و rate (دلیوری ریت) برای هر اپراتور است
  return res.data;
}

// 2. خرید شماره مجازی جدید
async function buyNumber(country, operator, service) {
  const response = await axios.get(\`https://5sim.net/v1/user/buy/activation/\${country}/\${operator}/\${service}\`, {
    headers: { 'Authorization': \`Bearer \${API_KEY}\` }
  });
  return response.data; // { id, phone, service, ... }
}`}</code></pre>
        </div>
      </div>
    </div>
  );
}
