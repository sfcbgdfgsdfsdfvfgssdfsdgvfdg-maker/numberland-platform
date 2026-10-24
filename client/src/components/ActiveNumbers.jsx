import React from 'react';

export default function ActiveNumbers({
  activeNumbers = [],
  onCancelOrder,
  onBanOrder,
  onSwitchTab,
  onCopy
}) {
  if (activeNumbers.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-10 border border-white/10 shadow-xl text-center py-16 space-y-4 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500 mx-auto text-3xl shadow-inner">
          <i className="fa-solid fa-inbox"></i>
        </div>
        <h3 className="text-base font-bold text-slate-200">هیچ شماره فعالی در حال حاضر ندارید</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
          برای دریافت پیامک، یک شماره از بخش «خرید شماره مجازی» انتخاب کنید. پیامک‌های دریافتی بلافاصله همینجا نمایش داده خواهند شد.
        </p>
        <button
          onClick={() => onSwitchTab('buy')}
          className="mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-950/40 transition cursor-pointer"
        >
          خرید شماره جدید
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeNumbers.map((item) => {
        const minutes = Math.floor((item.timeLeft || 0) / 60);
        const seconds = (item.timeLeft || 0) % 60;
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        const dateStr = item.dateStr || new Date().toLocaleDateString('fa-IR', { hour: '2-digit', minute: '2-digit' });

        return (
          <div
            key={item.id}
            className="glass-panel border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl max-w-lg mx-auto space-y-4 font-sans dir-rtl relative overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>

            {/* Order Title */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-2">
                <i className="fa-solid fa-hashtag text-[10px]"></i>
                سفارش شماره #{item.id}
              </span>
              <span className="text-[11px] font-mono text-slate-400">{dateStr}</span>
            </div>

            {/* Details Table */}
            <div className="space-y-2 text-xs text-slate-300 border-b border-white/10 pb-3">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-400">سرویس انتخابی:</span>
                <span className="font-bold text-slate-100 flex items-center gap-1.5">
                  <i className={item.icon || 'fa-solid fa-mobile'}></i> {item.service}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-400">کشور:</span>
                <span className="font-semibold text-slate-200">{item.country}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-400">اپراتور مخابراتی:</span>
                <span className="font-mono text-slate-200">{item.operator || 'Virtual4'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-400">هزینه نهایی:</span>
                <span className="font-bold text-emerald-400 font-mono dir-ltr">
                  ${item.price ? item.price.toFixed(2) : '0.10'}
                </span>
              </div>
            </div>

            {/* Phone Number Box with Dual Copy Buttons */}
            <div className="space-y-1.5">
              <div className="text-[11px] text-slate-400 text-left font-mono dir-ltr">PHONE NUMBER</div>
              <div className="flex items-center border border-cyan-500/30 rounded-xl overflow-hidden bg-slate-950/80 shadow-inner">
                <button
                  onClick={() => onCopy(item.phone, 'شماره همراه با کد کشور کپی شد')}
                  title="کپی همراه با کد کشور (+)"
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3.5 py-3 transition flex items-center gap-1 text-xs font-black cursor-pointer"
                >
                  +<i className="fa-regular fa-copy"></i>
                </button>
                <input
                  type="text"
                  readOnly
                  value={item.phone}
                  className="w-full text-center font-mono font-black text-white text-lg border-0 bg-transparent focus:outline-none dir-ltr tracking-wider selection:bg-cyan-500/40"
                />
                <button
                  onClick={() => onCopy(item.phone.replace(/^\+/, ''), 'شماره بدون کد کشور کپی شد')}
                  title="کپی بدون کد کشور"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-3 transition text-xs font-bold cursor-pointer"
                >
                  <i className="fa-regular fa-copy"></i>
                </button>
              </div>
            </div>

            {/* Status & Code from SMS OTP Box */}
            <div className="space-y-1.5 text-left dir-ltr">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold font-mono">SMS VERIFICATION CODE</span>
                <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded">
                  ⏱ {formattedTime}
                </span>
              </div>

              <div className="border border-white/10 rounded-2xl p-4 bg-slate-950/90 flex items-center justify-between min-h-[56px] shadow-inner">
                {item.status === 'waiting' ? (
                  <div className="flex items-center gap-2.5 text-amber-300 text-xs font-bold animate-pulse mx-auto">
                    <i className="fa-solid fa-spinner fa-spin text-sm"></i>
                    <span>در انتظار دریافت کد از پیامک...</span>
                  </div>
                ) : item.status === 'banned' ? (
                  <span className="text-rose-400 text-xs font-black mx-auto flex items-center gap-1.5">
                    <i className="fa-solid fa-ban"></i> شماره مسدود شده (Banned)
                  </span>
                ) : item.code ? (
                  <div className="flex items-center justify-between w-full">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">OTP CODE:</span>
                      <span className="text-2xl font-black font-mono text-emerald-400 tracking-widest select-all">
                        {item.code}
                      </span>
                    </div>
                    <button
                      onClick={() => onCopy(item.code, 'کد تأیید کپی شد')}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition shadow-md shadow-emerald-500/20 cursor-pointer"
                    >
                      کپی کد
                    </button>
                  </div>
                ) : (
                  <div className="text-slate-500 text-xs mx-auto">در حال بررسی پیامک...</div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2 text-xs">
              <button
                onClick={() => onCancelOrder(item.id)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold py-2.5 rounded-xl border border-white/5 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-slate-400"></i>
                <span>لغو و استرداد وجه</span>
              </button>
              <button
                onClick={() => onBanOrder(item.id)}
                className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold py-2.5 rounded-xl border border-rose-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-triangle-exclamation text-rose-400"></i>
                <span>گزارش خرابی شماره</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
