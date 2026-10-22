import React from 'react';
import ProviderBadge from './ProviderBadge';

/**
 * Normalize delivery rate to 0-100% scale
 * 5SIM: rate is a score (higher = better), not a percentage
 * Others: may be 0-100 or 0-1
 */
function normalizeRate(rate, provider) {
  if (!rate || rate <= 0) return 0;
  // 5SIM rates are typically 0-30+ scale
  if (provider === 'fivesim' && rate < 100) return Math.min(rate * 3.5, 100);
  // Already percentage
  if (rate > 1 && rate <= 100) return rate;
  // 0-1 scale
  if (rate <= 1) return rate * 100;
  return rate;
}

function RateBar({ rate, provider }) {
  const pct = normalizeRate(rate, provider);
  let color = 'bg-slate-300';
  let textColor = 'text-slate-500';
  let label = 'نامشخص';

  if (pct >= 80) { color = 'bg-emerald-500'; textColor = 'text-emerald-700'; label = 'عالی'; }
  else if (pct >= 60) { color = 'bg-lime-500'; textColor = 'text-lime-700'; label = 'خوب'; }
  else if (pct >= 40) { color = 'bg-amber-500'; textColor = 'text-amber-700'; label = 'متوسط'; }
  else if (pct > 0) { color = 'bg-red-500'; textColor = 'text-red-600'; label = 'ضعیف'; }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className={`font-bold ${textColor}`}>
          {pct > 0 ? `${pct.toFixed(0)}% — ${label}` : 'نامشخص'}
        </span>
        <span className="text-slate-400">نرخ دلیوری</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct || 5}%` }} />
      </div>
    </div>
  );
}

export default function OperatorList({ operators = [], selectedOperator, onSelectOperator, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm text-center py-8 space-y-3">
        <i className="fa-solid fa-spinner fa-spin text-2xl text-sky-500"></i>
        <p className="text-xs text-slate-500 font-semibold">در حال استعلام از چندین سرویس‌دهنده...</p>
      </div>
    );
  }

  if (operators.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm text-center py-8 space-y-2">
        <i className="fa-solid fa-signal text-3xl text-slate-300"></i>
        <p className="text-sm font-bold text-slate-700">هیچ اپراتوری برای این سرویس و کشور موجود نیست</p>
        <p className="text-xs text-slate-400">لطفاً کشور یا سرویس دیگری را انتخاب کنید.</p>
      </div>
    );
  }

  // Check if we have multiple providers
  const uniqueProviders = [...new Set(operators.map(op => op.provider))];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>انتخاب اپراتور</span>
            <span className="text-xs font-normal text-slate-400">({operators.length} موجود)</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            مرتب‌سازی: ارزان‌ترین + بالاترین نرخ دلیوری
          </p>
        </div>
        {uniqueProviders.length > 1 && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">از</span>
            <span className="text-xs font-bold text-slate-600">{uniqueProviders.length}</span>
            <span className="text-[10px] text-slate-400">provider</span>
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
              className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2.5 relative ${
                isSelected
                  ? 'border-sky-500 bg-sky-50/50 shadow-md ring-2 ring-sky-500/20'
                  : 'border-slate-200/90 hover:border-sky-300 hover:bg-slate-50/80'
              }`}
            >
              {/* Best value badge */}
              {idx === 0 && (
                <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  ⚡ بهترین
                </div>
              )}

              {/* Top: Name + Provider */}
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <span className="font-bold text-sm text-slate-900 capitalize block">
                    {op.name}
                  </span>
                  <ProviderBadge provider={op.provider} size="xs" />
                </div>
                <div className="text-left">
                  <span className="font-extrabold text-sm text-emerald-600 dir-ltr block">
                    $ {op.cost ? op.cost.toFixed(2) : '0.10'}
                  </span>
                  {op.rate > 0 && (
                    <span className="text-[10px] text-slate-400 dir-ltr block">
                      واقعی: ${effectivePrice.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Delivery Rate Bar */}
              <RateBar rate={op.rate} provider={op.provider} />

              {/* Stock */}
              <div className="flex items-center justify-between text-[10px]">
                {op.count > 0 ? (
                  <span className="text-emerald-600 font-medium">
                    <i className="fa-solid fa-check-circle ml-1"></i>
                    {op.count.toLocaleString()} شماره موجود
                  </span>
                ) : (
                  <span className="text-red-500 font-medium">
                    <i className="fa-solid fa-times-circle ml-1"></i>
                    ناموجود
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
