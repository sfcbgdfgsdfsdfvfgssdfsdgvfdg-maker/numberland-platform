import React from 'react';
import ProviderBadge from './ProviderBadge';

const PROVIDER_META = {
    fivesim:      { name: '5SIM', color: 'emerald' },
    smsactivate:  { name: 'SMS-Activate', color: 'blue' },
    smspool:      { name: 'SMSPool', color: 'violet' },
    grizzlysms:   { name: 'Grizzly SMS', color: 'amber' },
    smsman:       { name: 'SMS-Man', color: 'rose' },
    onlinesim:    { name: 'OnlineSim', color: 'cyan' }
};

export default function ProvidersPanel({ providers = [], selectedProvider, onSelectProvider }) {
    return (
        <div className="glass-panel rounded-2xl border border-white/10 shadow-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <h3 className="text-xs font-black text-slate-200 flex items-center gap-2">
                    <i className="fa-solid fa-server text-cyan-400"></i>
                    <span>سرویس‌دهنده‌ها</span>
                </h3>
                <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-2 py-0.5 rounded-full">
                    {providers.filter(p => p.hasKey).length} فعال
                </span>
            </div>

            {/* Auto (cheapest) option */}
            <button
                onClick={() => onSelectProvider(null)}
                className={`w-full text-right px-3 py-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                    !selectedProvider
                        ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/15 border-2 border-emerald-400/80 text-emerald-200 shadow-md shadow-emerald-950/30 font-bold'
                        : 'bg-slate-900/60 border border-white/5 text-slate-300 hover:bg-white/5'
                }`}
            >
                <div className="flex items-center gap-2">
                    <span className="text-base">⚡</span>
                    <span className="text-xs font-bold">ارزان‌ترین خودکار</span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md">Auto</span>
            </button>

            {/* Provider list */}
            <div className="space-y-1.5">
                {providers.map(p => {
                    const isActive = p.hasKey;
                    const isSelected = selectedProvider === p.name;

                    return (
                        <button
                            key={p.name}
                            onClick={() => isActive && onSelectProvider(p.name)}
                            disabled={!isActive}
                            className={`w-full text-right px-3 py-2 rounded-xl transition-all flex items-center justify-between ${
                                !isActive
                                    ? 'bg-slate-900/30 border border-white/5 opacity-40 cursor-not-allowed text-slate-500'
                                    : isSelected
                                    ? 'bg-cyan-500/20 border-2 border-cyan-400 text-cyan-200 shadow-sm font-bold cursor-pointer'
                                    : 'bg-slate-900/50 border border-white/5 text-slate-300 hover:bg-white/5 cursor-pointer'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <ProviderBadge provider={p.name} size="xs" showName={false} />
                                <span className="text-xs font-medium">{p.displayName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {isActive ? (
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80"></span>
                                ) : (
                                    <span className="text-[9px] text-slate-600 font-mono">غیرفعال</span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
