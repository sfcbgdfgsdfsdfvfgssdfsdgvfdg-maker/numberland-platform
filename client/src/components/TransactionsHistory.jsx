import React, { useEffect, useState } from 'react';

export default function TransactionsHistory({ onShowToast }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/payment/transactions', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      setLoading(false);
      if (data.success && data.transactions) {
        setTransactions(data.transactions);
      }
    } catch (e) {
      setLoading(false);
      onShowToast('خطا در دریافت تاریخچه تراکنش‌ها', 'error');
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div className="space-y-6 dir-rtl font-sans">
      <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl space-y-5 backdrop-blur-xl">
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-lg">
              <i className="fa-solid fa-clock-rotate-left"></i>
            </div>
            <div>
              <h2 className="text-lg font-black text-white">تاریخچه تراکنش‌های مالی و شارژ</h2>
              <p className="text-xs text-slate-400 mt-0.5">وضعیت و سوابق تمامی فاکتورهای کارت به کارت و درگاه کریپتو</p>
            </div>
          </div>
          <button
            onClick={fetchTransactions}
            className="text-xs bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <i className="fa-solid fa-arrows-rotate text-cyan-400"></i>
            <span>به‌روزرسانی</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400">
            <i className="fa-solid fa-circle-notch fa-spin text-cyan-400 text-xl mb-2 block"></i>
            در حال دریافت تراکنش‌ها...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-right text-xs border-collapse">
              <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-white/10">
                <tr>
                  <th className="p-3.5">کد فاکتور</th>
                  <th className="p-3.5">روش پرداخت</th>
                  <th className="p-3.5">مبلغ دلاری</th>
                  <th className="p-3.5">معادل تومانی</th>
                  <th className="p-3.5">مشخصات پیگیری</th>
                  <th className="p-3.5">تاریخ</th>
                  <th className="p-3.5 text-center">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-slate-900/40 text-slate-300 font-medium">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-xs text-slate-500">
                      هیچ تراکنش شارژی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => {
                    const dateStr = new Date(t.createdAt).toLocaleDateString('fa-IR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <tr key={t.id || t.invoiceId} className="hover:bg-white/5 transition">
                        <td className="p-3.5 font-mono text-xs text-cyan-300 font-bold">
                          {t.invoiceId || t.id}
                        </td>
                        <td className="p-3.5">
                          {t.gateway === 'card' ? (
                            <span className="inline-flex items-center gap-1.5 text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                              <i className="fa-solid fa-credit-card text-cyan-400"></i>
                              <span>کارت به کارت</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                              <i className="fa-solid fa-coins text-amber-400"></i>
                              <span>تتر (USDT)</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-black text-emerald-400 font-mono dir-ltr text-right">
                          $ {t.amountUsd ? t.amountUsd.toFixed(2) : '0.00'}
                        </td>
                        <td className="p-3.5 font-mono text-white font-bold">
                          {t.amountToman ? parseInt(t.amountToman, 10).toLocaleString() : '۰'} تومان
                        </td>
                        <td className="p-3.5 font-mono text-slate-400">
                          {t.trackingCode ? (
                            <div title="کد پیگیری" className="text-slate-200">{t.trackingCode}</div>
                          ) : t.txid ? (
                            <div className="truncate max-w-[120px] text-cyan-400" title={t.txid}>{t.txid}</div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-400 font-mono text-[11px]">{dateStr}</td>
                        <td className="p-3.5 text-center">
                          {t.status === 'SUCCESS' && (
                            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] px-3 py-1 rounded-full font-black inline-flex items-center gap-1 shadow-sm">
                              <i className="fa-solid fa-check text-[10px]"></i>
                              <span>موفق</span>
                            </span>
                          )}
                          {t.status === 'PENDING_APPROVAL' && (
                            <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] px-3 py-1 rounded-full font-black inline-flex items-center gap-1 shadow-sm">
                              <i className="fa-solid fa-clock text-[10px]"></i>
                              <span>در انتظار بررسی مدیریت</span>
                            </span>
                          )}
                          {t.status === 'REJECTED' && (
                            <div>
                              <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] px-3 py-1 rounded-full font-black inline-flex items-center gap-1 shadow-sm">
                                <i className="fa-solid fa-xmark text-[10px]"></i>
                                <span>رد شده</span>
                              </span>
                              {t.adminNote && (
                                <div className="text-[10px] text-rose-400 mt-1">{t.adminNote}</div>
                              )}
                            </div>
                          )}
                          {t.status === 'PENDING' && (
                            <span className="bg-white/5 text-slate-400 border border-white/10 text-[11px] px-3 py-1 rounded-full font-medium">
                              در انتظار پرداخت
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
