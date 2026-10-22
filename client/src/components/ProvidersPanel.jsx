import React from 'react';
import ProviderBadge from './ProviderBadge';

const PROVIDER_META = {
    fivesim:      { name: '5SIM', color: 'emerald' },
    smsactivate:  { name: 'SMS-Activate', color: 'blue' },
    smspool:      { name: 'SMSPool', color: 'violet' },
    grizzlysms:   { name: 'Grizzly SMS', color: 'amber' },
    smsman:       { name: 'SMS-Man', color: 'red' },
    onlinesim:    { name: 'OnlineSim', color: 'cyan' }
};

export default function ProvidersPanel({ providers = [], selectedProvider, onSelectProvider }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <i className="fa-solid fa-server text-slate-400"></i>
                    سرویس‌دهنده‌ها
                </h3>
                <span className="text-xs text-slate-400">{providers.filter(p => p.hasKey).length} فعال</span>
            </div>

            {/* Auto (cheapest) option */}
            <button
                onClick={() => onSelectProvider(null)}
                className={`w-full text-right px-3 py-2.5 rounded-xl mb-2 transition-all flex items-center justify-between ${
                    !selectedProvider
                        ? 'bg-emerald-50 border-2 border-emerald-400 shadow-sm'
                        : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                }`}
            >
                <div className="flex items-center gap-2">
                    <span className="text-lg">⚡</span>
                    <span className="text-sm font-bold text-slate-700">ارزان‌ترین خودکار</span>
                </div>
                <span className="text-xs text-emerald-600 font-medium">Auto</span>
            </button>

            {/* Provider list */}
            <div className="space-y-1.5">
                {providers.map(p => {
                    const meta = PROVIDER_META[p.name] || {};
                    const isActive = p.hasKey;
                    const isSelected = selectedProvider === p.name;

                    return (
                        <button
                            key={p.name}
                            onClick={() => isActive && onSelectProvider(p.name)}
                            disabled={!isActive}
                            className={`w-full text-right px-3 py-2 rounded-xl transition-all flex items-center justify-between ${
                                !isActive
                                    ? 'bg-slate-50 border border-slate-100 opacity-50 cursor-not-allowed'
                                    : isSelected
                                    ? `bg-${meta.color}-50 border-2 border-${meta.color}-400 shadow-sm`
                                    : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <ProviderBadge provider={p.name} size="xs" showName={false} />
                                <span className="text-sm font-medium text-slate-700">{p.displayName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {isActive ? (
                                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                ) : (
                                    <span className="text-[10px] text-slate-400">API Key ندارد</span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
