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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel bg-[#0b132b]/95 border border-white/15 text-slate-100 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 transform transition-all font-sans dir-rtl max-h-[92vh] overflow-y-auto backdrop-blur-2xl">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
              <i className="fa-solid fa-wallet text-base"></i>
            </div>
            <div>
              <h3 className="font-black text-white text-base sm:text-lg">
                {currentInvoice
                  ? currentInvoice.isCard
                    ? 'فاکتور واریز کارت به کارت'
                    : 'فاکتور واریز تتر (USDT)'
                  : 'شارژ کیف‌پول و حساب'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentInvoice
                  ? currentInvoice.isCard
                    ? 'انتقال وجه شتابی و ثبت مشخصات فیش'
                    : 'آدرس ولت اختصاصی جهت واریز تتر'
                  : 'افزایش موجودی با کارت به کارت بانکی یا ارز دیجیتال'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {!currentInvoice ? (
          /* Step 1: Select Amount & Gateway */
          <>
            {/* Current Balance & Live Rate Header */}
            <div className="bg-slate-900/80 border border-white/10 p-3.5 rounded-2xl flex items-center justify-between text-xs shadow-inner">
              <div>
                <span className="text-slate-400 block mb-0.5">موجودی فعلی شما:</span>
                <span className="font-black text-emerald-400 text-base font-mono dir-ltr">
                  $ {typeof balance === 'number' ? balance.toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="text-left border-r border-white/10 pr-3.5">
                <span className="text-slate-400 block mb-0.5">نرخ لحظه‌ای تتر (والکس):</span>
                <span className="font-black text-cyan-400 font-mono text-sm">
                  {tomanRate.toLocaleString()} تومان
                </span>
              </div>
            </div>

            {/* Quick Amounts */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                انتخاب سریع مبلغ شارژ (دلار):
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[5, 10, 25, 50, 100].map((val) => (
                  <button
                    key={val}
                    onClick={() => setAmountUsd(val)}
                    className={`py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer border ${
                      amountUsd === val
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-md shadow-cyan-500/20'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    ${val}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">مبلغ دلخواه شارژ:</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900/90 border border-white/15 rounded-2xl p-3 pr-8 text-center font-black text-white focus:outline-none focus:border-cyan-400 dir-ltr text-xl font-mono shadow-inner transition"
                />
                <span className="absolute left-4 top-3.5 font-bold text-slate-400 text-sm font-mono">$</span>
              </div>
              <div className="text-center text-xs text-slate-400 font-medium pt-1">
                معادل پرداخت تقریبی:{' '}
                <span className="font-black text-cyan-400 font-mono text-sm">
                  {tomanEquivalent > 0 ? tomanEquivalent.toLocaleString() : '۰'}
                </span>{' '}
                تومان
              </div>
            </div>

            {/* Gateway Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">انتخاب روش پرداخت:</label>
              <div className="space-y-2.5">
                {/* Option 1: Card to Card */}
                <label
                  onClick={() => setGateway('card')}
                  className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition border ${
                    gateway === 'card'
                      ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400/50 shadow-md shadow-cyan-500/10'
                      : 'border-white/10 bg-slate-900/60 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="gateway"
                      value="card"
                      checked={gateway === 'card'}
                      onChange={() => setGateway('card')}
                      className="accent-cyan-400"
                    />
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>کارت به کارت (واریز بانکی / شتاب)</span>
                        <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded-full font-bold">
                          پیشنهادی
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">واریز آسان از طریق تمامی بانک‌ها و همراه بانک‌ها</div>
                    </div>
                  </div>
                  <i className="fa-solid fa-credit-card text-cyan-400 text-xl"></i>
                </label>

                {/* Option 2: Crypto USDT */}
                <label
                  onClick={() => setGateway('wallex')}
                  className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition border ${
                    gateway === 'wallex'
                      ? 'border-amber-400 bg-amber-950/40 ring-1 ring-amber-400/50 shadow-md shadow-amber-500/10'
                      : 'border-white/10 bg-slate-900/60 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="gateway"
                      value="wallex"
                      checked={gateway === 'wallex'}
                      onChange={() => setGateway('wallex')}
                      className="accent-amber-400"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">درگاه پرداخت ارزی و تتر (USDT)</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">پرداخت کریپتو روی شبکه‌های BSC و TRC20</div>
                    </div>
                  </div>
                  <i className="fa-solid fa-coins text-amber-400 text-xl"></i>
                </label>
              </div>
            </div>

            <button
              onClick={handleCreateInvoice}
              disabled={loading}
              className={`w-full text-white font-black py-3.5 rounded-2xl transition shadow-xl flex items-center justify-center gap-2 text-sm cursor-pointer ${
                gateway === 'card'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/25'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/25'
              }`}
            >
              <i className="fa-solid fa-arrow-left"></i>
              <span>{loading ? 'در حال صدور فاکتور...' : (gateway === 'card' ? 'مشاهده شماره کارت و پرداخت' : 'ایجاد فاکتور کریپتو')}</span>
            </button>

            {/* Telegram Bot Callout */}
            <div className="pt-2 border-t border-white/10 text-center">
              <a
                href="https://t.me/onstagh_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 text-xs text-cyan-300 hover:text-cyan-200 transition py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl px-3 w-full font-bold"
              >
                <i className="fa-brands fa-telegram text-cyan-400 text-sm"></i>
                <span>امکان شارژ ولت و خرید در ربات تلگرام: <b>@onstagh_bot</b></span>
              </a>
            </div>
          </>
        ) : currentInvoice.isCard ? (
          /* Step 2: CARD TO CARD VIEW */
          <div className="space-y-4">
            {/* Beautiful Bank Card UI */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-[#0a1026] via-[#101b42] to-[#0f2854] p-5 text-white shadow-2xl border border-cyan-400/30 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-7 bg-amber-400 rounded-md border border-amber-300 flex items-center justify-center shadow-inner">
                    <div className="w-5 h-3 border border-amber-700/60 rounded-xs"></div>
                  </div>
                  <span className="text-xs font-bold tracking-wide text-cyan-200">کارت بانکی شتاب</span>
                </div>
                <div className="text-left">
                  <span className="text-xs font-black text-amber-300">{currentInvoice.bankName || 'بانک ملی ایران'}</span>
                </div>
              </div>

              {/* 16 Digit Card Number */}
              <div className="text-center py-2">
                <div className="text-xl font-mono font-black tracking-widest text-white drop-shadow-lg dir-ltr select-all">
                  {formatCardNumber(currentInvoice.cardNumber)}
                </div>
              </div>

              {/* Card Holder & Copy Button */}
              <div className="flex justify-between items-center text-xs pt-2 border-t border-white/10">
                <div>
                  <span className="text-[10px] text-slate-300 block">صاحب حساب:</span>
                  <span className="font-black text-white text-xs">{currentInvoice.cardHolder || 'مدیریت سیم‌جت'}</span>
                </div>
                <button
                  onClick={() => {
                    const cleanNum = currentInvoice.cardNumber.replace(/\D/g, '');
                    navigator.clipboard.writeText(cleanNum);
                    onShowToast('شماره کارت ۱۶ رقمی کپی شد.', 'success');
                  }}
                  className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <i className="fa-regular fa-copy"></i>
                  <span>کپی شماره کارت</span>
                </button>
              </div>
            </div>

            {/* Invoice Summary */}
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/10 text-xs space-y-2 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">مبلغ دقیق قابل واریز:</span>
                <span className="font-black text-base text-cyan-400 font-mono">
                  {currentInvoice.amountToman ? currentInvoice.amountToman.toLocaleString() : '۰'} تومان
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-white/10">
                <span className="text-slate-400">معادل شارژ دلاری:</span>
                <span className="font-bold text-emerald-400 font-mono">$ {currentInvoice.amountUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">شناسه فاکتور:</span>
                <span className="font-mono text-slate-300 font-bold">{currentInvoice.invoiceId}</span>
              </div>
            </div>

            {/* Receipt Form or Submitted State */}
            {cardSubmitted ? (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 text-center space-y-2.5">
                <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-lg">
                  <i className="fa-solid fa-check"></i>
                </div>
                <h4 className="font-black text-emerald-300 text-sm">رسید شما با موفقیت ثبت شد!</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  فیش واریزی در صف بررسی مدیریت قرار گرفت. پس از استعلام بانکی، حساب شما به‌صورت آنی شارژ خواهد شد.
                </p>
                <button
                  onClick={() => {
                    setCurrentInvoice(null);
                    onClose();
                  }}
                  className="mt-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:from-emerald-400 hover:to-teal-500 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  متوجه شدم و بستن
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <i className="fa-solid fa-file-invoice text-cyan-400"></i>
                  <span>ثبت مشخصات و فیش واریزی:</span>
                </div>

                {/* Sender Card Number */}
                <div className="space-y-1">
                  <label className="block text-[11px] text-slate-300 font-medium">
                    شماره کارت شما یا ۴ رقم آخر کارت: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: ۵۸۵۹-xxxx-xxxx-۱۲۳۴ یا ۱۲۳۴"
                    value={senderCardInput}
                    onChange={(e) => setSenderCardInput(e.target.value)}
                    className="w-full bg-slate-900/90 border border-white/15 rounded-xl p-2.5 text-xs text-center focus:outline-none focus:border-cyan-400 dir-ltr font-mono text-white"
                  />
                </div>

                {/* Tracking Code */}
                <div className="space-y-1">
                  <label className="block text-[11px] text-slate-300 font-medium">
                    شماره پیگیری / کد ارجاع فیش بانکی: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="کد پیگیری دریافت شده از اپلیکیشن بانکی"
                    value={trackingCodeInput}
                    onChange={(e) => setTrackingCodeInput(e.target.value)}
                    className="w-full bg-slate-900/90 border border-white/15 rounded-xl p-2.5 text-xs text-center focus:outline-none focus:border-cyan-400 dir-ltr font-mono text-white"
                  />
                </div>

                {/* Optional Receipt Screenshot Upload */}
                <div className="space-y-1">
                  <label className="block text-[11px] text-slate-300 font-medium">
                    تصویر رسید یا اسکرین‌شات واریز (اختیاری):
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 p-2.5 border border-dashed border-white/20 hover:border-cyan-400 rounded-xl bg-slate-900/60 text-xs text-slate-300 cursor-pointer transition">
                      <i className="fa-solid fa-cloud-arrow-up text-cyan-400"></i>
                      <span>{receiptPreview ? 'تغییر تصویر فیش' : 'انتخاب عکس فیش (JPG/PNG)'}</span>
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                    {receiptPreview && (
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/20 flex-shrink-0">
                        <img src={receiptPreview} alt="Receipt Preview" className="w-full h-full object-cover" />
                        <button
                          onClick={() => { setReceiptImage(null); setReceiptPreview(null); }}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition"
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
                    className="border border-white/15 text-slate-300 hover:bg-white/10 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition"
                  >
                    بازگشت
                  </button>
                  <button
                    onClick={handleSubmitCardReceipt}
                    disabled={loading}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
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
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/10 text-xs space-y-2 dir-rtl shadow-inner">
              <div className="flex justify-between">
                <span className="text-slate-400">شماره فاکتور:</span>
                <span className="font-mono font-bold text-white">{currentInvoice.invoiceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">مبلغ واریزی:</span>
                <span className="font-bold text-emerald-400 font-mono">$ {currentInvoice.amountUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">معادل تومان:</span>
                <span className="font-bold text-cyan-400 font-mono">
                  {currentInvoice.amountToman.toLocaleString()} تومان
                </span>
              </div>
            </div>

            {/* Connection Badge */}
            <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 flex items-center gap-2">
              <i className="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
              <span>درگاه مستقیم تتر: استعلام و تایید واریز شما به صورت خودکار و آنی انجام خواهد شد.</span>
            </div>

            {/* Network Selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedNetwork('bsc')}
                className={`py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center justify-center gap-1.5 ${
                  selectedNetwork === 'bsc'
                    ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-md shadow-amber-500/20 ring-1 ring-amber-400/50'
                    : 'border-white/10 bg-slate-900/60 text-slate-300 hover:bg-slate-900/90'
                }`}
              >
                <i className="fa-solid fa-bolt text-amber-400 text-xs"></i>
                <span>BSC (BEP20 - پیش‌فرض)</span>
              </button>
              <button
                onClick={() => setSelectedNetwork('trc20')}
                className={`py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center justify-center gap-1.5 ${
                  selectedNetwork === 'trc20'
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/50'
                    : 'border-white/10 bg-slate-900/60 text-slate-300 hover:bg-slate-900/90'
                }`}
              >
                <span>TRC20 (ترون)</span>
              </button>
            </div>

            {/* Deposit Address Box */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-300">
                آدرس ولت واریز تتر:
              </label>
              <div className="flex items-center border border-white/15 rounded-xl overflow-hidden bg-slate-900/90">
                <input
                  type="text"
                  readOnly
                  value={depositAddress}
                  className="w-full p-2.5 text-xs font-mono font-bold text-cyan-300 bg-transparent dir-ltr focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(depositAddress);
                    onShowToast('آدرس ولت کپی شد.', 'success');
                  }}
                  className="bg-cyan-500 hover:bg-cyan-400 text-white px-3.5 py-2.5 text-xs font-bold cursor-pointer transition shrink-0"
                >
                  کپی
                </button>
              </div>
            </div>

            {/* TXID Submission Input */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-bold text-slate-300">
                ثبت کد پیگیری / Hash تراکنش (TXID):
              </label>
              <input
                type="text"
                placeholder="کد TXID دریافت شده از کیف‌پول خود را وارد کنید"
                value={txidInput}
                onChange={(e) => setTxidInput(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/15 rounded-xl p-3 text-xs font-mono text-white text-center focus:outline-none focus:border-cyan-400 dir-ltr shadow-inner"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setCurrentInvoice(null)}
                className="border border-white/15 text-slate-300 hover:bg-white/10 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition"
              >
                بازگشت
              </button>
              <button
                onClick={handleVerifyTxid}
                disabled={loading}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
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
