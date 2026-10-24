import React from 'react';

export default function Header({ balance, onOpenWallet, user, onLogout, tomanRate = 191208 }) {
  return (
    <header className="bg-[#0b132b]/85 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40 shadow-xl shadow-black/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-17 items-center">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3.5">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur-sm opacity-70 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative w-11 h-11 bg-gradient-to-tr from-[#0b192c] to-[#1e293b] border border-cyan-400/40 rounded-xl flex items-center justify-center text-cyan-300 shadow-inner">
                <i className="fa-solid fa-sim-card text-xl"></i>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl text-white tracking-tight flex items-center gap-1.5">
                  سیم‌جت
                  <span className="text-[10px] font-mono tracking-widest uppercase bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black px-1.5 py-0.5 rounded">
                    PRO
                  </span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">سامانه هوشمند خدمات آنلاین و شماره مجازی بین‌المللی</p>
            </div>
          </div>

          {/* Right Section: Rate Ticker + Bot + Wallet + Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Live Wallex Exchange Rate Badge */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-300 shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-400 text-[11px]">نرخ روز تتر:</span>
              <span className="font-mono font-bold text-emerald-400 dir-ltr text-xs">
                {tomanRate?.toLocaleString() || '191,208'} <span className="text-[10px] text-slate-400 font-sans">تومان</span>
              </span>
            </div>

            {/* Telegram Bot Link Button */}
            <a
              href="https://t.me/onstagh_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-sky-500/25 transition-all duration-200 group"
              title="ورود به ربات رسمی تلگرام سیم‌جت"
            >
              <i className="fa-brands fa-telegram text-base group-hover:scale-110 transition-transform"></i>
              <span className="hidden sm:inline">ربات تلگرام</span>
              <span className="text-[10px] bg-black/25 px-1.5 py-0.5 rounded-full font-mono dir-ltr hidden md:inline">@onstagh_bot</span>
            </a>

            {/* Wallet Balance Chip */}
            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-1.5 px-3 flex items-center gap-3 shadow-lg shadow-emerald-950/20">
              <div className="text-right">
                <div className="text-[9px] text-slate-400 font-medium">موجودی کیف‌پول</div>
                <div className="text-sm font-black text-emerald-400 font-mono dir-ltr tracking-tight">
                  $ {typeof balance === 'number' ? balance.toFixed(2) : '0.00'}
                </div>
              </div>
              <button
                onClick={onOpenWallet}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-1.5 rounded-lg transition-transform hover:scale-105 active:scale-95 text-xs font-bold cursor-pointer"
                title="افزایش موجودی"
              >
                <i className="fa-solid fa-plus text-[11px]"></i>
              </button>
            </div>

            {/* User Info & Logout */}
            {user && (
              <div className="flex items-center gap-2.5 bg-slate-900/60 border border-slate-800 rounded-xl p-1 pr-3">
                <div className="text-right hidden sm:block">
                  <div className="text-[10px] text-slate-400">کاربر گرامی</div>
                  <div className="text-xs font-bold text-slate-200 max-w-[120px] truncate">{user.fullName || user.email}</div>
                </div>
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-md">
                  {(user.fullName || user.email).charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={onLogout}
                  className="text-slate-400 hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                  title="خروج از حساب"
                >
                  <i className="fa-solid fa-right-from-bracket text-xs"></i>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
