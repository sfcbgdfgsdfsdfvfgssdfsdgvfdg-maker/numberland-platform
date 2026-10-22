import React, { useState, useEffect } from 'react';

export default function GeminiShop({
  user,
  balance,
  onOpenWallet,
  onShowToast,
  onBalanceUpdated,
  initialSubTab = 'shop'
}) {
  const [subTab, setSubTab] = useState(initialSubTab); // 'shop' or 'admin'
  const [plan, setPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [buying, setBuying] = useState(false);
  const [lastBought, setLastBought] = useState(null);

  // My Orders
  const [myOrders, setMyOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Admin State
  const [adminStats, setAdminStats] = useState(null);
  const [adminLinks, setAdminLinks] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [priceInput, setPriceInput] = useState('12.0');
  const [instructionsInput, setInstructionsInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [rawLinksInput, setRawLinksInput] = useState('');
  const [addingLinks, setAddingLinks] = useState(false);
  const [linkFilter, setLinkFilter] = useState('all'); // 'all', 'available', 'sold'

  const token = localStorage.getItem('token');
  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  // 1. Fetch Plan Info
  const fetchPlan = async () => {
    try {
      setLoadingPlan(true);
      const res = await fetch('/api/gemini/plan');
      const data = await res.json();
      if (data.success && data.plan) {
        setPlan(data.plan);
        setPriceInput(data.plan.priceUsd?.toString() || '12.0');
        setInstructionsInput(data.plan.instructions || '');
      }
    } catch (e) {
      console.error('Fetch Gemini plan error:', e);
    } finally {
      setLoadingPlan(false);
    }
  };

  // 2. Fetch User Orders
  const fetchMyOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await fetch('/api/gemini/my-orders', { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setMyOrders(data.orders || []);
      }
    } catch (e) {
      console.error('Fetch Gemini orders error:', e);
    } finally {
      setLoadingOrders(false);
    }
  };

  // 3. Fetch Admin Inventory
  const fetchAdminInventory = async () => {
    if (!user?.isAdmin) return;
    try {
      setLoadingAdmin(true);
      const res = await fetch('/api/gemini/admin/inventory', { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setAdminStats(data.stats);
        setAdminLinks(data.links || []);
        if (data.stats?.priceUsd) {
          setPriceInput(data.stats.priceUsd.toString());
        }
        if (data.stats?.instructions) {
          setInstructionsInput(data.stats.instructions);
        }
      }
    } catch (e) {
      console.error('Fetch Gemini admin inventory error:', e);
    } finally {
      setLoadingAdmin(false);
    }
  };

  useEffect(() => {
    fetchPlan();
    fetchMyOrders();
    if (user?.isAdmin) {
      fetchAdminInventory();
    }
  }, [user]);

  // Handle Buy
  const handleBuy = async () => {
    if (!plan) return;
    if (balance < plan.priceUsd) {
      onShowToast(`موجودی کیف پول شما کافی نیست. لطفاً ابتدا حداقل $${plan.priceUsd} حساب خود را شارژ فرمایید.`, 'error');
      if (onOpenWallet) onOpenWallet();
      return;
    }

    if (plan.availableCount <= 0) {
      onShowToast('موجودی لینک‌های اکانت جمنای پرو در حال حاضر به اتمام رسیده است.', 'error');
      return;
    }

    try {
      setBuying(true);
      const res = await fetch('/api/gemini/buy', {
        method: 'POST',
        headers: authHeaders
      });
      const data = await res.json();

      if (data.success && data.order) {
        setLastBought(data.order);
        if (onBalanceUpdated && data.newBalance !== undefined) {
          onBalanceUpdated(data.newBalance);
        }
        onShowToast('اکانت جمنای پرو ۱۸ ماهه با موفقیت خریداری شد!', 'success');
        fetchPlan();
        fetchMyOrders();
      } else {
        onShowToast(data.message || 'خطا در خرید اکانت جمنای', 'error');
      }
    } catch (e) {
      console.error('Buy Gemini error:', e);
      onShowToast('خطا در برقراری ارتباط با سرور', 'error');
    } finally {
      setBuying(false);
    }
  };

  // Handle Admin Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const newPrice = parseFloat(priceInput);
    if (isNaN(newPrice) || newPrice <= 0) {
      onShowToast('قیمت دلاری نامعتبر است', 'error');
      return;
    }

    try {
      setSavingSettings(true);
      const res = await fetch('/api/gemini/admin/settings', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          priceUsd: newPrice,
          instructions: instructionsInput
        })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('تنظیمات پلن جمنای پرو با موفقیت ذخیره شد.', 'success');
        fetchPlan();
        fetchAdminInventory();
      } else {
        onShowToast(data.message || 'خطا در ذخیره تنظیمات', 'error');
      }
    } catch (e) {
      onShowToast('خطا در ارتباط با سرور', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle Admin Bulk Add Links
  const handleAddLinks = async (e) => {
    e.preventDefault();
    if (!rawLinksInput.trim()) {
      onShowToast('لطفاً حداقل یک لینک فعال‌سازی وارد فرمایید.', 'error');
      return;
    }

    try {
      setAddingLinks(true);
      const res = await fetch('/api/gemini/admin/add-links', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ rawText: rawLinksInput })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(data.message, 'success');
        setRawLinksInput('');
        fetchPlan();
        fetchAdminInventory();
      } else {
        onShowToast(data.message || 'خطا در ثبت لینک‌ها', 'error');
      }
    } catch (e) {
      onShowToast('خطا در ارتباط با سرور', 'error');
    } finally {
      setAddingLinks(false);
    }
  };

  // Handle Delete Link
  const handleDeleteLink = async (id) => {
    if (!window.confirm('آیا از حذف این لینک از انبار مطمئن هستید؟')) return;

    try {
      const res = await fetch(`/api/gemini/admin/link/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('لینک با موفقیت حذف گردید.', 'success');
        fetchPlan();
        fetchAdminInventory();
      } else {
        onShowToast(data.message || 'خطا در حذف لینک', 'error');
      }
    } catch (e) {
      onShowToast('خطا در ارتباط با سرور', 'error');
    }
  };

  const copyToClipboard = (text, msg = 'لینک کپی گردید!') => {
    navigator.clipboard.writeText(text);
    onShowToast(msg, 'success');
  };

  // Filter links for admin
  const filteredLinks = adminLinks.filter(l => {
    if (linkFilter === 'available') return l.status === 'AVAILABLE';
    if (linkFilter === 'sold') return l.status === 'SOLD';
    return true;
  });

  return (
    <div className="space-y-6 dir-rtl">
      {/* Top Tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-violet-200">
            <i className="fa-solid fa-wand-magic-sparkles text-lg"></i>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <span>اشتراک اکانت گوگل جمنای پرو (Gemini Advanced)</span>
              <span className="text-[11px] bg-gradient-to-r from-violet-600 to-purple-600 text-white font-extrabold px-2.5 py-0.5 rounded-full shadow-sm">
                ۱۸ ماهه رسمی
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              تحویل آنی لینک فعال‌سازی اختصاصی با ۲ تا ۵ ترابایت فضای ابری Google Drive و مدل‌های نسل جدید
            </p>
          </div>
        </div>

        {user?.isAdmin && (
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSubTab('shop')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'shop'
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="fa-solid fa-cart-shopping ml-1.5"></i>
              فروشگاه و خرید
            </button>
            <button
              onClick={() => setSubTab('admin')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'admin'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="fa-solid fa-screwdriver-wrench ml-1.5"></i>
              مدیریت انبار لینک‌ها (ادمین)
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SHOP TAB */}
      {/* ======================================================== */}
      {subTab === 'shop' && (
        <div className="space-y-6">
          {/* Hero Banner & Plan Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Plan Info Card */}
            <div className="lg:col-span-7 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-indigo-900/50 flex flex-col justify-between">
              {/* Background Glow */}
              <div className="absolute -top-24 -left-24 w-80 h-80 bg-violet-600/25 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-purple-600/25 rounded-full blur-3xl pointer-events-none"></div>

              <div className="relative z-10 space-y-4">
                <div className="inline-flex items-center gap-2 bg-violet-500/20 border border-violet-400/30 px-3.5 py-1.5 rounded-full text-violet-300 text-xs font-extrabold backdrop-blur-md">
                  <i className="fa-solid fa-sparkles text-amber-300"></i>
                  <span>دسترسی به مدل‌های نسل جدید گوگل: 4 Argon و 3.1 Pro</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  اشتراک ۱۸ ماهه گوگل جمنای پرو + ۲ تا ۵ ترابایت ابری Google Drive
                </h2>

                <p className="text-slate-300 text-sm leading-relaxed">
                  قوی‌ترین تایر هوش مصنوعی گوگل با دسترسی به مدل پرچمدار <b>4 Argon</b> برای مسائل فوق پیچیده، <b>3.1 Pro</b> با استدلال عمیق، <b>3.8 Flash</b> و <b>3.5 Flash-Lite</b> به همراه امکان تنظیم سطح تفکر (Thinking Level) و ۲ الی ۵ ترابایت فضای ابری.
                </p>

                {/* Models Showcase Box (Matching Google Interface) */}
                <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 space-y-2">
                  <span className="text-[11px] font-bold text-violet-300 block">
                    🤖 مدل‌های فعال در پنل جمنای شما:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-violet-900/40 border border-violet-400/30 p-2 rounded-xl">
                      <span className="font-mono font-black text-white block text-sm">4 Argon</span>
                      <span className="text-[10px] text-violet-200">وظایف پیچیده</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-2 rounded-xl">
                      <span className="font-mono font-black text-white block text-sm">3.1 Pro</span>
                      <span className="text-[10px] text-slate-300">استدلال عمیق</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-2 rounded-xl">
                      <span className="font-mono font-black text-white block text-sm">3.8 Flash</span>
                      <span className="text-[10px] text-slate-300">کمک همه‌جانبه</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-2 rounded-xl">
                      <span className="font-mono font-black text-white block text-sm">3.5 Flash-Lite</span>
                      <span className="text-[10px] text-slate-300">پاسخ‌های آنی</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-emerald-300 flex items-center justify-between pt-1">
                    <span>🎯 پشتیبانی کامل از تعیین سطح تفکر (Thinking Level)</span>
                    <span className="font-mono text-amber-300">Active Tier</span>
                  </div>
                </div>

                {/* Features List */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-200">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2.5 rounded-xl">
                    <i className="fa-solid fa-check text-emerald-400"></i>
                    <span>مدل پرچمدار 4 Argon و 3.1 Pro</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2.5 rounded-xl">
                    <i className="fa-solid fa-cloud text-sky-400"></i>
                    <span>۲ الی ۵ ترابایت فضای ابری Google Drive</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2.5 rounded-xl">
                    <i className="fa-solid fa-brain text-purple-400"></i>
                    <span>تنظیم سطح تفکر (Thinking Level)</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2.5 rounded-xl">
                    <i className="fa-solid fa-shield-check text-emerald-400"></i>
                    <span>تحویل آنی لینک اختصاصی فعال‌سازی</span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>تضمین فعال‌سازی ۱۰۰٪ و پشتیبانی کامل ۲۴ ساعته</span>
                <span className="text-violet-300 font-bold flex items-center gap-1.5">
                  <i className="fa-brands fa-google text-amber-400 text-sm"></i>
                  اکانت قانونی Google
                </span>
              </div>
            </div>

            {/* Pricing & Checkout Card */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-md flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    مشخصات پلن
                  </span>
                  {plan && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                      plan.availableCount > 0
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${plan.availableCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                      {plan.availableCount > 0
                        ? `${plan.availableCount} لینک موجود در انبار`
                        : 'موجودی انبار به اتمام رسیده'}
                    </span>
                  )}
                </div>

                {/* Price Display */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-medium text-slate-500">قیمت اشتراک ۱۸ ماهه:</span>
                    <div className="text-left dir-ltr">
                      <span className="text-2xl font-black text-slate-900">
                        ${loadingPlan ? '...' : (plan?.priceUsd?.toFixed(2) || '12.00')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                    <span className="text-slate-500">معادل تومانی:</span>
                    <span className="font-extrabold text-violet-700 text-sm">
                      {loadingPlan ? 'در حال دریافت...' : (plan?.priceToman ? `${plan.priceToman.toLocaleString()} تومان` : '—')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>نرخ دلار والکس:</span>
                    <span>{plan?.rate ? `${plan.rate.toLocaleString()} تومان` : '—'}</span>
                  </div>
                </div>

                {/* Wallet Balance Info */}
                <div className="flex items-center justify-between text-xs px-1 text-slate-600">
                  <span>موجودی کیف‌پول شما:</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-black dir-ltr ${balance >= (plan?.priceUsd || 12) ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ${balance?.toFixed(2)}
                    </span>
                    {balance < (plan?.priceUsd || 12) && (
                      <button
                        onClick={onOpenWallet}
                        className="text-[11px] text-violet-600 hover:underline font-bold"
                      >
                        (افزایش موجودی)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6 space-y-2.5">
                <button
                  onClick={handleBuy}
                  disabled={buying || loadingPlan || (plan?.availableCount <= 0)}
                  className={`w-full py-4 rounded-2xl font-black text-sm transition-all duration-200 flex items-center justify-center gap-2.5 shadow-lg cursor-pointer ${
                    plan?.availableCount <= 0
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-violet-200 hover:shadow-violet-300'
                  }`}
                >
                  {buying ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-base"></i>
                      <span>در حال صدور و تحویل لینک اختصاصی...</span>
                    </>
                  ) : plan?.availableCount <= 0 ? (
                    <>
                      <i className="fa-solid fa-clock"></i>
                      <span>به زودی موجود خواهد شد</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-bolt text-amber-300"></i>
                      <span>خرید و صدور آنی لینک فعال‌سازی</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  پس از کسر هزینه از کیف‌پول، لینک اختصاصی فعال‌سازی به صورت آنی همینجا و در بخش سفارشات تقدیم شما می‌شود.
                </p>
              </div>
            </div>
          </div>

          {/* Last Bought Success Modal / Card */}
          {lastBought && (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-6 sm:p-7 shadow-lg space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-lg shadow-md shadow-emerald-200">
                    <i className="fa-solid fa-circle-check"></i>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-emerald-950">
                      خرید موفق! اشتراک جمنای پرو ۱۸ ماهه صادر گردید
                    </h3>
                    <p className="text-xs text-emerald-800">
                      شماره سفارش: <code className="font-mono font-bold">{lastBought.orderId}</code>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setLastBought(null)}
                  className="text-slate-400 hover:text-slate-700 text-xs px-2.5 py-1 rounded-lg hover:bg-emerald-100/50"
                >
                  بستن این پیام
                </button>
              </div>

              {/* Link Display Box */}
              <div className="bg-white border border-emerald-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                  <span>لینک اختصاصی دعوت / فعال‌سازی:</span>
                  <span className="text-[11px] text-emerald-700">۱ بار مصرف و اختصاصی</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl font-mono text-xs text-slate-800 truncate dir-ltr select-all">
                    {lastBought.inviteLink}
                  </div>
                  <button
                    onClick={() => copyToClipboard(lastBought.inviteLink, 'لینک فعال‌سازی کپی گردید!')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <i className="fa-regular fa-copy"></i>
                    کپی لینک
                  </button>
                  <a
                    href={lastBought.inviteLink}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-200 whitespace-nowrap"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square"></i>
                    ورود به لینک فعال‌سازی
                  </a>
                </div>

                {lastBought.instructions && (
                  <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200/80 p-3 rounded-xl flex items-start gap-2 leading-relaxed">
                    <i className="fa-solid fa-circle-info text-amber-600 mt-0.5"></i>
                    <span>{lastBought.instructions}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* User's Previous Orders */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-violet-600"></i>
                <h3 className="font-extrabold text-sm text-slate-800">
                  سوابق خریدهای اکانت جمنای پرو من
                </h3>
              </div>
              <button
                onClick={fetchMyOrders}
                disabled={loadingOrders}
                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <i className={`fa-solid fa-rotate-right ${loadingOrders ? 'fa-spin' : ''}`}></i>
                <span>به‌روزرسانی</span>
              </button>
            </div>

            {loadingOrders ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                <i className="fa-solid fa-spinner fa-spin text-lg text-violet-600 mb-2 block"></i>
                در حال دریافت سوابق خریدهای شما...
              </div>
            ) : myOrders.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <i className="fa-solid fa-folder-open text-2xl text-slate-300 mb-2 block"></i>
                هنوز هیچ اشتراک جمنای پرو توسط شما ثبت نشده است.
              </div>
            ) : (
              <div className="space-y-3">
                {myOrders.map((order, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition space-y-3"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-800">{order.planName}</span>
                        <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                          {order.orderId}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500">
                        <span>{new Date(order.createdAt).toLocaleDateString('fa-IR')}</span>
                        <span className="font-black text-emerald-600 dir-ltr">
                          ${order.priceUsd?.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <div className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-xl font-mono text-xs text-slate-800 truncate dir-ltr select-all">
                        {order.inviteLink}
                      </div>
                      <button
                        onClick={() => copyToClipboard(order.inviteLink)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <i className="fa-regular fa-copy"></i>
                        کپی
                      </button>
                      <a
                        href={order.inviteLink}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square"></i>
                        ورود به لینک
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ADMIN MANAGEMENT TAB */}
      {/* ======================================================== */}
      {subTab === 'admin' && user?.isAdmin && (
        <div className="space-y-6">
          {/* Admin Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block font-medium">موجودی آماده تحویل:</span>
                <span className="text-2xl font-black text-emerald-600">
                  {adminStats?.availableCount || 0}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">لینک فعال در انبار</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
                <i className="fa-solid fa-box-open"></i>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block font-medium">تعداد کل فروخته‌شده:</span>
                <span className="text-2xl font-black text-violet-600">
                  {adminStats?.soldCount || 0}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">اشتراک تحویل شده</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center text-xl">
                <i className="fa-solid fa-badge-check"></i>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block font-medium">کل ورودی انبار:</span>
                <span className="text-2xl font-black text-slate-800">
                  {adminStats?.totalCount || 0}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">لینک ثبت شده</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center text-xl">
                <i className="fa-solid fa-boxes-stacked"></i>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block font-medium">قیمت فعلی فروش:</span>
                <span className="text-2xl font-black text-slate-900 dir-ltr">
                  ${adminStats?.priceUsd?.toFixed(2) || '12.00'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">برای ۱۸ ماه</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
                <i className="fa-solid fa-tags"></i>
              </div>
            </div>
          </div>

          {/* Pricing & Instructions Editor */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800 border-b border-slate-100 pb-3">
              <i className="fa-solid fa-sliders text-violet-600"></i>
              <span>تنظیمات قیمت و راهنمای تحویل به مشتری</span>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    قیمت فروش پلن ۱۸ ماهه (دلار):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-violet-500 text-left dir-ltr"
                      placeholder="12.0"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    راهنمای فعال‌سازی (که همراه لینک به کاربر نمایش داده می‌شود):
                  </label>
                  <input
                    type="text"
                    value={instructionsInput}
                    onChange={(e) => setInstructionsInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-violet-500"
                    placeholder="روی لینک فعال‌سازی کلیک کرده و با اکانت جیمیل خود وارد شوید..."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition flex items-center gap-2 cursor-pointer shadow-sm shadow-violet-200"
                >
                  <i className={`fa-solid ${savingSettings ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>
                  <span>{savingSettings ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Bulk Add Links to Inventory */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800 border-b border-slate-100 pb-3">
              <i className="fa-solid fa-plus-circle text-emerald-600"></i>
              <span>افزودن لینک‌های فعال‌سازی به انبار جمنای</span>
            </div>

            <form onSubmit={handleAddLinks} className="space-y-3">
              <p className="text-xs text-slate-500">
                لینک‌های اختصاصی یا دعوت‌نامه‌های Google One را در کادر زیر وارد کنید (هر سطر یک لینک):
              </p>

              <textarea
                rows={5}
                value={rawLinksInput}
                onChange={(e) => setRawLinksInput(e.target.value)}
                placeholder="https://one.google.com/invitation/...\nhttps://one.google.com/invitation/..."
                className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500 dir-ltr text-left"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  تعداد سطرهای واردشده: {rawLinksInput.split('\n').filter(l => l.trim()).length} لینک
                </span>
                <button
                  type="submit"
                  disabled={addingLinks || !rawLinksInput.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition flex items-center gap-2 cursor-pointer shadow-sm shadow-emerald-200"
                >
                  <i className={`fa-solid ${addingLinks ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'}`}></i>
                  <span>{addingLinks ? 'در حال ثبت در دیتابیس...' : 'افزودن به انبار لینک‌ها'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-table-list text-slate-600"></i>
                <h3 className="font-extrabold text-sm text-slate-800">
                  لیست کلی لینک‌های انبار جمنای
                </h3>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setLinkFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition ${
                    linkFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  همه ({adminLinks.length})
                </button>
                <button
                  onClick={() => setLinkFilter('available')}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition ${
                    linkFilter === 'available' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  موجود ({adminLinks.filter(l => l.status === 'AVAILABLE').length})
                </button>
                <button
                  onClick={() => setLinkFilter('sold')}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition ${
                    linkFilter === 'sold' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  فروخته‌شده ({adminLinks.filter(l => l.status === 'SOLD').length})
                </button>
              </div>
            </div>

            {loadingAdmin ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                <i className="fa-solid fa-spinner fa-spin text-base text-violet-600 mb-2 block"></i>
                در حال بارگذاری لیست انبار...
              </div>
            ) : filteredLinks.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl">
                هیچ لینکی در این بخش یافت نشد.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">لینک فعال‌سازی</th>
                      <th className="py-2.5 px-3">وضعیت</th>
                      <th className="py-2.5 px-3">خریدار</th>
                      <th className="py-2.5 px-3">شماره سفارش</th>
                      <th className="py-2.5 px-3">تاریخ فروش</th>
                      <th className="py-2.5 px-3 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLinks.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3 text-slate-400 font-mono">{item.id}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-800 max-w-xs truncate dir-ltr text-left">
                          {item.inviteLink}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'AVAILABLE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-violet-50 text-violet-700 border border-violet-200'
                          }`}>
                            {item.status === 'AVAILABLE' ? 'آماده فروش' : 'فروخته‌شده'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono">
                          {item.buyerEmail || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                          {item.orderId || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {item.soldAt ? new Date(item.soldAt).toLocaleDateString('fa-IR') : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.status === 'AVAILABLE' ? (
                            <button
                              onClick={() => handleDeleteLink(item.id)}
                              className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="حذف از انبار"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
