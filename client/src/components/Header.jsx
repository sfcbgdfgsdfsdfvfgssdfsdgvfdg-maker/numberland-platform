import React from 'react';

export default function Header({ balance, onOpenWallet, user, onLogout }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-sky-600 to-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-sky-500/20">
              <i className="fa-solid font-bold fa-sim-card text-xl"></i>
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-2">
                سیم‌جت
              </span>
              <p className="text-xs text-slate-500">سامانه خدمات آنلاین و شماره مجازی بین‌المللی</p>
            </div>
          </div>

          {/* Balance & Profile */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Telegram Bot Link Button */}
            <a
              href="https://t.me/onstagh_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-sky-500/20 transition group"
              title="خرید مستقیم از ربات تلگرام سیم‌جت"
            >
              <i className="fa-brands fa-telegram text-base group-hover:scale-110 transition-transform"></i>
              <span className="hidden sm:inline">خرید با ربات تلگرام</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-mono dir-ltr hidden md:inline">@onstagh_bot</span>
            </a>

            {/* Wallet Balance */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-1.5 px-3 flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] text-slate-500 font-medium">موجودی کیف‌پول</div>
                <div className="text-sm font-bold text-emerald-600 dir-ltr">
                  $ {typeof balance === 'number' ? balance.toFixed(2) : '0.00'}
                </div>
              </div>
              <button onClick={onOpenWallet} className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition text-xs">
                <i className="fa-solid fa-plus"></i>
              </button>
            </div>

            {/* User Info */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs text-slate-500">خوش آمدید</div>
                  <div className="text-sm font-bold text-slate-700">{user.fullName || user.email}</div>
                </div>
                <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {(user.fullName || user.email).charAt(0).toUpperCase()}
                </div>
                <button 
                  onClick={onLogout}
                  className="text-slate-400 hover:text-red-500 transition p-2"
                  title="خروج"
                >
                  <i className="fa-solid fa-right-from-bracket"></i>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
