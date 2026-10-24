import React, { useState, useEffect } from 'react';

export default function WindscribeShop({
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
  const [showPasswords, setShowPasswords] = useState({});

  // Admin State
  const [adminStats, setAdminStats] = useState(null);
  const [adminAccounts, setAdminAccounts] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [priceInput, setPriceInput] = useState('4.0');
  const [savingPrice, setSavingPrice] = useState(false);
  const [rawAccountsInput, setRawAccountsInput] = useState('');
  const [addingAccounts, setAddingAccounts] = useState(false);
  const [accountFilter, setAccountFilter] = useState('all'); // 'all', 'available', 'sold'

  const token = localStorage.getItem('token');
  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  // 1. Fetch Plan Info
  const fetchPlan = async () => {
    try {
      setLoadingPlan(true);
      const res = await fetch('/api/windscribe/plan');
      const data = await res.json();
      if (data.success && data.plan) {
        setPlan(data.plan);
        setPriceInput(data.plan.priceUsd?.toString() || '4.0');
      }
    } catch (e) {
      console.error('Fetch plan error:', e);
    } finally {
      setLoadingPlan(false);
    }
  };

  // 2. Fetch User Orders
  const fetchMyOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await fetch('/api/windscribe/my-orders', { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setMyOrders(data.orders || []);
      }
    } catch (e) {
      console.error('Fetch orders error:', e);
    } finally {
      setLoadingOrders(false);
    }
  };

  // 3. Fetch Admin Inventory
  const fetchAdminInventory = async () => {
    if (!user?.isAdmin) return;
    try {
      setLoadingAdmin(true);
      const res = await fetch('/api/windscribe/admin/inventory', { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setAdminStats(data.stats);
        setAdminAccounts(data.accounts || []);
        if (data.stats?.priceUsd) {
          setPriceInput(data.stats.priceUsd.toString());
        }
      }
    } catch (e) {
      console.error('Fetch admin inventory error:', e);
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
      onShowToast(`موجودی کیف پول شما کافی نیست. لطفا ابتدا حداقل $${plan.priceUsd} حساب خود را شارژ کنید.`, 'error');
      if (onOpenWallet) onOpenWallet();
      return;
    }

    if (plan.availableCount <= 0) {
      onShowToast('موجودی انبار اکانت‌ها در حال حاضر به اتمام رسیده است.', 'error');
      return;
    }

    try {
      setBuying(true);
      const res = await fetch('/api/windscribe/buy', {
        method: 'POST',
        headers: authHeaders
      });
      const data = await res.json();
      setBuying(false);

      if (data.success && data.order) {
        setLastBought(data.order);
        onShowToast('اکانت ویندسکرایب با موفقیت تحویل داده شد!', 'success');
        if (onBalanceUpdated && typeof data.newBalance === 'number') {
          onBalanceUpdated(data.newBalance);
        }
        fetchPlan();
        fetchMyOrders();
        if (user?.isAdmin) fetchAdminInventory();
      } else {
        onShowToast(data.message || 'خطا در خرید اکانت', 'error');
      }
    } catch (e) {
      setBuying(false);
      onShowToast('خطا در ارتباط با سرور', 'error');
    }
  };

  // Handle Admin Update Price
  const handleUpdatePrice = async () => {
    const p = parseFloat(priceInput);
    if (isNaN(p) || p <= 0) {
      onShowToast('مبلغ وارد شده معتبر نیست.', 'error');
      return;
    }
    try {
      setSavingPrice(true);
      const res = await fetch('/api/windscribe/admin/price', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ priceUsd: p })
      });
      const data = await res.json();
      setSavingPrice(false);

      if (data.success) {
        onShowToast(data.message, 'success');
        fetchPlan();
        fetchAdminInventory();
      } else {
        onShowToast(data.message || 'خطا در تغییر قیمت', 'error');
      }
    } catch (e) {
      setSavingPrice(false);
      onShowToast('خطا در ارتباط با سرور', 'error');
    }
  };

  // Handle Admin Add Accounts
  const handleAddAccounts = async () => {
    if (!rawAccountsInput.trim()) {
      onShowToast('لطفاً حداقل یک اکانت در کادر وارد کنید.', 'error');
      return;
    }
    try {
      setAddingAccounts(true);
      const res = await fetch('/api/windscribe/admin/add-accounts', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ rawText: rawAccountsInput })
      });
      const data = await res.json();
      setAddingAccounts(false);

      if (data.success) {
        onShowToast(data.message, 'success');
        setRawAccountsInput('');
        fetchPlan();
        fetchAdminInventory();
      } else {
        onShowToast(data.message || 'خطا در افزودن اکانت‌ها', 'error');
      }
    } catch (e) {
      setAddingAccounts(false);
      onShowToast('خطا در ارتباط با سرور', 'error');
    }
  };

  // Handle Admin Delete Account
  const handleDeleteAccount = async (id) => {
    if (!window.confirm('آیا از حذف این اکانت از انبار مطمئن هستید؟')) return;
    try {
      const res = await fetch(`/api/windscribe/admin/account/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(data.message, 'success');
        fetchPlan();
        fetchAdminInventory();
      } else {
        onShowToast(data.message || 'خطا در حذف اکانت', 'error');
      }
    } catch (e) {
      onShowToast('خطا در ارتباط با سرور', 'error');
    }
  };

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    onShowToast(`${label} در کلیپ‌بورد کپی شد.`, 'success');
  };

  const togglePassword = (idx) => {
    setShowPasswords(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const filteredAdminAccounts = adminAccounts.filter(acc => {
    if (accountFilter === 'available') return acc.status === 'AVAILABLE';
    if (accountFilter === 'sold') return acc.status === 'SOLD';
    return true;
  });

  return (
    <div className="space-y-6 dir-rtl">
      {/* Top Banner / Switch for Admin */}
      {user?.isAdmin && (
        <div className="flex gap-2 p-1.5 glass-card rounded-2xl w-full max-w-md mx-auto border border-white/10">
          <button
            onClick={() => setSubTab('shop')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
              subTab === 'shop'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-950/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <i className="fa-solid fa-store"></i>
            <span>فروشگاه و اکانت‌های من</span>
          </button>
          <button
            onClick={() => setSubTab('admin')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
              subTab === 'admin'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-950/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <i className="fa-solid fa-boxes-stacked"></i>
            <span>مدیریت انبار و قیمت (ادمین)</span>
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: SHOP & MY ORDERS */}
      {/* ======================================================== */}
      {subTab === 'shop' && (
        <div className="space-y-6">
          {/* Newly Bought Account Alert Card */}
          {lastBought && (
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">
                    <i className="fa-solid fa-circle-check"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-black">اکانت ویندسکرایب شما با موفقیت صادر شد!</h3>
                    <p className="text-xs text-emerald-100">سفارش شماره: {lastBought.orderId}</p>
                  </div>
                </div>
                <button
                  onClick={() => setLastBought(null)}
                  className="text-white/70 hover:text-white p-1 cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              {/* Credentials Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-emerald-200 block">نام کاربری (Username):</span>
                    <span className="font-mono font-bold text-base select-all dir-ltr">{lastBought.username}</span>
                  </div>
                  <button
                    onClick={() => copyText(lastBought.username, 'نام کاربری')}
                    className="bg-white text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-50 transition cursor-pointer"
                  >
                    کپی
                  </button>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-emerald-200 block">رمز عبور (Password):</span>
                    <span className="font-mono font-bold text-base select-all dir-ltr">{lastBought.password}</span>
                  </div>
                  <button
                    onClick={() => copyText(lastBought.password, 'رمز عبور')}
                    className="bg-white text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-50 transition cursor-pointer"
                  >
                    کپی
                  </button>
                </div>
              </div>

              <div className="text-xs text-emerald-100 pt-1 flex items-center gap-2">
                <i className="fa-solid fa-circle-info"></i>
                <span>کافی است این مشخصات را در نرم‌افزار رسمی Windscribe در موبایل یا کامپیوتر وارد کنید.</span>
              </div>
            </div>
          )}

          {/* Product Hero Card */}
          <div className="bg-gradient-to-br from-[#0a1128] via-[#0d1d4a] to-[#070b19] rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-indigo-500/30">
            {/* Background Decoration */}
            <div className="absolute -left-10 -bottom-10 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute right-10 top-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Info & Features */}
              <div className="lg:col-span-7 space-y-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-13 h-13 bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-xl shadow-indigo-500/30">
                    <i className="fa-solid fa-shield-halved"></i>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase block font-mono">WINDSCRIBE PRO VPN</span>
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-2.5 flex-wrap">
                      <span>{plan?.title || 'اکانت پرمیوم ۱ ماهه ویندسکرایب'}</span>
                      <span className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black px-3 py-1 rounded-full shadow-md animate-pulse">
                        👥 ۱۰ تا ۱۵ کاربر همزمان
                      </span>
                    </h2>
                  </div>
                </div>

                {/* Special Highlight Box: Unlimited 10-15 Users */}
                <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-transparent border border-amber-400/40 rounded-2xl p-4 flex items-center gap-3.5 shadow-inner">
                  <div className="w-11 h-11 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center text-xl flex-shrink-0">
                    <i className="fa-solid fa-users"></i>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-300">
                      ویژگی طلایی: بدون محدودیت کاربر (امکان اتصال همزمان ۱۰ الی ۱۵ نفر)
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      اتصال همزمان ۱۰ تا ۱۵ دستگاه/کاربر بدون محدودیت حجم و بدون افت کیفیت؛ ایده‌آل برای استفاده اشتراکی بین اعضای خانواده، همکاران و گروه‌ها.
                    </p>
                  </div>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">
                  ویندسکرایب یکی از پایدارترین و معتبرترین فیلترشکن‌های جهان با سرورهای پرسرعت ۱۰ گیگابیتی و پروتکل‌های ویژه عبور از فیلترینگ است. اکانت به صورت ۱۰۰٪ قانونی با تحویل آنی نام‌کاربری و رمزعبور صادر می‌شود.
                </p>

                {/* Features List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {(plan?.features || [
                    'ترافیک کاملاً نامحدود و پرسرعت',
                    'دسترسی به معتبرترین لوکیشن‌های ثابت',
                    'پشتیبانی در ویندوز، اندروید، iOS، مک',
                    'پروتکل‌های ضد فیلتر WireGuard, Stealth, Wstunnel',
                    'پینگ فوق‌العاده پایین برای ترید و وب‌گردی'
                  ]).map((feat, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-200">
                      <i className="fa-solid fa-check text-emerald-400 text-xs"></i>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Pricing & Buy Action */}
              <div className="lg:col-span-5 bg-slate-950/70 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl space-y-5">
                {/* Stock Indicator */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
                  <span className="text-slate-400">وضعیت موجودی انبار:</span>
                  {loadingPlan ? (
                    <span className="text-slate-400">در حال استعلام...</span>
                  ) : plan?.availableCount > 0 ? (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-950/50">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      موجود در انبار ({plan.availableCount} عدد)
                    </span>
                  ) : (
                    <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full font-bold">
                      اتمام موجودی انبار
                    </span>
                  )}
                </div>

                {/* Price Display */}
                <div className="text-center py-2 space-y-1">
                  <div className="text-xs text-slate-400 font-medium">قیمت پلن ماهانه نامحدود:</div>
                  <div className="text-4xl font-black text-white dir-ltr font-mono">
                    $ {plan?.priceUsd?.toFixed(2) || '4.00'}
                  </div>
                  <div className="text-xs text-slate-300 font-medium pt-1">
                    معادل حدود{' '}
                    <span className="font-black text-cyan-300 text-sm font-mono">
                      {plan?.priceToman ? plan.priceToman.toLocaleString() : '---'}
                    </span>{' '}
                    تومان
                  </div>
                </div>

                {/* User Balance Check */}
                <div className="bg-white/5 p-3 rounded-xl flex items-center justify-between text-xs border border-white/5">
                  <span className="text-slate-400">موجودی کیف‌پول شما:</span>
                  <span className="font-bold text-emerald-400 dir-ltr text-sm font-mono">
                    $ {typeof balance === 'number' ? balance.toFixed(2) : '0.00'}
                  </span>
                </div>

                {/* Buy Button */}
                {plan?.availableCount > 0 ? (
                  balance >= (plan?.priceUsd || 4.0) ? (
                    <button
                      onClick={handleBuy}
                      disabled={buying}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black py-3.5 rounded-2xl transition shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      <i className={`fa-solid ${buying ? 'fa-spinner fa-spin' : 'fa-bolt'}`}></i>
                      <span>{buying ? 'در حال صدور اکانت...' : 'خرید و تحویل آنی اکانت'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={onOpenWallet}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-3.5 rounded-2xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      <i className="fa-solid fa-wallet"></i>
                      <span>موجودی ناکافی - افزایش موجودی</span>
                    </button>
                  )
                ) : (
                  <button
                    disabled
                    className="w-full bg-slate-900 text-slate-500 font-bold py-3.5 rounded-2xl cursor-not-allowed text-sm border border-white/5"
                  >
                    موجودی انبار به اتمام رسیده است
                  </button>
                )}

                {/* Telegram Bot CTA */}
                <div className="pt-2 border-t border-white/10 text-center">
                  <a
                    href="https://t.me/onstagh_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 text-xs text-sky-300 hover:text-white transition py-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/25 rounded-xl px-3 w-full font-bold"
                  >
                    <i className="fa-brands fa-telegram text-sky-400 text-sm"></i>
                    <span>خرید مستقیم در تلگرام: <b>@onstagh_bot</b></span>
                    <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Section: My Purchased Accounts */}
          <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <i className="fa-solid fa-key text-indigo-400 text-lg"></i>
                <h3 className="font-bold text-white text-base">اکانت‌های خریداری‌شده من</h3>
              </div>
              <span className="text-xs bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-bold">
                {myOrders.length} اکانت فعال
              </span>
            </div>

            {loadingOrders ? (
              <div className="text-center py-8 text-slate-400 text-xs flex items-center justify-center gap-2">
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>در حال بارگذاری اکانت‌ها...</span>
              </div>
            ) : myOrders.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs space-y-2">
                <i className="fa-solid fa-box-open text-3xl text-slate-600"></i>
                <p>شما هنوز هیچ اکانت ویندسکرایبی خریداری نکرده‌اید.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myOrders.map((ord, idx) => {
                  const showPass = showPasswords[idx];
                  return (
                    <div
                      key={ord.orderId || idx}
                      className="glass-card border border-white/5 rounded-2xl p-4 space-y-3 hover:border-indigo-500/40 transition-all"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-400/30 px-2.5 py-0.5 rounded-lg">
                          {ord.planName || 'ویندسکرایب ۱ ماهه'}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px] dir-ltr">
                          {ord.createdAt?.slice(0, 16)}
                        </span>
                      </div>

                      {/* Username Row */}
                      <div className="bg-slate-950/80 p-3 rounded-xl border border-white/10 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-mono">USERNAME:</span>
                          <span className="font-mono font-black text-white dir-ltr select-all text-sm tracking-wide">
                            {ord.username}
                          </span>
                        </div>
                        <button
                          onClick={() => copyText(ord.username, 'نام کاربری')}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                          title="کپی نام کاربری"
                        >
                          کپی
                        </button>
                      </div>

                      {/* Password Row */}
                      <div className="bg-slate-950/80 p-3 rounded-xl border border-white/10 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-mono">PASSWORD:</span>
                          <span className="font-mono font-black text-white dir-ltr select-all text-sm tracking-wide">
                            {showPass ? ord.password : '••••••••••••'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => togglePassword(idx)}
                            className="text-slate-400 hover:text-white p-1.5 cursor-pointer rounded-lg hover:bg-white/5"
                            title={showPass ? 'مخفی کردن' : 'نمایش'}
                          >
                            <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                          </button>
                          <button
                            onClick={() => copyText(ord.password, 'رمز عبور')}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                            title="کپی رمز عبور"
                          >
                            کپی
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
                        <span>مبلغ: ${ord.priceUsd?.toFixed(2)}</span>
                        <span className="font-mono text-cyan-400">{ord.orderId}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ADMIN INVENTORY & PRICE MANAGEMENT */}
      {/* ======================================================== */}
      {subTab === 'admin' && user?.isAdmin && (
        <div className="space-y-6">
          {/* Admin Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel rounded-2xl p-4 border border-white/10 shadow-lg text-center backdrop-blur-md">
              <span className="text-xs text-slate-400 block mb-1">موجود در انبار</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {adminStats?.availableCount || 0}
              </span>
            </div>
            <div className="glass-panel rounded-2xl p-4 border border-white/10 shadow-lg text-center backdrop-blur-md">
              <span className="text-xs text-slate-400 block mb-1">فروخته شده</span>
              <span className="text-2xl font-black text-cyan-400 font-mono">
                {adminStats?.soldCount || 0}
              </span>
            </div>
            <div className="glass-panel rounded-2xl p-4 border border-white/10 shadow-lg text-center backdrop-blur-md">
              <span className="text-xs text-slate-400 block mb-1">کل اکانت‌های ثبت‌شده</span>
              <span className="text-2xl font-black text-white font-mono">
                {adminStats?.totalCount || 0}
              </span>
            </div>
            <div className="glass-panel rounded-2xl p-4 border border-white/10 shadow-lg text-center backdrop-blur-md">
              <span className="text-xs text-slate-400 block mb-1">قیمت فعلی پلن</span>
              <span className="text-2xl font-black text-amber-400 font-mono dir-ltr">
                $ {adminStats?.priceUsd?.toFixed(2) || '4.00'}
              </span>
            </div>
          </div>

          {/* Pricing Config Card */}
          <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/10 shadow-lg space-y-4 backdrop-blur-md">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <i className="fa-solid fa-tag text-cyan-400"></i>
              <span>تنظیم قیمت دلاری پلن ماهانه ویندسکرایب:</span>
            </h4>
            <div className="flex items-center gap-3 max-w-md">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="w-full bg-slate-900/90 border border-white/15 rounded-xl p-3 pr-8 font-bold text-white focus:outline-none focus:border-cyan-400 dir-ltr text-center font-mono shadow-inner transition"
                />
                <span className="absolute left-3 top-3.5 text-slate-400 font-bold text-sm">$</span>
              </div>
              <button
                onClick={handleUpdatePrice}
                disabled={savingPrice}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-6 py-3 rounded-xl transition text-xs shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
              >
                {savingPrice ? 'در حال ثبت...' : 'ذخیره قیمت'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              این قیمت مستقیماً برای خریداران اعمال شده و معادل تومانی آن نیز بر اساس نرخ لحظه‌ای والکس محاسبه می‌گردد.
            </p>
          </div>

          {/* Add Accounts (Bulk / Single) Card */}
          <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/10 shadow-lg space-y-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <i className="fa-solid fa-plus-circle text-emerald-400"></i>
                <span>افزودن اکانت‌های جدید به انبار (تکی یا دسته‌ای):</span>
              </h4>
              <span className="text-xs text-slate-400 font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">username:password</span>
            </div>

            <textarea
              rows="5"
              placeholder={`user1:pass123\nuser2:pass456\nuser3:pass789`}
              value={rawAccountsInput}
              onChange={(e) => setRawAccountsInput(e.target.value)}
              className="w-full bg-slate-900/90 border border-white/15 rounded-xl p-3.5 text-xs font-mono text-emerald-300 placeholder-slate-600 focus:outline-none focus:border-emerald-400 dir-ltr shadow-inner transition"
            ></textarea>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-[11px] text-slate-400">
                می‌توانید لیست ده‌ها اکانت را یکجا کپی و پیست کنید. سیستم به صورت خودکار آنها را تفکیک و در دیتابیس امن ذخیره می‌کند.
              </p>
              <button
                onClick={handleAddAccounts}
                disabled={addingAccounts}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold px-6 py-2.5 rounded-xl transition text-xs shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-2 shrink-0 disabled:opacity-50"
              >
                <i className={`fa-solid ${addingAccounts ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
                <span>{addingAccounts ? 'در حال افزودن...' : 'افزودن به انبار'}</span>
              </button>
            </div>
          </div>

          {/* Accounts Table in Inventory */}
          <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/10 shadow-lg space-y-4 backdrop-blur-md">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <i className="fa-solid fa-list-check text-cyan-400"></i>
                <span>لیست اکانت‌های انبار ({filteredAdminAccounts.length} مورد)</span>
              </h4>

              {/* Filters */}
              <div className="flex items-center gap-1.5 bg-slate-900/80 border border-white/10 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setAccountFilter('all')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    accountFilter === 'all' ? 'bg-white/15 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  همه ({adminAccounts.length})
                </button>
                <button
                  onClick={() => setAccountFilter('available')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    accountFilter === 'available' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-emerald-400'
                  }`}
                >
                  موجود ({adminStats?.availableCount || 0})
                </button>
                <button
                  onClick={() => setAccountFilter('sold')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    accountFilter === 'sold' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-cyan-400'
                  }`}
                >
                  فروخته شده ({adminStats?.soldCount || 0})
                </button>
              </div>
            </div>

            {loadingAdmin ? (
              <div className="text-center py-8 text-xs text-slate-400">
                <i className="fa-solid fa-circle-notch fa-spin text-cyan-400 text-lg mb-2 block"></i>
                در حال بارگذاری انبار...
              </div>
            ) : filteredAdminAccounts.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 bg-white/5 rounded-xl border border-white/5">
                اکانتی یافت نشد.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-slate-900/90 text-slate-400 font-bold">
                      <th className="py-3 px-3">شناسه</th>
                      <th className="py-3 px-3">نام‌کاربری</th>
                      <th className="py-3 px-3">رمزعبور</th>
                      <th className="py-3 px-3">وضعیت</th>
                      <th className="py-3 px-3">تاریخ ثبت</th>
                      <th className="py-3 px-3">خریدار</th>
                      <th className="py-3 px-3 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium bg-slate-900/40">
                    {filteredAdminAccounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-white/5 transition">
                        <td className="py-3 px-3 font-mono text-slate-400">#{acc.id}</td>
                        <td className="py-3 px-3 font-mono font-bold text-white dir-ltr text-right select-all">
                          {acc.username}
                        </td>
                        <td className="py-3 px-3 font-mono text-cyan-300 dir-ltr text-right select-all">
                          {acc.password}
                        </td>
                        <td className="py-3 px-3">
                          {acc.status === 'AVAILABLE' ? (
                            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                              آماده فروش
                            </span>
                          ) : (
                            <span className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                              فروخته شد
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px] dir-ltr text-right">
                          {acc.createdAt?.slice(0, 16)}
                        </td>
                        <td className="py-3 px-3 text-slate-300 text-[11px]">
                          {acc.buyerEmail || '---'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {acc.status === 'AVAILABLE' ? (
                            <button
                              onClick={() => handleDeleteAccount(acc.id)}
                              className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer transition"
                              title="حذف از انبار"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          ) : (
                            <span className="text-slate-500">---</span>
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
