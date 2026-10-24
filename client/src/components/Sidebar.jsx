import React from 'react';

export default function Sidebar({ activeTab, onSwitchTab, activeNumbersCount = 0, user = null }) {
  return (
    <aside className="lg:col-span-3 space-y-4">
      {/* Navigation Card */}
      <nav className="glass-panel rounded-2xl p-2.5 border border-white/10 shadow-xl space-y-1">
        {/* Virtual Numbers */}
        <button
          onClick={() => onSwitchTab('buy')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
            activeTab === 'buy'
              ? 'bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-transparent text-cyan-300 font-bold border-r-3 border-cyan-400 shadow-md shadow-cyan-950/30'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-3">
            <i className={`fa-solid fa-cart-plus text-base ${activeTab === 'buy' ? 'text-cyan-400' : 'text-slate-400'}`}></i>
            <span>خرید شماره مجازی</span>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
            SMS
          </span>
        </button>

        {/* Windscribe VPN (10-15 Users Unlimited) */}
        <button
          onClick={() => onSwitchTab('windscribe')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
            activeTab === 'windscribe'
              ? 'bg-gradient-to-r from-indigo-500/20 via-purple-500/15 to-transparent text-indigo-300 font-bold border-r-3 border-indigo-400 shadow-md shadow-indigo-950/30'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-3">
            <i className={`fa-solid fa-shield-halved text-base ${activeTab === 'windscribe' ? 'text-indigo-400' : 'text-slate-400'}`}></i>
            <span>ویندسکرایب Pro</span>
          </div>
          <span className="text-[10px] bg-gradient-to-r from-amber-500/25 to-orange-500/25 border border-amber-400/40 text-amber-300 font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
            ۱۰-۱۵ کاربر
          </span>
        </button>

        {/* Gemini Pro 18 Months */}
        <button
          onClick={() => onSwitchTab('gemini')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
            activeTab === 'gemini'
              ? 'bg-gradient-to-r from-violet-500/20 via-fuchsia-500/15 to-transparent text-violet-300 font-bold border-r-3 border-violet-400 shadow-md shadow-violet-950/30'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-3">
            <i className={`fa-solid fa-wand-magic-sparkles text-base ${activeTab === 'gemini' ? 'text-violet-400' : 'text-slate-400'}`}></i>
            <span>جمنای پرو ۱۸ ماهه</span>
          </div>
          <span className="text-[10px] bg-violet-500/20 border border-violet-400/30 text-violet-300 font-black px-2 py-0.5 rounded-full">
            AI + ۲-۵TB
          </span>
        </button>

        {/* Active Numbers */}
        <button
          onClick={() => onSwitchTab('active')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
            activeTab === 'active'
              ? 'bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-transparent text-cyan-300 font-bold border-r-3 border-cyan-400 shadow-md shadow-cyan-950/30'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-3">
            <i className={`fa-solid fa-clock-rotate-left text-base ${activeTab === 'active' ? 'text-cyan-400' : 'text-slate-400'}`}></i>
            <span>شماره‌های فعال</span>
          </div>
          {activeNumbersCount > 0 ? (
            <span className="bg-cyan-500 text-slate-950 text-xs px-2 py-0.5 rounded-full font-black">
              {activeNumbersCount}
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-mono">۰</span>
          )}
        </button>

        {/* Transactions History */}
        <button
          onClick={() => onSwitchTab('history')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-transparent text-cyan-300 font-bold border-r-3 border-cyan-400 shadow-md shadow-cyan-950/30'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-3">
            <i className={`fa-solid fa-receipt text-base ${activeTab === 'history' ? 'text-cyan-400' : 'text-slate-400'}`}></i>
            <span>تاریخچه تراکنش‌ها</span>
          </div>
          <i className="fa-solid fa-chevron-left text-[10px] text-slate-500"></i>
        </button>

        {/* Admin Inventory & Controls */}
        {user?.isAdmin && (
          <div className="pt-3 mt-2 border-t border-white/10 space-y-1">
            <div className="text-[10px] font-bold text-amber-400/80 px-3 py-1 uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-crown text-[10px] text-amber-400"></i>
              <span>پنل مدیریت ارشد</span>
            </div>
            <button
              onClick={() => onSwitchTab('windscribe_admin')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium text-xs transition cursor-pointer ${
                activeTab === 'windscribe_admin'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border-r-2 border-amber-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-boxes-stacked text-amber-400 text-xs"></i>
                <span>انبار ویندسکرایب</span>
              </div>
              <span className="bg-amber-400/20 text-amber-300 text-[9px] px-1.5 py-0.5 rounded font-bold">
                ادمین
              </span>
            </button>

            <button
              onClick={() => onSwitchTab('gemini_admin')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium text-xs transition cursor-pointer ${
                activeTab === 'gemini_admin'
                  ? 'bg-violet-500/20 text-violet-300 font-bold border-r-2 border-violet-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-wand-magic-sparkles text-violet-400 text-xs"></i>
                <span>انبار جمنای پرو</span>
              </div>
              <span className="bg-violet-400/20 text-violet-300 text-[9px] px-1.5 py-0.5 rounded font-bold">
                ادمین
              </span>
            </button>

            <button
              onClick={() => onSwitchTab('card_admin')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium text-xs transition cursor-pointer ${
                activeTab === 'card_admin'
                  ? 'bg-indigo-500/20 text-indigo-300 font-bold border-r-2 border-indigo-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-credit-card text-indigo-400 text-xs"></i>
                <span>واریزهای شتاب</span>
              </div>
              <span className="bg-indigo-400/20 text-indigo-300 text-[9px] px-1.5 py-0.5 rounded font-bold">
                ادمین
              </span>
            </button>
          </div>
        )}
      </nav>

      {/* Telegram Bot Card */}
      <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-[#0c2340] via-[#0e325a] to-[#07182c] border border-sky-400/30 shadow-xl space-y-3 group">
        <div className="absolute -top-12 -left-12 w-28 h-28 bg-sky-500/20 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center text-white text-xl shadow-lg shadow-sky-500/30 group-hover:scale-105 transition-transform">
            <i className="fa-brands fa-telegram"></i>
          </div>
          <div>
            <div className="font-black text-sm text-white">ربات تلگرام سیم‌جت</div>
            <div className="text-[10px] text-sky-300 font-mono">@onstagh_bot</div>
          </div>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          خرید مستقیم و آنی اکانت‌های ویندسکرایب Pro، جمنای ۱۸ ماهه، شماره مجازی و شارژ کیف‌پول بدون فیلتر در تلگرام.
        </p>
        <a
          href="https://t.me/onstagh_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black text-xs py-2.5 px-3 rounded-xl transition shadow-lg shadow-sky-500/20"
        >
          <i className="fa-brands fa-telegram text-base"></i>
          <span>ورود به ربات تلگرام</span>
          <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
        </a>
      </div>

      {/* System Assurance / Security Badge */}
      <div className="glass-card rounded-2xl p-3.5 border border-white/5 text-slate-400 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
            <i className="fa-solid fa-circle-check text-[10px]"></i>
            <span>تحویل ۱۰۰٪ خودکار و قانونی</span>
          </div>
          <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">24/7 Live</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          ویندسکرایب با اتصال ۱۰-۱۵ کاربر همزمان و جمنای پرو ۱۸ ماهه با ۲ الی ۵ ترابایت ابری به صورت آنی پس از پرداخت صادر می‌شوند.
        </p>
      </div>
    </aside>
  );
}
