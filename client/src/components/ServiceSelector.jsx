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
  { id: 'telegram', name: 'تلگرام (Telegram)', icon: 'fa-brands fa-telegram text-sky-500', basePrice: 0.15 },
  { id: 'whatsapp', name: 'واتساپ (WhatsApp)', icon: 'fa-brands fa-whatsapp text-emerald-500', basePrice: 0.20 },
  { id: 'google', name: 'جیمیل / گوگل (Google)', icon: 'fa-brands fa-google text-red-500', basePrice: 0.10 },
  { id: 'openai', name: 'OpenAI (ChatGPT)', icon: 'fa-solid fa-robot text-teal-600', basePrice: 0.35 },
  { id: 'instagram', name: 'اینستاگرام (Instagram)', icon: 'fa-brands fa-instagram text-pink-500', basePrice: 0.12 },
  { id: 'tiktok', name: 'تیک‌تاک (TikTok)', icon: 'fa-brands fa-tiktok text-slate-900', basePrice: 0.15 },
  { id: 'twitter', name: 'توییتر / X (Twitter)', icon: 'fa-brands fa-x-twitter text-slate-800', basePrice: 0.18 }
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
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
      {/* 1. Country Selection */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-700">
          ۱. انتخاب کشور شماره:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {COUNTRIES.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectCountry(c.id)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                selectedCountry === c.id
                  ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm font-bold'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="text-base">{c.flag}</span>
              <span className="truncate">{c.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Service Selection */}
      <div className="space-y-3 border-t border-slate-100 pt-5">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <label className="block text-xs font-bold text-slate-700">
            ۲. انتخاب سرویس / پیام‌رسان:
          </label>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="جستجوی سرویس (تلگرام، گوگل...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-sky-500"
            />
            <i className="fa-solid fa-magnifying-glass absolute right-2.5 top-2.5 text-slate-400 text-xs"></i>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredServices.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelectService(s.id)}
              className={`p-3 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                selectedService === s.id
                  ? 'border-sky-500 bg-sky-50/60 shadow-sm ring-1 ring-sky-500/30'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <i className={`${s.icon} text-lg`}></i>
                <span className="text-xs font-bold text-slate-800">{s.name}</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-600 font-bold dir-ltr">
                از ${s.basePrice}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
