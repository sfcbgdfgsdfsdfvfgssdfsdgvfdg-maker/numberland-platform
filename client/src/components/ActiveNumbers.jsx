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
      <div className="bg-white rounded-2xl p-10 border border-slate-200/80 shadow-sm text-center py-12 space-y-3">
        <i className="fa-solid fa-inbox text-5xl mb-2 text-slate-300"></i>
        <p className="text-sm font-semibold text-slate-600">هیچ شماره فعالی ندارید.</p>
        <p className="text-xs text-slate-400">
          یک شماره از بخش دریافت شماره خریداری کنید تا پیامک‌ها در این صفحه نمایش داده شوند.
        </p>
        <button
          onClick={() => onSwitchTab('buy')}
          className="mt-4 bg-sky-500 hover:bg-sky-600 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm cursor-pointer"
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
            className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm max-w-lg mx-auto space-y-4 font-sans dir-rtl"
          >
            {/* Order Title */}
            <div className="text-center text-slate-600 font-bold text-sm tracking-wide">
              Order №{item.id}
            </div>

            {/* Dotted Details Table */}
            <div className="space-y-2 text-xs text-slate-700 border-y border-slate-100 py-3">
              <div className="flex justify-between items-center border-b border-dotted border-slate-200 pb-1">
                <span className="text-slate-400 font-medium">Date</span>
                <span className="font-mono text-slate-800">{dateStr}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dotted border-slate-200 pb-1">
                <span className="text-slate-400 font-medium">Service</span>
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <i className={item.icon || 'fa-solid fa-mobile'}></i> {item.service}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-dotted border-slate-200 pb-1">
                <span className="text-slate-400 font-medium">Country</span>
                <span className="font-semibold text-slate-800">{item.country}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dotted border-slate-200 pb-1">
                <span className="text-slate-400 font-medium">Operator</span>
                <span className="font-medium text-slate-800">{item.operator || 'Virtual4'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dotted border-slate-200 pb-1">
                <span className="text-slate-400 font-medium">Price</span>
                <span className="font-bold text-emerald-600 dir-ltr">
                  ${item.price ? item.price.toFixed(2) : '0.10'}
                </span>
              </div>
            </div>

            {/* Phone Number Box with Dual Copy Buttons */}
            <div className="space-y-1">
              <div className="text-[11px] text-slate-400 text-left font-medium dir-ltr">Number</div>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-slate-50/50">
                <button
                  onClick={() => onCopy(item.phone, 'کپی با کد کشور انجام شد')}
                  title="کپی با کد کشور"
                  className="bg-sky-500 hover:bg-sky-600 text-white px-3 py-2.5 transition flex items-center gap-1 text-xs font-bold cursor-pointer"
                >
                  +<i className="fa-regular fa-copy"></i>
                </button>
                <input
                  type="text"
                  readOnly
                  value={item.phone}
                  className="w-full text-center font-mono font-extrabold text-slate-900 text-base border-0 bg-transparent focus:outline-none dir-ltr"
                />
                <button
                  onClick={() => onCopy(item.phone.replace(/^\+/, ''), 'کپی بدون کد کشور انجام شد')}
                  title="کپی بدون کد کشور"
                  className="bg-sky-500 hover:bg-sky-600 text-white px-3 py-2.5 transition text-xs font-bold cursor-pointer"
                >
                  <i className="fa-regular fa-copy"></i>
                </button>
              </div>
            </div>

            {/* Info Notice Banner */}
            <div className="bg-sky-50/80 border border-sky-100 text-sky-800 text-[11px] p-2.5 rounded-xl flex items-center gap-2 text-right">
              <i className="fa-solid fa-circle-info text-sky-500 text-sm"></i>
              <span>امکان دریافت پیامک فعال است.</span>
            </div>

            {/* Code from SMS OTP Box */}
            <div className="space-y-1.5 text-left dir-ltr">
              <div className="flex justify-between items-center text-xs">
                <span class="text-slate-500 font-semibold">Code from SMS</span>
              </div>
              <div className="border border-slate-200 rounded-xl p-3 bg-white flex items-center justify-between min-h-[48px]">
                {item.status === 'waiting' ? (
                  <div className="flex items-center gap-2 text-amber-500 text-xs font-medium animate-pulse mx-auto">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>در انتظار دریافت پیامک...</span>
                  </div>
                ) : item.status === 'banned' ? (
                  <span className="text-red-500 text-xs font-bold mx-auto flex items-center gap-1">
                    <i className="fa-solid fa-ban"></i> Banned (مسدود شده)
                  </span>
                ) : item.status === 'cancelled' ? (
                  <span className="text-slate-400 text-xs font-bold mx-auto flex items-center gap-1">
                    <i className="fa-solid fa-xmark"></i> Cancelled (لغو شده)
                  </span>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono font-extrabold text-xl text-sky-600 tracking-wider">
                      {item.code}
                    </span>
                    <button
                      onClick={() => onCopy(item.code, 'کد پیامک کپی شد')}
                      className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <i className="fa-regular fa-copy text-sm"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Status & Progress Bar */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex justify-between items-center text-xs text-slate-600">
                <span className="font-medium">Status</span>
                <span className="font-bold text-slate-800">
                  {item.status === 'waiting'
                    ? '⏳ Received / Waiting'
                    : item.status === 'banned'
                    ? '🚫 Banned'
                    : item.status === 'cancelled'
                    ? '❌ Cancelled'
                    : '✅ Received'}
                </span>
              </div>
              {item.status === 'waiting' && (
                <>
                  <div className="text-xs text-slate-500 font-mono text-center">{formattedTime} left</div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-sky-500 h-full transition-all duration-1000"
                      style={{ width: `${((item.timeLeft || 0) / 1200) * 100}%` }}
                    ></div>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            {item.status === 'waiting' ? (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => onBanOrder(item.id)}
                  className="border border-sky-500 text-sky-600 hover:bg-sky-50 font-bold py-2.5 rounded-xl transition text-xs cursor-pointer"
                >
                  Ban (گزارش خراب)
                </button>
                <button
                  onClick={() => onCancelOrder(item.id)}
                  className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 rounded-xl transition shadow-md text-xs cursor-pointer"
                >
                  Cancel (انصراف و عودت)
                </button>
              </div>
            ) : (
              <div className="pt-2">
                <button
                  onClick={() => onSwitchTab('buy')}
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 rounded-xl transition shadow-md text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>خرید شماره جدید</span>
                  <i className="fa-solid fa-chevron-left text-[10px]"></i>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
