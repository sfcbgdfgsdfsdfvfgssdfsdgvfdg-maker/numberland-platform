import React from 'react';

const PROVIDER_STYLES = {
    fivesim:      { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', icon: '📡' },
    smsactivate:  { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', icon: '📱' },
    smspool:      { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300', icon: '🎯' },
    grizzlysms:   { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', icon: '🐻' },
    smsman:       { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', icon: '🕵️' },
    onlinesim:    { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300', icon: '🌐' }
};

const PROVIDER_NAMES = {
    fivesim: '5SIM',
    smsactivate: 'SMS-Activate',
    smspool: 'SMSPool',
    grizzlysms: 'Grizzly SMS',
    smsman: 'SMS-Man',
    onlinesim: 'OnlineSim'
};

export default function ProviderBadge({ provider, size = 'sm', showName = true }) {
    const style = PROVIDER_STYLES[provider] || PROVIDER_STYLES.fivesim;
    const name = PROVIDER_NAMES[provider] || provider;
    const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';

    return (
        <span className={`inline-flex items-center gap-1 rounded-full font-medium border ${style.bg} ${style.text} ${style.border} ${sizeClass}`}>
            <span>{style.icon}</span>
            {showName && <span>{name}</span>}
        </span>
    );
}
