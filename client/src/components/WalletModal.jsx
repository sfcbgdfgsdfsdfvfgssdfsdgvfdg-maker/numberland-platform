import React, { useState } from 'react';

export default function WalletModal({
  isOpen,
  onClose,
  balance,
  tomanRate = 191208,
  onShowToast
}) {
  const [amountUsd, setAmountUsd] = useState(10);
  const [gateway, setGateway] = useState('wallex'); // 'wallex' (crypto) or 'card' (card to card)
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [selectedNetwork, setSelectedNetwork] = useState('bsc'); // 'bsc' (default) or 'trc20'
  const [txidInput, setTxidInput] = useState('');
  
  // Card-to-card state
  const [senderCardInput, setSenderCardInput] = useState('');
  const [trackingCodeInput, setTrackingCodeInput] = useState('');
  const [receiptImage, setReceiptImage] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [cardSubmitted, setCardSubmitted] = useState(false);

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const tomanEquivalent = Math.round(amountUsd * tomanRate);

  const handleCreateInvoice = async () => {
    if (amountUsd <= 0) {
      onShowToast('لطفاً مبلغ معتبری وارد کنید.', 'error');
      return;
    }
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setLoading(false);
        onShowToast('لطفاً ابتدا وارد حساب کاربری خود شوید.', 'error');
        return;
      }
      
      if (gateway === 'card') {
        onShowToast('در حال صدور فاکتور و دریافت مشخصات کارت بانکی...', 'info');
        const res = await fetch('/api/payment/card/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amountUsd: amountUsd, amountToman: tomanEquivalent })
        });
        const data = await res.json();
        setLoading(false);

        if (data.success) {
          setCurrentInvoice({ ...data, isCard: true });
          setCardSubmitted(false);
          onShowToast('فاکتور کارت به کارت صادر شد. مشخصات کارت را مشاهده کنید.', 'success');
        } else {
          onShowToast(data.message || 'خطا در ایجاد فاکتور', 'error');
          if (res.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setTimeout(() => window.location.reload(), 1500);
          }
        }
      } else {
        // Crypto / Wallex
        onShowToast('در حال صدور فاکتور واریز تتر...', 'info');
        const res = await fetch('/api/payment/wallex/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amountUsd: amountUsd, gateway: 'wallex' })
        });
        const data = await res.json();
        setLoading(false);

        if (data.success) {
          setCurrentInvoice({ ...data, isCard: false });
          onShowToast('فاکتور پرداخت تتر با موفقیت صادر شد.', 'success');
        } else {
          onShowToast(data.message || 'خطا در ایجاد فاکتور', 'error');
          if (res.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setTimeout(() => window.location.reload(), 1500);
          }
        }
      }
    } catch (e) {
      setLoading(false);
      onShowToast('خطا در ارتباط با سرور', 'error');
    }
  };

  const handleVerifyTxid = async () => {
    if (!currentInvoice) return;
    if (!txidInput.trim()) {
      onShowToast('لطفاً کد پیگیری یا TXID تراکنش را وارد کنید.', 'error');
      return;
    }

    try {
      setLoading(true);
      onShowToast('در حال استعلام و ثبت کد پیگیری تراکنش...', 'info');
      const token = localStorage.getItem('token');
      const res = await fetch('/api/payment/trc20/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          invoiceId: currentInvoice.invoiceId,
          txid: txidInput.trim()
        })
      });
      const data = await res.json();
      setLoading(false);

      if (data.success) {
        onShowToast(data.message, 'success');
        setCurrentInvoice(null);
        onClose();
        window.location.reload();
      } else {
        onShowToast(data.message || 'خطا در تایید تراکنش', 'error');
      }
    } catch (e) {
      setLoading(false);
      onShowToast('خطا در ارتباط با سرور', 'error');
    }
  };

  // Card receipt image upload handler
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onShowToast('حجم تصویر نباید بیشتر از ۵ مگابایت باشد.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptImage(reader.result);
      setReceiptPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Submit Card-to-Card Receipt
  const handleSubmitCardReceipt = async () => {
    if (!currentInvoice) return;
    if (!senderCardInput.trim() && !trackingCodeInput.trim()) {
      onShowToast('لطفاً حداقل شماره کارت واریزکننده یا شماره پیگیری را وارد کنید.', 'error');
      return;
    }

    try {
      setLoading(true);
      onShowToast('در حال ثبت و ارسال رسید واریز...', 'info');
      const token = localStorage.getItem('token');
      const res = await fetch('/api/payment/card/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          invoiceId: currentInvoice.invoiceId,
          senderCard: senderCardInput.trim(),
          trackingCode: trackingCodeInput.trim(),
          receiptImage: receiptImage
        })
      });
      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setCardSubmitted(true);
        onShowToast(data.message, 'success');
      } else {
        onShowToast(data.message || 'خطا در ثبت رسید', 'error');
      }
    } catch (e) {
      setLoading(false);
      onShowToast('خطا در ارتباط با سرور', 'error');
    }
  };

  const depositAddress = selectedNetwork === 'bsc'
    ? (currentInvoice?.bscAddress || '0x19b3c81ffe912e995c20cef4db50f289379bd9c7')
    : (currentInvoice?.trc20Address || 'TD8ue5Ta8S9Hu1K1MwiVmRmKrcTsweD7xP');

  // Format 16 digit card number (e.g. 6037 9979 1234 5678)
  const formatCardNumber = (num) => {
    if (!num) return '';
    const clean = num.replace(/\D/g, '');
    return clean.match(/.{1,4}/g)?.join(' - ') || num;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 transform transition-all font-sans dir-rtl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">
              {currentInvoice
                ? currentInvoice.isCard
                  ? 'فاکتور واریز کارت به کارت'
                  : 'فاکتور واریز تتر (USDT)'
                : 'شارژ کیف‌پول و حساب'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentInvoice
                ? currentInvoice.isCard
                  ? 'انتقال وجه شتابی و ثبت مشخصات فیش'
                  : 'آدرس ولت اختصاصی جهت واریز تتر'
                : 'افزایش موجودی با کارت به کارت بانکی یا ارز دیجیتال'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {!currentInvoice ? (
          /* Step 1: Select Amount & Gateway */
          <>
            {/* Current Balance & Live Rate Header */}
            <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block">موجودی فعلی شما:</span>
                <span className="font-bold text-emerald-600 text-sm dir-ltr">
                  $ {typeof balance === 'number' ? balance.toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="text-left border-r border-slate-200 pr-3">
                <span className="text-slate-500 block">نرخ روز تتر:</span>
                <span className="font-bold text-sky-600 font-mono">
                  {tomanRate.toLocaleString()} تومان
                </span>
              </div>
            </div>

            {/* Quick Amounts */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                انتخاب سریع مبلغ شارژ (دلار):
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[5, 10, 25, 50, 100].map((val) => (
                  <button
                    key={val}
                    onClick={() => setAmountUsd(val)}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      amountUsd === val
                        ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    $ {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">مبلغ دلخواه شارژ:</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(parseFloat(e.target.value) || 0)}
                  className="w-full border border-slate-200 rounded-xl p-3 pr-8 text-center font-extrabold text-slate-900 focus:outline-none focus:border-sky-500 dir-ltr text-lg"
                />
                <span className="absolute left-4 top-3.5 font-bold text-slate-400 text-sm">$</span>
              </div>
              <div className="text-center text-xs text-slate-500 font-medium pt-1">
                معادل پرداخت تقریبی:{' '}
                <span className="font-bold text-sky-600 font-mono">
                  {tomanEquivalent > 0 ? tomanEquivalent.toLocaleString() : '۰'}
                </span>{' '}
                تومان
              </div>
            </div>

            {/* Gateway Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">انتخاب روش پرداخت:</label>
              <div className="space-y-2">
                {/* Option 1: Card to Card */}
                <label
                  onClick={() => setGateway('card')}
                  className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition ${
                    gateway === 'card'
                      ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-400'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="gateway"
                      value="card"
                      checked={gateway === 'card'}
                      onChange={() => setGateway('card')}
                      className="text-indigo-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>کارت به کارت (واریز بانکی / شتاب)</span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-bold">
                          پیشنهادی
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">واریز آسان از طریق تمامی بانک‌ها و همراه بانک‌ها</div>
                    </div>
                  </div>
                  <i className="fa-solid fa-credit-card text-indigo-600 text-xl"></i>
                </label>

                {/* Option 2: Crypto USDT */}
                <label
                  onClick={() => setGateway('wallex')}
                  className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition ${
                    gateway === 'wallex'
                      ? 'border-sky-500 bg-sky-50/60 ring-1 ring-sky-400'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="gateway"
                      value="wallex"
                      checked={gateway === 'wallex'}
                      onChange={() => setGateway('wallex')}
                      className="text-sky-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">درگاه پرداخت ارزی و تتر (USDT)</div>
                      <div className="text-[10px] text-slate-500">پرداخت کریپتو روی شبکه‌های BSC و TRC20</div>
                    </div>
                  </div>
                  <i className="fa-solid fa-coins text-amber-500 text-xl"></i>
                </label>
              </div>
            </div>

            <button
              onClick={handleCreateInvoice}
              disabled={loading}
              className={`w-full text-white font-bold py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2 text-sm cursor-pointer ${
                gateway === 'card' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <i className="fa-solid fa-arrow-left"></i>
              <span>{loading ? 'در حال صدور فاکتور...' : (gateway === 'card' ? 'مشاهده شماره کارت و پرداخت' : 'ایجاد فاکتور کریپتو')}</span>
            </button>
          </>
        ) : currentInvoice.isCard ? (
          /* Step 2: CARD TO CARD VIEW */
          <div className="space-y-4">
            {/* Beautiful Bank Card UI */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-800 p-5 text-white shadow-xl border border-indigo-700/50 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-7 bg-amber-400/90 rounded-md border border-amber-300 flex items-center justify-center shadow-inner">
                    <div className="w-5 h-3 border border-amber-600/70 rounded-xs"></div>
                  </div>
                  <span className="text-xs font-bold tracking-wide text-indigo-200">کارت بانکی مقصد</span>
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-amber-300">{currentInvoice.bankName || 'بانک ملی ایران'}</span>
                </div>
              </div>

              {/* 16 Digit Card Number */}
              <div className="text-center py-1">
                <div className="text-lg font-mono font-black tracking-widest text-white drop-shadow-md dir-ltr select-all">
                  {formatCardNumber(currentInvoice.cardNumber)}
                </div>
              </div>

              {/* Card Holder & Copy Button */}
              <div className="flex justify-between items-center text-xs pt-1 border-t border-indigo-800/60">
                <div>
                  <span className="text-[10px] text-indigo-300 block">صاحب حساب:</span>
                  <span className="font-bold text-white text-xs">{currentInvoice.cardHolder || 'مدیریت سیم‌جت'}</span>
                </div>
                <button
                  onClick={() => {
                    const cleanNum = currentInvoice.cardNumber.replace(/\D/g, '');
                    navigator.clipboard.writeText(cleanNum);
                    onShowToast('شماره کارت ۱۶ رقمی کپی شد.', 'success');
                  }}
                  className="bg-indigo-500/30 hover:bg-indigo-500/60 border border-indigo-400/40 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <i className="fa-regular fa-copy"></i>
                  <span>کپی شماره کارت</span>
                </button>
              </div>
            </div>

            {/* Invoice Summary */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">مبلغ دقیق قابل واریز:</span>
                <span className="font-extrabold text-base text-indigo-700 font-mono">
                  {currentInvoice.amountToman ? currentInvoice.amountToman.toLocaleString() : '۰'} تومان
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-100">
                <span className="text-slate-500">معادل شارژ دلاری:</span>
                <span className="font-bold text-emerald-600 font-mono">$ {currentInvoice.amountUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">شناسه فاکتور:</span>
                <span className="font-mono text-slate-700 font-bold">{currentInvoice.invoiceId}</span>
              </div>
            </div>

            {/* Receipt Form or Submitted State */}
            {cardSubmitted ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-2">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-lg">
                  <i className="fa-solid fa-check"></i>
                </div>
                <h4 className="font-bold text-emerald-800 text-sm">رسید شما با موفقیت ثبت شد!</h4>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  فیش واریزی در صف بررسی مدیریت قرار گرفت. پس از استعلام بانکی، حساب شما به‌صورت آنی شارژ خواهد شد.
                </p>
                <button
                  onClick={() => {
                    setCurrentInvoice(null);
                    onClose();
                  }}
                  className="mt-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                >
                  متوجه شدم و بستن
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <i className="fa-solid fa-file-invoice text-indigo-600"></i>
                  <span>ثبت مشخصات و فیش واریزی:</span>
                </div>

                {/* Sender Card Number */}
                <div className="space-y-1">
                  <label className="block text-[11px] text-slate-600 font-medium">
                    شماره کارت شما یا ۴ رقم آخر کارت: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: ۵۸۵۹-xxxx-xxxx-۱۲۳۴ یا ۱۲۳۴"
                    value={senderCardInput}
                    onChange={(e) => setSenderCardInput(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-center focus:outline-none focus:border-indigo-500 dir-ltr font-mono"
                  />
                </div>

                {/* Tracking Code */}
                <div className="space-y-1">
                  <label className="block text-[11px] text-slate-600 font-medium">
                    شماره پیگیری / کد ارجاع فیش بانکی: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="کد پیگیری دریافت شده از اپلیکیشن بانکی"
                    value={trackingCodeInput}
                    onChange={(e) => setTrackingCodeInput(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-center focus:outline-none focus:border-indigo-500 dir-ltr font-mono"
                  />
                </div>

                {/* Optional Receipt Screenshot Upload */}
                <div className="space-y-1">
                  <label className="block text-[11px] text-slate-600 font-medium">
                    تصویر رسید یا اسکرین‌شات واریز (اختیاری):
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 p-2.5 border border-dashed border-slate-300 hover:border-indigo-400 rounded-xl bg-slate-50 text-xs text-slate-600 cursor-pointer transition">
                      <i className="fa-solid fa-cloud-arrow-up text-indigo-500"></i>
                      <span>{receiptPreview ? 'تغییر تصویر فیش' : 'انتخاب عکس فیش (JPG/PNG)'}</span>
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                    {receiptPreview && (
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                        <img src={receiptPreview} alt="Receipt Preview" className="w-full h-full object-cover" />
                        <button
                          onClick={() => { setReceiptImage(null); setReceiptPreview(null); }}
                          className="absolute inset-0 bg-slate-900/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition"
                        >
                          <i className="fa-solid fa-trash text-xs"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => setCurrentInvoice(null)}
                    className="border border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    بازگشت
                  </button>
                  <button
                    onClick={handleSubmitCardReceipt}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <i className="fa-solid fa-check-circle"></i>
                    <span>{loading ? 'در حال ثبت...' : 'ثبت نهایی رسید'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Step 2: CRYPTO USDT VIEW */
          <div className="space-y-4">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2 dir-rtl">
              <div className="flex justify-between">
                <span className="text-slate-500">شماره فاکتور:</span>
                <span className="font-mono font-bold text-slate-800">{currentInvoice.invoiceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">مبلغ واریزی:</span>
                <span className="font-bold text-emerald-600">$ {currentInvoice.amountUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">معادل تومان:</span>
                <span className="font-bold text-slate-700 font-mono">
                  {currentInvoice.amountToman.toLocaleString()} تومان
                </span>
              </div>
            </div>

            {/* Connection Badge */}
            <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2">
              <i className="fa-solid fa-circle-check text-emerald-500 text-sm"></i>
              <span>درگاه مستقیم تتر: استعلام و تایید واریز شما به صورت خودکار و آنی انجام خواهد شد.</span>
            </div>

            {/* Network Selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedNetwork('bsc')}
                className={`py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center justify-center gap-1.5 ${
                  selectedNetwork === 'bsc'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm ring-1 ring-amber-400'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <i className="fa-solid fa-bolt text-amber-500 text-xs"></i>
                <span>BSC (BEP20 - پیش‌فرض)</span>
              </button>
              <button
                onClick={() => setSelectedNetwork('trc20')}
                className={`py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center justify-center gap-1.5 ${
                  selectedNetwork === 'trc20'
                    ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-400'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>TRC20 (ترون)</span>
              </button>
            </div>

            {/* Deposit Address Box */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-600">
                آدرس ولت واریز تتر:
              </label>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <input
                  type="text"
                  readOnly
                  value={depositAddress}
                  className="w-full p-2.5 text-xs font-mono font-bold text-slate-800 bg-transparent dir-ltr focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(depositAddress);
                    onShowToast('آدرس ولت کپی شد.', 'success');
                  }}
                  className="bg-sky-500 text-white px-3 py-2.5 text-xs font-bold cursor-pointer hover:bg-sky-600"
                >
                  کپی
                </button>
              </div>
            </div>

            {/* TXID Submission Input */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold text-slate-700">
                ثبت کد پیگیری / Hash تراکنش (TXID):
              </label>
              <input
                type="text"
                placeholder="کد TXID دریافت شده از کیف‌پول خود را وارد کنید"
                value={txidInput}
                onChange={(e) => setTxidInput(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-xs font-mono text-center focus:outline-none focus:border-sky-500 dir-ltr"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setCurrentInvoice(null)}
                className="border border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
              >
                بازگشت
              </button>
              <button
                onClick={handleVerifyTxid}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md cursor-pointer"
              >
                {loading ? 'در حال استعلام...' : 'تایید و شارژ ولت'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
