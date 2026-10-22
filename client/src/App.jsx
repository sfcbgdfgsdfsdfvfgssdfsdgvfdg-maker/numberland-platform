import React, { useState, useEffect, createContext, useContext } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ServiceSelector from './components/ServiceSelector';
import OperatorList from './components/OperatorList';
import ActiveNumbers from './components/ActiveNumbers';
import WalletModal from './components/WalletModal';
import TransactionsHistory from './components/TransactionsHistory';
import ArchitectureGuide from './components/ArchitectureGuide';
import ProvidersPanel from './components/ProvidersPanel';
import ProviderBadge from './components/ProviderBadge';
import WindscribeShop from './components/WindscribeShop';
import GeminiShop from './components/GeminiShop';
import AdminCardManagement from './components/AdminCardManagement';
import './App.css';

// Auth Context
const AuthContext = createContext(null);

function useAuth() {
  return useContext(AuthContext);
}

// Helper: API call with auth
async function apiCall(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };
  
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  
  if (res.status === 401 && !url.includes('/api/auth/login') && !url.includes('/api/auth/register')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
    return data;
  }
  
  return data;
}

// ====== LOGIN/REGISTER PAGE ======
function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '507287937639-7ts7jf95n8ttsk53mg7o7f4gboivqefk.apps.googleusercontent.com';

  const handleGoogleLogin = () => {
    if (!window.google?.accounts?.oauth2) {
      setError('سرویس گوگل در حال بارگذاری است. لطفاً چند لحظه دیگر امتحان کنید یا صفحه را رفرش فرمایید.');
      return;
    }
    setGoogleLoading(true);
    setError('');

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setGoogleLoading(false);
            if (tokenResponse.error !== 'popup_closed_by_user') {
              setError('خطا در ورود با گوگل: ' + tokenResponse.error);
            }
            return;
          }

          if (tokenResponse.access_token) {
            try {
              const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });
              const profile = await userinfoRes.json();

              const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  googleId: profile.sub || profile.id,
                  email: profile.email,
                  name: profile.name || profile.given_name,
                  picture: profile.picture,
                  accessToken: tokenResponse.access_token
                }),
              });
              const data = await res.json();
              setGoogleLoading(false);

              if (data.success && data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                onLogin(data.user, data.token);
              } else {
                setError(data.message || 'خطا در ثبت اطلاعات حساب گوگل');
              }
            } catch (err) {
              setGoogleLoading(false);
              setError('خطا در ارتباط با سرور هنگام ورود با گوگل');
            }
          } else {
            setGoogleLoading(false);
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      setGoogleLoading(false);
      setError('خطا در فراخوانی سرویس گوگل: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin 
        ? { email, password }
        : { email, password, fullName };

      const data = await apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user, data.token);
      } else {
        setError(data.message || 'خطا رخ داد');
      }
    } catch (e) {
      setError('خطا در ارتباط با سرور');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-mobile-screen text-white text-2xl"></i>
          </div>
          <h1 className="text-2xl font-black text-slate-800">سیمجت</h1>
          <p className="text-sm text-slate-500 mt-1">سامانه شماره مجازی</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${
              isLogin ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            ورود
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${
              !isLogin ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            ثبت‌نام
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-xs text-slate-500 block mb-1">نام و نام خانوادگی</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 transition"
                placeholder="علی محمدی"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-slate-500 block mb-1">ایمیل</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 transition dir-ltr"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1">رمز عبور</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 transition dir-ltr"
              placeholder="حداقل 6 کاراکتر"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fa-solid fa-spinner fa-spin"></i>
                در حال پردازش...
              </span>
            ) : (
              isLogin ? 'ورود' : 'ثبت‌نام'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-slate-400 font-bold">یا</span>
          </div>
        </div>

        {/* Google OAuth Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition shadow-sm flex items-center justify-center gap-3 text-sm cursor-pointer disabled:opacity-50"
        >
          {googleLoading ? (
            <span className="flex items-center justify-center gap-2 text-slate-500">
              <i className="fa-solid fa-spinner fa-spin text-emerald-600"></i>
              در حال اتصال به گوگل...
            </span>
          ) : (
            <>
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>ورود سریع با حساب گوگل</span>
            </>
          )}
        </button>

        <p className="text-xs text-slate-400 text-center mt-6">
          {isLogin ? 'حساب ندارید؟' : 'قبلاً ثبت‌نام کردید؟'}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-emerald-600 font-bold mr-1"
          >
            {isLogin ? 'ثبت‌نام کنید' : 'وارد شوید'}
          </button>
        </p>
      </div>
    </div>
  );
}

// ====== MAIN APP ======
function MainApp({ user, onLogout }) {
  const [balance, setBalance] = useState(user.balance || 0);
  const [tomanRate, setTomanRate] = useState(191208);
  const [activeTab, setActiveTab] = useState('buy');

  // Selection State
  const [selectedCountry, setSelectedCountry] = useState('usa');
  const [selectedService, setSelectedService] = useState('telegram');
  const [operators, setOperators] = useState([]);
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [loadingOperators, setLoadingOperators] = useState(false);
  const [buying, setBuying] = useState(false);

  // Provider State
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);

  // Active Orders
  const [activeNumbers, setActiveNumbers] = useState([]);

  // Modal & Toast
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch User Profile
  const fetchUserProfile = async () => {
    try {
      const data = await apiCall('/api/auth/profile');
      if (data.success && data.user) {
        setBalance(data.user.balance);
      }
    } catch (e) { console.error('fetchUserProfile error', e); }
  };

  const fetchWallexRate = async () => {
    try {
      const data = await apiCall('/api/wallex/rate');
      if (data.success && data.tomanRate) {
        setTomanRate(data.tomanRate);
      }
    } catch (e) { console.error('fetchWallexRate error', e); }
  };

  // Fetch Providers
  const fetchProviders = async () => {
    try {
      const data = await apiCall('/api/numbers/providers');
      if (data.success) {
        setProviders(data.providers || []);
      }
    } catch (e) { console.error('fetchProviders error', e); }
  };

  // Fetch Operators
  const fetchOperators = async (country, service) => {
    try {
      setLoadingOperators(true);
      const data = await apiCall('/api/provider/prices');
      setLoadingOperators(false);

      if (data.success && data.prices) {
        const countryData = data.prices[country] || {};
        const serviceData = countryData[service] || {};

        const opList = Object.keys(serviceData).map((opKey) => {
          const opInfo = serviceData[opKey] || {};
          const [prov, ...rest] = opKey.split(':');
          const opName = rest.join(':') || opKey;
          return {
            key: opKey,
            name: opName,
            cost: opInfo.cost || 0.10,
            count: opInfo.count || 0,
            rate: typeof opInfo.rate === 'number' ? opInfo.rate : 0,
            provider: opInfo.provider || prov || 'fivesim'
          };
        });

        const filtered = selectedProvider
          ? opList.filter(op => op.provider === selectedProvider)
          : opList;

        filtered.sort((a, b) => a.cost - b.cost);
        setOperators(filtered);
        if (filtered.length > 0) {
          setSelectedOperator(filtered[0]);
        } else {
          setSelectedOperator(null);
        }
      }
    } catch (e) {
      setLoadingOperators(false);
      console.error('fetchOperators error', e);
    }
  };

  // Fetch Active Orders
  const fetchActiveOrders = async () => {
    try {
      const data = await apiCall('/api/numbers/active');
      if (data.success && data.orders) {
        const mapped = data.orders.map(o => ({
          id: o.id || o.order_id,
          service: o.product || o.service,
          phone: o.phone,
          country: o.country,
          operator: o.operator || 'Virtual',
          price: o.price || 0.10,
          provider: o.provider || 'fivesim',
          code: o.smsCode || o.sms_code,
          status: (o.smsCode || o.sms_code) ? 'received' : 'waiting',
          timeLeft: 1200
        }));
        setActiveNumbers(mapped);
      }
    } catch (e) { console.error('fetchActiveOrders error', e); }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchWallexRate();
    fetchActiveOrders();
    fetchProviders();
  }, []);

  useEffect(() => {
    fetchOperators(selectedCountry, selectedService);
  }, [selectedCountry, selectedService, selectedProvider]);

  // Handle Buy Number
  const handleBuyNumber = async () => {
    if (!selectedOperator) {
      showToast('لطفاً یک اپراتور انتخاب کنید.', 'error');
      return;
    }

    const price = selectedOperator.cost || 0.10;
    if (balance < price) {
      showToast('موجودی کیف‌پول کافی نیست.', 'error');
      setWalletModalOpen(true);
      return;
    }

    try {
      setBuying(true);
      showToast(`در حال خرید شماره از ${selectedOperator.provider}...`, 'info');

      const data = await apiCall('/api/numbers/buy', {
        method: 'POST',
        body: JSON.stringify({
          country: selectedCountry,
          service: selectedService,
          operator: selectedOperator.name,
          price: price,
          provider: selectedProvider || selectedOperator.provider
        })
      });
      setBuying(false);

      if (data.success && data.order) {
        setBalance(data.newBalance);
        showToast('شماره با موفقیت خریداری شد!', 'success');
        fetchActiveOrders();
        setActiveTab('active');
      } else {
        showToast(data.message || 'خطا در دریافت شماره', 'error');
      }
    } catch (e) {
      setBuying(false);
      showToast('خطا در ارتباط با سرور', 'error');
    }
  };

  // Handle Cancel / Ban Order
  const handleCancelOrder = async (orderId) => {
    try {
      showToast('در حال لغو سفارش...', 'info');
      const data = await apiCall(`/api/numbers/cancel/${orderId}`, { method: 'POST' });
      if (data.success) {
        setBalance(data.newBalance);
        setActiveNumbers(prev => prev.filter(o => o.id !== orderId));
        showToast(data.message, 'success');
      } else {
        showToast(data.message || 'خطا در لغو سفارش', 'error');
      }
    } catch (e) { showToast('خطا در ارتباط با سرور', 'error'); }
  };

  const handleBanOrder = async (orderId) => {
    try {
      showToast('در حال گزارش خرابی...', 'info');
      const data = await apiCall(`/api/numbers/ban/${orderId}`, { method: 'POST' });
      if (data.success) {
        setBalance(data.newBalance);
        setActiveNumbers(prev => prev.filter(o => o.id !== orderId));
        showToast(data.message, 'success');
      } else {
        showToast(data.message || 'خطا در گزارش', 'error');
      }
    } catch (e) { showToast('خطا در ارتباط با سرور', 'error'); }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans dir-rtl">
      <Header 
        balance={balance} 
        onOpenWallet={() => setWalletModalOpen(true)} 
        user={user}
        onLogout={onLogout}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Sidebar activeTab={activeTab} onSwitchTab={setActiveTab} activeNumbersCount={activeNumbers.length} user={user} />

        <main className="lg:col-span-9 space-y-6">
          {activeTab === 'buy' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 space-y-6">
                <ServiceSelector
                  selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry}
                  selectedService={selectedService} onSelectService={setSelectedService}
                />
                <OperatorList operators={operators} selectedOperator={selectedOperator} onSelectOperator={setSelectedOperator} loading={loadingOperators} />
                {selectedOperator && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <span className="text-xs text-slate-500 block">اپراتور و هزینه نهایی:</span>
                      <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <ProviderBadge provider={selectedOperator.provider} size="xs" />
                        <span className="capitalize">{selectedOperator.name}</span>
                        <span className="text-emerald-600 font-extrabold text-base dir-ltr">$ {selectedOperator.cost?.toFixed(2)}</span>
                      </span>
                    </div>
                    <button onClick={handleBuyNumber} disabled={buying}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl transition shadow-lg flex items-center gap-2 text-sm cursor-pointer">
                      <i className="fa-solid fa-cart-shopping"></i>
                      <span>{buying ? 'در حال دریافت...' : 'دریافت آنی شماره'}</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="lg:col-span-1">
                <ProvidersPanel providers={providers} selectedProvider={selectedProvider} onSelectProvider={setSelectedProvider} />
              </div>
            </div>
          )}

          {activeTab === 'windscribe' && (
            <WindscribeShop
              user={user}
              balance={balance}
              onOpenWallet={() => setWalletModalOpen(true)}
              onShowToast={showToast}
              onBalanceUpdated={(newBal) => setBalance(newBal)}
              initialSubTab="shop"
            />
          )}

          {activeTab === 'gemini' && (
            <GeminiShop
              user={user}
              balance={balance}
              onOpenWallet={() => setWalletModalOpen(true)}
              onShowToast={showToast}
              onBalanceUpdated={(newBal) => setBalance(newBal)}
              initialSubTab="shop"
            />
          )}

          {activeTab === 'gemini_admin' && (
            <GeminiShop
              user={user}
              balance={balance}
              onOpenWallet={() => setWalletModalOpen(true)}
              onShowToast={showToast}
              onBalanceUpdated={(newBal) => setBalance(newBal)}
              initialSubTab="admin"
            />
          )}

          {activeTab === 'windscribe_admin' && (
            <WindscribeShop
              user={user}
              balance={balance}
              onOpenWallet={() => setWalletModalOpen(true)}
              onShowToast={showToast}
              onBalanceUpdated={(newBal) => setBalance(newBal)}
              initialSubTab="admin"
            />
          )}

          {activeTab === 'card_admin' && (
            <AdminCardManagement onShowToast={showToast} />
          )}

          {activeTab === 'active' && (
            <ActiveNumbers activeNumbers={activeNumbers} onCancelOrder={handleCancelOrder} onBanOrder={handleBanOrder}
              onSwitchTab={setActiveTab} onCopy={(text, msg) => { navigator.clipboard.writeText(text); showToast(msg || 'کپی گردید', 'success'); }} />
          )}

          {activeTab === 'history' && <TransactionsHistory onShowToast={showToast} />}
          {activeTab === 'guide' && <ArchitectureGuide />}
        </main>
      </div>

      <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} balance={balance} tomanRate={tomanRate} onShowToast={showToast} />

      {/* Global Toast Notification (Always in front of all modals with z-[9999]) */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center pointer-events-none w-full max-w-md px-4 transition-all duration-300">
          <div className={`pointer-events-auto px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 border ${
            toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/30'
              : toast.type === 'error' ? 'bg-rose-600 text-white border-rose-500 shadow-rose-950/30'
              : 'bg-slate-900 text-white border-slate-700 shadow-slate-950/40'
          }`}>
            <i className={`text-base ${
              toast.type === 'success' ? 'fa-solid fa-circle-check text-emerald-200'
                : toast.type === 'error' ? 'fa-solid fa-circle-exclamation text-rose-200'
                : 'fa-solid fa-bell text-sky-300'
            }`}></i>
            <span className="leading-snug">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ====== ROOT COMPONENT ======
export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setToken(savedToken);
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-emerald-500"></i>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return <MainApp user={user} onLogout={handleLogout} />;
}
