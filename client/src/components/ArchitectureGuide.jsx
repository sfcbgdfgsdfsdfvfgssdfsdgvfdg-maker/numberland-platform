import React from 'react';

export default function ArchitectureGuide() {
  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl space-y-6 backdrop-blur-xl">
      <div>
        <h2 className="text-xl font-black text-white">معماری و مستندات فنی پلتفرم سیم‌جت PRO</h2>
        <p className="text-xs text-slate-400 mt-1">معماری کامل ساخت سیستم شماره مجازی به همراه Delivery Rate، ویندسکرایب اختصاصی، جمنای پرو و درگاه پرداخت والکس و شتاب</p>
      </div>

      {/* Flow Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/10 shadow-sm backdrop-blur-md">
          <div className="w-10 h-10 bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 rounded-xl flex items-center justify-center mx-auto mb-2 font-mono font-black text-sm">۱</div>
          <h3 className="font-bold text-white text-sm">فرانت‌اند (React 19 / Vite / Tailwind)</h3>
          <p className="text-xs text-slate-400 mt-1">طراحی رابط کاربری فوق پیشرفته Luxury Dark World بر مبنای استانداردهای ارشد مهندسی با شبیه‌ساز کارت شتاب و نرخ والکس.</p>
        </div>
        <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/10 shadow-sm backdrop-blur-md">
          <div className="w-10 h-10 bg-violet-500/20 text-violet-400 border border-violet-400/30 rounded-xl flex items-center justify-center mx-auto mb-2 font-mono font-black text-sm">۲</div>
          <h3 className="font-bold text-white text-sm">سرور بک‌اند (Node.js/PostgreSQL/Telegram)</h3>
          <p className="text-xs text-slate-400 mt-1">مدیریت کاربران، سیستم انبار خودکار ویندسکرایب و جمنای، وب‌هوک ربات تلگرام (@onstagh_bot) و تایید واریزی‌ها.</p>
        </div>
        <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/10 shadow-sm backdrop-blur-md">
          <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 rounded-xl flex items-center justify-center mx-auto mb-2 font-mono font-black text-sm">۳</div>
          <h3 className="font-bold text-white text-sm">تامین‌کنندگان امنیتی و کریپتو</h3>
          <p className="text-xs text-slate-400 mt-1">ارتباط بلادرنگ با ۵SIM، صرافی والکس برای استعلام لحظه‌ای تتر، شبکه‌های ترون/BSC و شبکه شتاب بانکی.</p>
        </div>
      </div>

      {/* Code Example Snippet */}
      <div className="space-y-3">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <i className="fa-solid fa-code text-cyan-400"></i>
          <span>نمونه کد اتصال بک‌اند به API اصلی شماره مجازی (Node.js):</span>
        </h3>
        <div className="bg-slate-950/90 border border-white/10 text-cyan-300 rounded-2xl p-4 font-mono text-xs dir-ltr overflow-x-auto shadow-inner">
<pre><code>{`// 1. استعلام لیست قیمت‌ها و نرخ موفقیت SMS (Delivery Rate)
const axios = require('axios');

async function get5SimPrices() {
  const res = await axios.get('https://5sim.net/v1/guest/prices?country=usa&product=telegram');
  return res.data;
}

// 2. خرید شماره مجازی و تخصیص به سفارش کاربر
async function buyNumber(country, operator, service) {
  const response = await axios.get(\`https://5sim.net/v1/user/buy/activation/\${country}/\${operator}/\${service}\`, {
    headers: { 'Authorization': \`Bearer \${API_KEY}\` }
  });
  return response.data;
}`}</code></pre>
        </div>
      </div>
    </div>
  );
}
