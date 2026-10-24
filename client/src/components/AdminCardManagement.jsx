import React, { useState, useEffect } from 'react';

export default function AdminCardManagement({ onShowToast }) {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'settings'
  const [statusFilter, setStatusFilter] = useState('PENDING_APPROVAL'); // 'ALL', 'PENDING_APPROVAL', 'SUCCESS', 'REJECTED'
  
  // Settings state
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Requests state
  const [requests, setRequests] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loadingRequests, setLoadingRequests] = useState(true);
  
  // Action state
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [rejectModalData, setRejectModalData] = useState(null); // { invoiceId, reason }
  const [previewImage, setPreviewImage] = useState(null);

  // Fetch Card Settings
  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/payment/admin/card-settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCardNumber(data.cardNumber || '');
        setCardHolder(data.cardHolder || '');
        setBankName(data.bankName || '');
        setEnabled(data.enabled !== false);
      }
    } catch (e) {
      console.error('Error fetching card settings:', e);
    }
  };

  // Fetch Requests
  const fetchRequests = async () => {
    try {
      setLoadingRequests(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/payment/admin/card-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setLoadingRequests(false);

      if (data.success) {
        setRequests(data.requests || []);
        setPendingCount(data.pendingCount || 0);
      }
    } catch (e) {
      setLoadingRequests(false);
      onShowToast('خطا در دریافت لیست فیش‌های واریزی', 'error');
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchRequests();
  }, []);

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/payment/admin/card-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cardNumber, cardHolder, bankName, enabled })
      });
      const data = await res.json();
      setSavingSettings(false);

      if (data.success) {
        onShowToast(data.message || 'تنظیمات کارت ذخیره شد', 'success');
      } else {
        onShowToast(data.message || 'خطا در ذخیره تنظیمات', 'error');
      }
    } catch (e) {
      setSavingSettings(false);
      onShowToast('خطا در ارتباط با سرور', 'error');
    }
  };

  // Approve Deposit
  const handleApprove = async (invoiceId) => {
    if (!window.confirm('آیا از تأیید این فیش و شارژ موجودی کاربر اطمینان دارید؟')) return;

    try {
      setActionLoadingId(invoiceId);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/payment/admin/card-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ invoiceId })
      });
      const data = await res.json();
      setActionLoadingId(null);

      if (data.success) {
        onShowToast(data.message, 'success');
        fetchRequests();
      } else {
        onShowToast(data.message || 'خطا در تایید واریز', 'error');
      }
    } catch (e) {
      setActionLoadingId(null);
      onShowToast('خطا در ارتباط با سرور', 'error');
    }
  };

  // Reject Deposit
  const handleRejectConfirm = async () => {
    if (!rejectModalData) return;
    try {
      setActionLoadingId(rejectModalData.invoiceId);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/payment/admin/card-reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          invoiceId: rejectModalData.invoiceId,
          reason: rejectModalData.reason
        })
      });
      const data = await res.json();
      setActionLoadingId(null);
      setRejectModalData(null);

      if (data.success) {
        onShowToast(data.message, 'info');
        fetchRequests();
      } else {
        onShowToast(data.message || 'خطا در رد درخواست', 'error');
      }
    } catch (e) {
      setActionLoadingId(null);
      onShowToast('خطا در ارتباط با سرور', 'error');
    }
  };

  const filteredRequests = requests.filter(r => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  return (
    <div className="space-y-6 dir-rtl font-sans">
      {/* Top Banner */}
      <div className="glass-panel bg-gradient-to-r from-[#0b132b]/95 via-[#10193a]/90 to-[#080d19]/95 rounded-3xl p-6 sm:p-7 text-white shadow-2xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
            <i className="fa-solid fa-credit-card"></i>
            <span>پنل مدیریت پرداخت‌های شتابی</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">مدیریت واریزهای کارت به کارت</h2>
          <p className="text-xs text-slate-400 mt-1">
            بررسی و تایید فیش‌های واریزی کاربران و تنظیمات شماره کارت بانکی مقصد
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-list-check"></i>
            <span>لیست فیش‌ها</span>
            {pendingCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-gear"></i>
            <span>تنظیمات کارت بانکی</span>
          </button>
        </div>
      </div>

      {activeTab === 'settings' ? (
        /* Settings Section */
        <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl space-y-6 max-w-2xl backdrop-blur-xl">
          <div className="border-b border-white/10 pb-4">
            <h3 className="font-black text-white text-base">مشخصات کارت بانکی جهت دریافت وجه</h3>
            <p className="text-xs text-slate-400 mt-0.5">این اطلاعات در صفحه شارژ حساب به کاربران نمایش داده می‌شود.</p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                شماره کارت بانکی (۱۶ رقمی):
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="6037-xxxx-xxxx-xxxx"
                className="w-full bg-slate-900/90 border border-white/15 rounded-xl p-3 text-sm font-mono dir-ltr focus:outline-none focus:border-cyan-400 text-white font-bold shadow-inner"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                نام و نام خانوادگی صاحب حساب:
              </label>
              <input
                type="text"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                placeholder="مثال: امیر نوری"
                className="w-full bg-slate-900/90 border border-white/15 rounded-xl p-3 text-sm focus:outline-none focus:border-cyan-400 text-white shadow-inner"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                نام بانک صادرکننده:
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="مثال: بانک ملی ایران / سامان / پاسارگاد"
                className="w-full bg-slate-900/90 border border-white/15 rounded-xl p-3 text-sm focus:outline-none focus:border-cyan-400 text-white shadow-inner"
                required
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 p-3 bg-slate-900/60 rounded-xl border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 rounded"
                />
                <div>
                  <div className="text-xs font-bold text-white">فعال بودن واریز کارت به کارت</div>
                  <div className="text-[11px] text-slate-400">در صورت غیرفعال بودن، این گزینه در پنجره شارژ به کاربران نشان داده نمی‌شود.</div>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black px-6 py-3 rounded-xl text-xs transition shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <i className="fa-solid fa-floppy-disk"></i>
              <span>{savingSettings ? 'در حال ذخیره...' : 'ذخیره تنظیمات کارت بانکی'}</span>
            </button>
          </form>
        </div>
      ) : (
        /* Requests Section */
        <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl space-y-4 backdrop-blur-xl">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                onClick={() => setStatusFilter('PENDING_APPROVAL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  statusFilter === 'PENDING_APPROVAL'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <i className="fa-solid fa-clock text-amber-400"></i>
                <span>در انتظار تایید ({pendingCount})</span>
              </button>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  statusFilter === 'ALL'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>همه درخواست‌ها ({requests.length})</span>
              </button>
              <button
                onClick={() => setStatusFilter('SUCCESS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  statusFilter === 'SUCCESS'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>تایید شده‌ها</span>
              </button>
              <button
                onClick={() => setStatusFilter('REJECTED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  statusFilter === 'REJECTED'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>رد شده‌ها</span>
              </button>
            </div>

            <button
              onClick={fetchRequests}
              className="text-xs bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer self-end sm:self-auto"
            >
              <i className="fa-solid fa-arrows-rotate text-cyan-400"></i>
              <span>به‌روزرسانی لیست</span>
            </button>
          </div>

          {loadingRequests ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <i className="fa-solid fa-circle-notch fa-spin text-cyan-400 text-xl mb-2 block"></i>
              در حال دریافت فیش‌های کارت به کارت...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-white/5">
              هیچ فیشی با فیلتر انتخاب شده یافت نشد.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-right text-xs border-collapse">
                <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-white/10">
                  <tr>
                    <th className="p-3">کاربر</th>
                    <th className="p-3">شناسه فاکتور</th>
                    <th className="p-3">مبلغ تومان</th>
                    <th className="p-3">معادل دلار</th>
                    <th className="p-3">کارت فرستنده</th>
                    <th className="p-3">کد پیگیری</th>
                    <th className="p-3">رسید تصویری</th>
                    <th className="p-3">تاریخ</th>
                    <th className="p-3">وضعیت</th>
                    <th className="p-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-slate-900/40 text-slate-300 font-medium">
                  {filteredRequests.map((r) => {
                    const dateStr = new Date(r.createdAt).toLocaleDateString('fa-IR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <tr key={r.id || r.invoiceId} className="hover:bg-white/5 transition">
                        {/* User */}
                        <td className="p-3">
                          <div className="font-bold text-white">{r.userEmail}</div>
                          {r.userName && <div className="text-[10px] text-slate-400">{r.userName}</div>}
                        </td>

                        {/* Invoice */}
                        <td className="p-3 font-mono text-[11px] font-bold text-cyan-300">
                          {r.invoiceId}
                        </td>

                        {/* Toman */}
                        <td className="p-3 font-mono font-bold text-white">
                          {r.amountToman ? parseInt(r.amountToman, 10).toLocaleString() : '۰'} تومان
                        </td>

                        {/* USD */}
                        <td className="p-3 font-mono font-bold text-emerald-400 dir-ltr text-right">
                          $ {r.amountUsd ? r.amountUsd.toFixed(2) : '0.00'}
                        </td>

                        {/* Sender Card */}
                        <td className="p-3 font-mono font-bold text-slate-300 dir-ltr text-right">
                          {r.senderCard || '—'}
                        </td>

                        {/* Tracking Code */}
                        <td className="p-3 font-mono font-bold text-slate-300">
                          {r.trackingCode || '—'}
                        </td>

                        {/* Receipt Image */}
                        <td className="p-3">
                          {r.receiptImage ? (
                            <button
                              onClick={() => setPreviewImage(r.receiptImage)}
                              className="w-9 h-9 rounded-lg border border-white/20 overflow-hidden hover:opacity-80 transition cursor-pointer"
                              title="مشاهده رسید"
                            >
                              <img src={r.receiptImage} alt="Receipt" className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <span className="text-slate-500 text-[10px]">بدون عکس</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="p-3 text-slate-400 text-[11px] font-mono">
                          {dateStr}
                        </td>

                        {/* Status */}
                        <td className="p-3">
                          {r.status === 'PENDING_APPROVAL' && (
                            <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                              <i className="fa-solid fa-clock text-[9px]"></i>
                              <span>در انتظار بررسی</span>
                            </span>
                          )}
                          {r.status === 'SUCCESS' && (
                            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                              <i className="fa-solid fa-check text-[9px]"></i>
                              <span>تایید شده</span>
                            </span>
                          )}
                          {r.status === 'REJECTED' && (
                            <div>
                              <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                <i className="fa-solid fa-xmark text-[9px]"></i>
                                <span>رد شده</span>
                              </span>
                              {r.adminNote && (
                                <div className="text-[10px] text-rose-400 mt-0.5 truncate max-w-[120px]" title={r.adminNote}>
                                  {r.adminNote}
                                </div>
                              )}
                            </div>
                          )}
                          {r.status === 'PENDING' && (
                            <span className="bg-white/5 text-slate-400 border border-white/10 px-2.5 py-1 rounded-full text-[10px] font-medium">
                              رسید ثبت نشده
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-center">
                          {r.status === 'PENDING_APPROVAL' ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleApprove(r.invoiceId)}
                                disabled={actionLoadingId === r.invoiceId}
                                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold transition shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-1"
                                title="تایید فیش و شارژ خودکار حساب"
                              >
                                <i className="fa-solid fa-check"></i>
                                <span>تأیید و شارژ</span>
                              </button>
                              <button
                                onClick={() => setRejectModalData({ invoiceId: r.invoiceId, reason: 'اطلاعات واریزی با حساب مطابقت ندارد' })}
                                disabled={actionLoadingId === r.invoiceId}
                                className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer"
                                title="رد فیش"
                              >
                                <i className="fa-solid fa-xmark"></i>
                                <span>رد</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-[#0b132b]/95 border border-white/15 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-sm">رد فیش کارت به کارت</h3>
            <p className="text-xs text-slate-400">
              لطفاً علت رد این فیش را برای اطلاع کاربر بنویسید:
            </p>
            <textarea
              rows="3"
              value={rejectModalData.reason}
              onChange={(e) => setRejectModalData({ ...rejectModalData, reason: e.target.value })}
              className="w-full bg-slate-900/90 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-400"
            />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setRejectModalData(null)}
                className="border border-white/15 text-slate-300 py-2.5 rounded-xl text-xs font-bold hover:bg-white/10 cursor-pointer transition"
              >
                انصراف
              </button>
              <button
                onClick={handleRejectConfirm}
                className="bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer transition shadow-md shadow-rose-600/30"
              >
                تایید رد درخواست
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-lg max-h-[85vh] glass-panel bg-[#0b132b]/90 border border-white/20 rounded-3xl overflow-hidden shadow-2xl p-3">
            <img src={previewImage} alt="Receipt Full" className="max-h-[80vh] w-auto mx-auto object-contain rounded-2xl" />
            <div className="text-center py-2 text-xs text-slate-400 font-bold">
              برای بستن کلیک کنید
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
