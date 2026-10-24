import React from 'react';
import ProviderBadge from './ProviderBadge';

/**
 * Normalize delivery rate to 0-100% scale
 */
function normalizeRate(rate, provider) {
  if (!rate || rate <= 0) return 0;
  if (provider === 'fivesim' && rate < 100) return Math.min(rate * 3.5, 100);
  if (rate > 1 && rate <= 100) return rate;
  if (rate <= 1) return rate * 100;
  return rate;
}

function RateBar({ rate, provider }) {
  const pct = normalizeRate(rate, provider);
  let color = 'bg-slate-700';
  let textColor = 'text-slate-400';
  let label = 'نامشخص';

  if (pct >= 80) { color = 'bg-emerald-500 shadow-sm shadow-emerald-500/50'; textColor = 'text-emerald-400 font-bold'; label = 'عالی'; }
  else if (pct >= 60) { color = 'bg-cyan-500 shadow-sm shadow-cyan-500/50'; textColor = 'text-cyan-300 font-bold'; label = 'خوب'; }
  else if (pct >= 40) { color = 'bg-amber-500'; textColor = 'text-amber-300 font-bold'; label = 'متوسط'; }
  else if (pct > 0) { color = 'bg-rose-500'; textColor = 'text-rose-400 font-bold'; label = 'ضعیف'; }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className={textColor}>
          {pct > 0 ? `${pct.toFixed(0)}% — ${label}` : 'نامشخص'}
        </span>
        <span className="text-slate-500">نرخ دلیوری پیامک</span>
      </div>
      <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden border border-white/5">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct || 5}%` }} />
      </div>
    </div>
  );
}

export default function OperatorList({ operators = [], selectedOperator, onSelectOperator, loading }) {
  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-8 border border-white/10 shadow-xl text-center space-y-3">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-cyan-400"></i>
        <p className="text-xs text-slate-300 font-bold">در حال استعلام نرخ و موجودی اپراتورها...</p>
      </div>
    );
  }

  if (operators.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-8 border border-white/10 shadow-xl text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500 mx-auto text-xl">
          <i className="fa-solid fa-signal"></i>
        </div>
        <p className="text-sm font-bold text-slate-200">هیچ اپراتوری برای این سرویس و کشور یافت نشد</p>
        <p className="text-xs text-slate-400">لطفاً کشور یا سرویس دیگری را انتخاب نمایید.</p>
      </div>
    );
  }

  const uniqueProviders = [...new Set(operators.map(op => op.provider))];

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-xl space-y-4">
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <span>اپراتورهای مخابراتی در دسترس</span>
            <span className="text-xs font-normal text-slate-400 font-mono">({operators.length})</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            اولویت مرتب‌سازی: اقتصادی‌ترین قیمت + بالاترین شانس دریافت SMS
          </p>
        </div>
        {uniqueProviders.length > 1 && (
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px]">
            <span className="text-slate-400">از</span>
            <span className="font-bold text-cyan-400 font-mono">{uniqueProviders.length}</span>
            <span className="text-slate-400">سرویس‌دهنده</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {operators.map((op, idx) => {
          const isSelected = selectedOperator?.key === op.key || selectedOperator?.name === op.name;
          const effectivePrice = op.effectivePrice || op.cost;

          return (
            <div
              key={op.key || op.name}
              onClick={() => onSelectOperator(op)}
              className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 relative group ${
                isSelected
                  ? 'border-cyan-400/80 bg-gradient-to-b from-cyan-500/15 to-blue-500/10 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/40'
                  : 'border-white/5 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              {/* Best value badge */}
              {idx === 0 && (
                <div className="absolute -top-2.5 -right-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full shadow-md">
                  ⚡ بالاترین شانس
                </div>
              )}

              {/* Top: Name + Cost */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="font-bold text-sm text-slate-100 capitalize block">
                    {op.name}
                  </span>
                  <ProviderBadge provider={op.provider} size="xs" />
                </div>
                <div className="text-left">
                  <span className="font-mono font-black text-base text-emerald-400 dir-ltr block">
                    $ {op.cost ? op.cost.toFixed(2) : '0.10'}
                  </span>
                  {op.rate > 0 && (
                    <span className="text-[10px] text-slate-500 dir-ltr block font-mono">
                      موثر: ${effectivePrice.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Delivery Rate Bar */}
              <RateBar rate={op.rate} provider={op.provider} />

              {/* Stock */}
              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5">
                {op.count > 0 ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {op.count.toLocaleString()} شماره آماده
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold">
                    موقتاً ناموجود
                  </span>
                )}
                <span className={`text-[10px] font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-500 group-hover:text-slate-400'}`}>
                  {isSelected ? '✓ انتخاب‌شده' : 'انتخاب اپراتور'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
