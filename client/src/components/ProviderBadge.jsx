import React from 'react';

const PROVIDER_STYLES = {
    fivesim:      { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: '📡' },
    smsactivate:  { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30', icon: '📱' },
    smspool:      { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/30', icon: '🎯' },
    grizzlysms:   { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', icon: '🐻' },
    smsman:       { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', icon: '🕵️' },
    onlinesim:    { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30', icon: '🌐' }
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
