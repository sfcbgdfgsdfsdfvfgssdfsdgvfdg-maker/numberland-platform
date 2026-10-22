import React from 'react';

export default function Sidebar({ activeTab, onSwitchTab, activeNumbersCount = 0, user = null }) {
  return (
    <aside className="lg:col-span-3 space-y-4">
      <nav className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm space-y-1">
        {/* Virtual Numbers */}
        <button
          onClick={() => onSwitchTab('buy')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition cursor-pointer ${
            activeTab === 'buy'
              ? 'bg-sky-50 text-sky-700 font-semibold'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <i className="fa-solid fa-cart-plus text-lg"></i>
          <span>خرید شماره مجازی</span>
        </button>

        {/* Windscribe VPN (NEW!) */}
        <button
          onClick={() => onSwitchTab('windscribe')}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition cursor-pointer ${
            activeTab === 'windscribe'
              ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 font-semibold border-r-4 border-indigo-600'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-shield-halved text-lg text-indigo-600"></i>
            <span>اکانت ویندسکرایب (VPN)</span>
          </div>
          <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded-full">
            ۱۰-۱۵ کاربر
          </span>
        </button>

        {/* Gemini Pro 18 Months (NEW!) */}
        <button
          onClick={() => onSwitchTab('gemini')}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition cursor-pointer ${
            activeTab === 'gemini'
              ? 'bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 font-semibold border-r-4 border-violet-600'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-wand-magic-sparkles text-lg text-violet-600"></i>
            <span>اکانت جمنای پرو (۱۸ ماهه)</span>
          </div>
          <span className="text-[10px] bg-violet-100 text-violet-700 font-black px-2 py-0.5 rounded-full">
            AI + ۲-۵TB
          </span>
        </button>

        {/* Active Numbers */}
        <button
          onClick={() => onSwitchTab('active')}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition cursor-pointer ${
            activeTab === 'active'
              ? 'bg-sky-50 text-sky-700 font-semibold'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-clock-rotate-left text-lg"></i>
            <span>شماره‌های فعال</span>
          </div>
          {activeNumbersCount > 0 && (
            <span className="bg-sky-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
              {activeNumbersCount}
            </span>
          )}
        </button>

        {/* Transactions */}
        <button
          onClick={() => onSwitchTab('history')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition cursor-pointer ${
            activeTab === 'history'
              ? 'bg-sky-50 text-sky-700 font-semibold'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <i className="fa-solid fa-receipt text-lg"></i>
          <span>تاریخچه تراکنش‌ها</span>
        </button>

        {/* Admin Inventory (Visible only to Admin) */}
        {user?.isAdmin && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 px-4 py-1 uppercase tracking-wider">
              بخش مدیریت سیستم
            </div>
            <button
              onClick={() => onSwitchTab('windscribe_admin')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-medium text-xs transition cursor-pointer ${
                activeTab === 'windscribe_admin'
                  ? 'bg-amber-50 text-amber-800 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <i className="fa-solid fa-boxes-stacked text-amber-600 text-sm"></i>
                <span>انبار و قیمت ویندسکرایب</span>
              </div>
              <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded font-black">
                ادمین
              </span>
            </button>

            <button
              onClick={() => onSwitchTab('gemini_admin')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-medium text-xs transition cursor-pointer ${
                activeTab === 'gemini_admin'
                  ? 'bg-violet-50 text-violet-800 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <i className="fa-solid fa-wand-magic-sparkles text-violet-600 text-sm"></i>
                <span>انبار و قیمت جمنای پرو</span>
              </div>
              <span className="bg-violet-100 text-violet-800 text-[9px] px-1.5 py-0.5 rounded font-black">
                ادمین
              </span>
            </button>

            <button
              onClick={() => onSwitchTab('card_admin')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-medium text-xs transition cursor-pointer ${
                activeTab === 'card_admin'
                  ? 'bg-indigo-50 text-indigo-800 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <i className="fa-solid fa-credit-card text-indigo-600 text-sm"></i>
                <span>واریزهای کارت به کارت</span>
              </div>
              <span className="bg-indigo-100 text-indigo-800 text-[9px] px-1.5 py-0.5 rounded font-black">
                ادمین
              </span>
            </button>
          </div>
        )}
      </nav>

      {/* Quick Info Box */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 text-white p-4 rounded-2xl shadow-sm space-y-2 border border-indigo-900/40">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
          <i className="fa-solid fa-bolt"></i>
          <span>تحویل ۱۰۰٪ آنی و قانونی</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          اکانت‌های ویندسکرایب با اتصال همزمان ۱۰ الی ۱۵ کاربر و جمنای پرو ۱۸ ماهه (مدل‌های 4 Argon و 3.1 Pro + ۲ تا ۵ ترابایت ابری) به صورت آنی تحویل داده می‌شوند.
        </p>
      </div>
    </aside>
  );
}
