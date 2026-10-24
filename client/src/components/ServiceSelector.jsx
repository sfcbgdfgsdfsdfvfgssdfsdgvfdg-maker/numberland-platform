import React, { useState } from 'react';

const COUNTRIES = [
  { id: 'usa', name: 'آمریکا (USA)', flag: '🇺🇸', code: '+1' },
  { id: 'canada', name: 'کانادا (Canada)', flag: '🇨🇦', code: '+1' },
  { id: 'england', name: 'انگلستان (UK)', flag: '🇬🇧', code: '+44' },
  { id: 'indonesia', name: 'اندونزی (Indonesia)', flag: '🇮🇩', code: '+62' },
  { id: 'netherlands', name: 'هلند (Netherlands)', flag: '🇳🇱', code: '+31' },
  { id: 'germany', name: 'آلمان (Germany)', flag: '🇩🇪', code: '+49' },
  { id: 'france', name: 'فرانسه (France)', flag: '🇫🇷', code: '+33' }
];

const SERVICES = [
  { id: 'telegram', name: 'تلگرام (Telegram)', icon: 'fa-brands fa-telegram text-sky-400', basePrice: 0.15 },
  { id: 'whatsapp', name: 'واتساپ (WhatsApp)', icon: 'fa-brands fa-whatsapp text-emerald-400', basePrice: 0.20 },
  { id: 'google', name: 'جیمیل / گوگل (Google)', icon: 'fa-brands fa-google text-rose-400', basePrice: 0.10 },
  { id: 'openai', name: 'OpenAI (ChatGPT)', icon: 'fa-solid fa-robot text-teal-300', basePrice: 0.35 },
  { id: 'instagram', name: 'اینستاگرام (Instagram)', icon: 'fa-brands fa-instagram text-pink-400', basePrice: 0.12 },
  { id: 'tiktok', name: 'تیک‌تاک (TikTok)', icon: 'fa-brands fa-tiktok text-slate-200', basePrice: 0.15 },
  { id: 'twitter', name: 'توییتر / X (Twitter)', icon: 'fa-brands fa-x-twitter text-slate-200', basePrice: 0.18 }
];

export default function ServiceSelector({
  selectedCountry,
  onSelectCountry,
  selectedService,
  onSelectService
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredServices = SERVICES.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-xl space-y-6">
      {/* 1. Country Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-black text-cyan-300 uppercase tracking-wide">
            <span className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-mono">1</span>
            <span>انتخاب کشور شماره:</span>
          </label>
          <span className="text-[11px] text-slate-400">تحویل کد کمتر از ۶۰ ثانیه</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {COUNTRIES.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectCountry(c.id)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                selectedCountry === c.id
                  ? 'border-cyan-400/80 bg-cyan-500/15 text-cyan-200 font-black shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/30'
                  : 'border-white/5 bg-slate-900/50 text-slate-300 hover:border-slate-700 hover:bg-white/5'
              }`}
            >
              <span className="text-base">{c.flag}</span>
              <span className="truncate">{c.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Service Selection */}
      <div className="space-y-3.5 border-t border-white/5 pt-5">
        <div className="flex justify-between items-center flex-wrap gap-2.5">
          <label className="flex items-center gap-2 text-xs font-black text-cyan-300 uppercase tracking-wide">
            <span className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-mono">2</span>
            <span>انتخاب سرویس / پیام‌رسان:</span>
          </label>
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="جستجوی سرویس (تلگرام، گوگل...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 pr-8 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition"
            />
            <i className="fa-solid fa-magnifying-glass absolute right-2.5 top-2.5 text-slate-500 text-xs"></i>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {filteredServices.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelectService(s.id)}
              className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between group ${
                selectedService === s.id
                  ? 'border-cyan-400/80 bg-cyan-500/15 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-400/30 text-white'
                  : 'border-white/5 bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-white/5 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <i className={`${s.icon} text-base`}></i>
                </div>
                <span className="text-xs font-bold text-slate-200">{s.name}</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold dir-ltr">
                از ${s.basePrice}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
