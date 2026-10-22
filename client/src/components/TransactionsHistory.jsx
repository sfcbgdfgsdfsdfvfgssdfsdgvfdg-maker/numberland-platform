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
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">تاریخچه تراکنش‌های مالی و شارژ</h2>
            <p className="text-xs text-slate-500 mt-0.5">وضعیت و سوابق تمامی فاکتورهای کارت به کارت و کریپتو</p>
          </div>
          <button
            onClick={fetchTransactions}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
          >
            <i className="fa-solid fa-arrows-rotate"></i>
            <span>به‌روزرسانی</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">در حال دریافت تراکنش‌ها...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="p-3 rounded-r-lg">کد فاکتور</th>
                  <th className="p-3">روش پرداخت</th>
                  <th className="p-3">مبلغ دلاری</th>
                  <th className="p-3">معادل تومانی</th>
                  <th className="p-3">مشخصات پیگیری</th>
                  <th className="p-3">تاریخ</th>
                  <th className="p-3 rounded-l-lg">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-6 text-center text-xs text-slate-400">
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
                      <tr key={t.id || t.invoiceId} className="hover:bg-slate-50/60 transition">
                        <td className="p-3 font-mono text-xs text-slate-800 font-bold">
                          {t.invoiceId || t.id}
                        </td>
                        <td className="p-3">
                          {t.gateway === 'card' ? (
                            <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px] font-bold border border-indigo-100">
                              <i className="fa-solid fa-credit-card text-indigo-500"></i>
                              <span>کارت به کارت</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-sky-700 bg-sky-50 px-2 py-0.5 rounded text-[11px] font-bold border border-sky-100">
                              <i className="fa-solid fa-coins text-amber-500"></i>
                              <span>تتر (USDT)</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-emerald-600 dir-ltr text-right">
                          $ {t.amountUsd ? t.amountUsd.toFixed(2) : '0.00'}
                        </td>
                        <td className="p-3 font-mono text-slate-700 font-bold">
                          {t.amountToman ? parseInt(t.amountToman, 10).toLocaleString() : '۰'} تومان
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {t.trackingCode ? (
                            <div title="کد پیگیری">{t.trackingCode}</div>
                          ) : t.txid ? (
                            <div className="truncate max-w-[100px]" title={t.txid}>{t.txid}</div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500">{dateStr}</td>
                        <td className="p-3">
                          {t.status === 'SUCCESS' && (
                            <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2 py-1 rounded-md font-bold inline-flex items-center gap-1">
                              <i className="fa-solid fa-check text-[10px]"></i>
                              <span>موفق</span>
                            </span>
                          )}
                          {t.status === 'PENDING_APPROVAL' && (
                            <span className="bg-amber-100 text-amber-800 text-[11px] px-2 py-1 rounded-md font-bold inline-flex items-center gap-1">
                              <i className="fa-solid fa-clock text-[10px]"></i>
                              <span>در انتظار بررسی مدیریت</span>
                            </span>
                          )}
                          {t.status === 'REJECTED' && (
                            <div>
                              <span className="bg-rose-100 text-rose-800 text-[11px] px-2 py-1 rounded-md font-bold inline-flex items-center gap-1">
                                <i className="fa-solid fa-xmark text-[10px]"></i>
                                <span>رد شده</span>
                              </span>
                              {t.adminNote && (
                                <div className="text-[10px] text-rose-600 mt-0.5">{t.adminNote}</div>
                              )}
                            </div>
                          )}
                          {t.status === 'PENDING' && (
                            <span className="bg-slate-100 text-slate-600 text-[11px] px-2 py-1 rounded-md font-medium">
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
