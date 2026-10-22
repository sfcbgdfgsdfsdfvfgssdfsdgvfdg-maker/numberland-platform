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
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-full max-w-md mx-auto">
          <button
            onClick={() => setSubTab('shop')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
              subTab === 'shop'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <i className="fa-solid fa-store"></i>
            <span>فروشگاه و اکانت‌های من</span>
          </button>
          <button
            onClick={() => setSubTab('admin')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
              subTab === 'admin'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
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
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-indigo-900/50">
            {/* Background Decoration */}
            <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute right-10 top-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Info & Features */}
              <div className="lg:col-span-7 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-tr from-sky-400 to-indigo-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-indigo-500/30">
                    <i className="fa-solid fa-shield-halved"></i>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-sky-400 tracking-wider uppercase block">Windscribe Pro VPN</span>
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-2.5 flex-wrap">
                      <span>{plan?.title || 'اکانت پرمیوم ۱ ماهه ویندسکرایب'}</span>
                      <span className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black px-3 py-1 rounded-full shadow-md animate-pulse">
                        👥 ۱۰ تا ۱۵ کاربر همزمان
                      </span>
                    </h2>
                  </div>
                </div>

                {/* Special Highlight Box: Unlimited 10-15 Users */}
                <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 border border-amber-400/30 rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center text-xl flex-shrink-0">
                    <i className="fa-solid fa-users"></i>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-300">
                      مزیت ویژه: بدون محدودیت کاربر (اتصال همزمان ۱۰ الی ۱۵ نفر)
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      امکان اتصال همزمان ۱۰ تا ۱۵ دستگاه/کاربر بدون محدودیت و بدون افت کیفیت، مناسب برای خانواده، همکاران و اکیپ‌ها.
                    </p>
                  </div>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">
                  ویندسکرایب یکی از قدرتمندترین و پایدارترین فیلترشکن‌های جهان با سرورهای پرسرعت ۱۰ گیگابیتی و پروتکل‌های ویژه عبور از فیلترینگ است. اکانت به صورت کاملاً قانونی با تحویل آنی نام‌کاربری و رمزعبور ارائه می‌شود.
                </p>

                {/* Features List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {(plan?.features || [
                    'ترافیک کاملاً نامحدود و پرسرعت',
                    'دسترسی به معتبرترین ریجن‌ها',
                    'پشتیبانی در ویندوز، اندروید، iOS، مک',
                    'پروتکل‌های ضد فیلتر Stealth و Wstunnel',
                    'بدون قطعی و مناسب برای وب‌گردی و گیمینگ'
                  ]).map((feat, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-200">
                      <i className="fa-solid fa-check text-emerald-400"></i>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Pricing & Buy Action */}
              <div className="lg:col-span-5 bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 space-y-5">
                {/* Stock Indicator */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
                  <span className="text-slate-400">وضعیت انبار:</span>
                  {loadingPlan ? (
                    <span className="text-slate-400">در حال استعلام...</span>
                  ) : plan?.availableCount > 0 ? (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
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
                  <div className="text-xs text-slate-400">قیمت پلن ماهانه نامحدود:</div>
                  <div className="text-4xl font-black text-white dir-ltr">
                    $ {plan?.priceUsd?.toFixed(2) || '4.00'}
                  </div>
                  <div className="text-xs text-slate-300 font-medium pt-1">
                    معادل حدود{' '}
                    <span className="font-bold text-white text-sm font-mono">
                      {plan?.priceToman ? plan.priceToman.toLocaleString() : '---'}
                    </span>{' '}
                    تومان
                  </div>
                </div>

                {/* User Balance Check */}
                <div className="bg-white/5 p-3 rounded-xl flex items-center justify-between text-xs border border-white/5">
                  <span className="text-slate-400">موجودی کیف‌پول شما:</span>
                  <span className="font-bold text-emerald-400 dir-ltr text-sm">
                    $ {typeof balance === 'number' ? balance.toFixed(2) : '0.00'}
                  </span>
                </div>

                {/* Buy Button */}
                {plan?.availableCount > 0 ? (
                  balance >= (plan?.priceUsd || 4.0) ? (
                    <button
                      onClick={handleBuy}
                      disabled={buying}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      <i className={`fa-solid ${buying ? 'fa-spinner fa-spin' : 'fa-bolt'}`}></i>
                      <span>{buying ? 'در حال صدور اکانت...' : 'خرید و تحویل آنی اکانت'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={onOpenWallet}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      <i className="fa-solid fa-wallet"></i>
                      <span>موجودی ناکافی - شارژ حساب</span>
                    </button>
                  )
                ) : (
                  <button
                    disabled
                    className="w-full bg-slate-800 text-slate-500 font-bold py-3.5 rounded-xl cursor-not-allowed text-sm"
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
                    className="inline-flex items-center justify-center gap-2 text-xs text-sky-300 hover:text-white transition py-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/20 rounded-xl px-3 w-full"
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
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <i className="fa-solid fa-key text-indigo-600 text-lg"></i>
                <h3 className="font-bold text-slate-900 text-base">اکانت‌های خریداری‌شده من</h3>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">
                {myOrders.length} اکانت
              </span>
            </div>

            {loadingOrders ? (
              <div className="text-center py-8 text-slate-400 text-xs flex items-center justify-center gap-2">
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>در حال بارگذاری اکانت‌ها...</span>
              </div>
            ) : myOrders.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs space-y-2">
                <i className="fa-solid fa-box-open text-3xl text-slate-300"></i>
                <p>شما هنوز هیچ اکانت ویندسکرایبی خریداری نکرده‌اید.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myOrders.map((ord, idx) => {
                  const showPass = showPasswords[idx];
                  return (
                    <div
                      key={ord.orderId || idx}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 hover:border-indigo-300 transition"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg">
                          {ord.planName || 'ویندسکرایب ۱ ماهه'}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px] dir-ltr">
                          {ord.createdAt?.slice(0, 16)}
                        </span>
                      </div>

                      {/* Username Row */}
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">نام کاربری:</span>
                          <span className="font-mono font-bold text-slate-800 dir-ltr select-all">
                            {ord.username}
                          </span>
                        </div>
                        <button
                          onClick={() => copyText(ord.username, 'نام کاربری')}
                          className="text-slate-500 hover:text-indigo-600 p-1.5 cursor-pointer"
                          title="کپی نام کاربری"
                        >
                          <i className="fa-regular fa-copy text-sm"></i>
                        </button>
                      </div>

                      {/* Password Row */}
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">رمز عبور:</span>
                          <span className="font-mono font-bold text-slate-800 dir-ltr select-all">
                            {showPass ? ord.password : '••••••••••••'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => togglePassword(idx)}
                            className="text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer"
                            title={showPass ? 'مخفی کردن' : 'نمایش'}
                          >
                            <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                          </button>
                          <button
                            onClick={() => copyText(ord.password, 'رمز عبور')}
                            className="text-slate-500 hover:text-indigo-600 p-1.5 cursor-pointer"
                            title="کپی رمز عبور"
                          >
                            <i className="fa-regular fa-copy text-sm"></i>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>هزینه پرداختی: ${ord.priceUsd?.toFixed(2)}</span>
                        <span className="font-mono">{ord.orderId}</span>
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
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center">
              <span className="text-xs text-slate-400 block mb-1">موجود در انبار</span>
              <span className="text-2xl font-black text-emerald-600">
                {adminStats?.availableCount || 0}
              </span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center">
              <span className="text-xs text-slate-400 block mb-1">فروخته شده</span>
              <span className="text-2xl font-black text-indigo-600">
                {adminStats?.soldCount || 0}
              </span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center">
              <span className="text-xs text-slate-400 block mb-1">کل اکانت‌های ثبت‌شده</span>
              <span className="text-2xl font-black text-slate-800">
                {adminStats?.totalCount || 0}
              </span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center">
              <span className="text-xs text-slate-400 block mb-1">قیمت فعلی پلن</span>
              <span className="text-2xl font-black text-amber-600 dir-ltr">
                $ {adminStats?.priceUsd?.toFixed(2) || '4.00'}
              </span>
            </div>
          </div>

          {/* Pricing Config Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <i className="fa-solid fa-tag text-indigo-600"></i>
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
                  className="w-full border border-slate-200 rounded-xl p-3 pr-8 font-bold text-slate-800 focus:outline-none focus:border-indigo-500 dir-ltr text-center"
                />
                <span className="absolute left-3 top-3.5 text-slate-400 font-bold text-sm">$</span>
              </div>
              <button
                onClick={handleUpdatePrice}
                disabled={savingPrice}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl transition text-xs shadow-md cursor-pointer"
              >
                {savingPrice ? 'در حال ثبت...' : 'ذخیره قیمت'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              این قیمت مستقیماً برای خریداران اعمال شده و معادل تومانی آن نیز بر اساس نرخ روز محاسبه می‌گردد.
            </p>
          </div>

          {/* Add Accounts (Bulk / Single) Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <i className="fa-solid fa-plus-circle text-emerald-600"></i>
                <span>افزودن اکانت‌های جدید به انبار (تکی یا دسته‌ای):</span>
              </h4>
              <span className="text-xs text-slate-400">فرمت: username:password در هر خط</span>
            </div>

            <textarea
              rows="5"
              placeholder={`user1:pass123\nuser2:pass456\nuser3:pass789`}
              value={rawAccountsInput}
              onChange={(e) => setRawAccountsInput(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-emerald-500 dir-ltr"
            ></textarea>

            <div className="flex items-center justify-between">
              <p className="text-[11px] text-slate-500">
                می‌توانید لیست ده‌ها اکانت را یکجا کپی و پیست کنید. سیستم به صورت خودکار آنها را تفکیک و در انبار ذخیره می‌کند.
              </p>
              <button
                onClick={handleAddAccounts}
                disabled={addingAccounts}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl transition text-xs shadow-md cursor-pointer flex items-center gap-2"
              >
                <i className={`fa-solid ${addingAccounts ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
                <span>{addingAccounts ? 'در حال افزودن...' : 'افزودن به انبار'}</span>
              </button>
            </div>
          </div>

          {/* Accounts Table in Inventory */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <i className="fa-solid fa-list-check text-slate-600"></i>
                <span>لیست اکانت‌های انبار ({filteredAdminAccounts.length} مورد)</span>
              </h4>

              {/* Filters */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setAccountFilter('all')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    accountFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  همه ({adminAccounts.length})
                </button>
                <button
                  onClick={() => setAccountFilter('available')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    accountFilter === 'available' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  موجود ({adminStats?.availableCount || 0})
                </button>
                <button
                  onClick={() => setAccountFilter('sold')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    accountFilter === 'sold' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  فروخته شده ({adminStats?.soldCount || 0})
                </button>
              </div>
            </div>

            {loadingAdmin ? (
              <div className="text-center py-8 text-xs text-slate-400">در حال بارگذاری انبار...</div>
            ) : filteredAdminAccounts.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">اکانتی یافت نشد.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold">
                      <th className="py-2.5 px-3">شناسه</th>
                      <th className="py-2.5 px-3">نام‌کاربری</th>
                      <th className="py-2.5 px-3">رمزعبور</th>
                      <th className="py-2.5 px-3">وضعیت</th>
                      <th className="py-2.5 px-3">تاریخ ثبت</th>
                      <th className="py-2.5 px-3">خریدار</th>
                      <th className="py-2.5 px-3 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {filteredAdminAccounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-3 font-mono text-slate-400">#{acc.id}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800 dir-ltr text-right select-all">
                          {acc.username}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dir-ltr text-right select-all">
                          {acc.password}
                        </td>
                        <td className="py-3 px-3">
                          {acc.status === 'AVAILABLE' ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                              آماده فروش
                            </span>
                          ) : (
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                              فروخته شد
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px] dir-ltr text-right">
                          {acc.createdAt?.slice(0, 16)}
                        </td>
                        <td className="py-3 px-3 text-slate-600 text-[11px]">
                          {acc.buyerEmail || '---'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {acc.status === 'AVAILABLE' ? (
                            <button
                              onClick={() => handleDeleteAccount(acc.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition"
                              title="حذف از انبار"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          ) : (
                            <span className="text-slate-300">---</span>
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
