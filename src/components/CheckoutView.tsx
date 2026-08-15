import React, { useState } from 'react';
import { ViewState, CartItem, LoggedInUser } from '../types';
import { Currency, formatPrice } from '../utils/currency';
import CurrencySelector from './CurrencySelector';
import { publishOrder } from '../utils/orderBus';
import { handleImageError } from '../utils/imageFallback';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistance, convertAndFormatProductWeight } from '../utils/measurement';

interface CheckoutViewProps {
  setView: (view: ViewState) => void;
  cart: CartItem[];
  clearCart: () => void;
  addToast: (msg: string) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  sessionUser?: LoggedInUser | null;
  onCheckoutSuccess?: () => void;
  measurementSystem?: 'US' | 'IND';
}

export default function CheckoutView({ 
  setView, 
  cart, 
  clearCart, 
  addToast,
  currency,
  setCurrency,
  sessionUser,
  onCheckoutSuccess,
  measurementSystem = 'US'
}: CheckoutViewProps) {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [address, setAddress] = useState('Community Block A Hub Lockers');
  const [name, setName] = useState('Sarah Jenkins');
  const [checkoutCountryCode, setCheckoutCountryCode] = useState(() => {
    return measurementSystem === 'IND' ? '+91' : '+1';
  });
  const [phone, setPhone] = useState('(555) 392-0948');
  const [notes, setNotes] = useState('Beware of dog if household deliver requested.');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // UPI integration states
  const [upiRedirectionApp, setUpiRedirectionApp] = useState('');
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const [upiVpa, setUpiVpa] = useState('');
  const [orderPlacedTime, setOrderPlacedTime] = useState('');
  const [orderPlacedDate, setOrderPlacedDate] = useState('');

  // Cart totals math
  const cartPriceTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  const hubDropFee = cartPriceTotal > 0 ? 1.50 : 0;
  const ecoConservationTip = 1.00;
  const ledgerTotal = cartPriceTotal + hubDropFee + ecoConservationTip;

  const triggerUpiRedirect = (appName: string) => {
    if (cart.length === 0) {
      addToast("Your harvest selection is empty!");
      return;
    }
    setUpiRedirectionApp(appName);
    setRedirectCountdown(3);
    addToast(`📲 Redirecting automatically to ${appName}... Completed payment goes back to website!`);

    // Standard deep-linking request format
    const upiLink = `upi://pay?pa=zenvego@okaxis&pn=Zenvego%20Farmers%20Market&am=${ledgerTotal.toFixed(2)}&cu=INR&tn=ZVG-902-Order`;
    try {
      const a = document.createElement('a');
      a.href = upiLink;
      a.click();
    } catch (err) {
      console.warn("Deep-link trigger caught (Redirect simulation running):", err);
    }

    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          const now = new Date();
          setOrderPlacedTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }));
          setOrderPlacedDate(now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
          
          setIsSuccess(true);
          setUpiRedirectionApp('');
          if (onCheckoutSuccess) {
            onCheckoutSuccess();
          }
          addToast("🎉 UPI Payment authorized! Directed back to website.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      addToast("Order cart is empty! Add crops from marketplace first.");
      return;
    }

    if (paymentMethod === 'upi') {
      triggerUpiRedirect('Secure UPI Portal');
      return;
    }

    if (paymentMethod === 'card') {
      setIsPlacingOrder(true);
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        addToast("Razorpay SDK failed to load. Please check your connection.");
        setIsPlacingOrder(false);
        return;
      }

      const options = {
        key: "rzp_test_YOUR_KEY_HERE", // Test mode key (0 cost)
        amount: Math.round(ledgerTotal * 100), // amount in cents/paise
        currency: currency === 'INR' ? 'INR' : 'USD',
        name: "ZenVego Farm Market",
        description: "Fresh Organic Produce Order",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDoAL8ofMRyL8kK_sYXBp_4J5XwePZQ_K1_9StG4EkZdaYa9qxrtabVpwVkHWzfWg74YTz3ckjzbmsxnK0g7N57RVGNRxSwjLbgcrRUORPa-F9ev2RJAGll9ppZfPmCRTfQX9YWhyapxPnIZrWy6QcEXlEM70Fz8RfF9pfTjirT1urJ7-p8nC8WRmswBLMypTur2EmDoonUeyCHUDRGRUYKZ3oNzHPuqwIfadVdEr-5QnPca_F8mDfT5wYs2UVqEesaGf-2GjxHEdsq",
        handler: function (response: any) {
          setIsPlacingOrder(false);
          const now = new Date();
          setOrderPlacedTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }));
          setOrderPlacedDate(now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
          setIsSuccess(true);
          if (onCheckoutSuccess) {
            onCheckoutSuccess();
          }
          addToast("🎉 Payment Successful via Razorpay Test Mode!");
        },
        prefill: {
          name: name,
          email: "customer@zenvego.com",
          contact: phone
        },
        theme: {
          color: "#0f5238"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
         setIsPlacingOrder(false);
         addToast("Payment Failed: " + response.error.description);
      });
      rzp.open();
      return;
    }

    // Fallback for other methods (COD, Digital, Voice)
    setIsPlacingOrder(true);
    setTimeout(() => {
      setIsPlacingOrder(false);
      const now = new Date();
      setOrderPlacedTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }));
      setOrderPlacedDate(now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
      setIsSuccess(true);
      if (onCheckoutSuccess) {
        onCheckoutSuccess();
      }
      addToast("Transaction authenticated on local community ledger!");
    }, 2200);
  };


  const handleFinalizeSuccess = () => {
    clearCart();
    setView('buyer-account'); // Redirect to profile to track recent active drop-off
  };

  return (
    <div id="checkout-container" className="min-h-screen bg-background flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-surface-container py-3 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('buyer-marketplace')}>
          <span className="material-symbols-outlined text-primary hover:bg-surface-container p-2 rounded-full transition-colors">arrow_back</span>
          <div>
            <h2 className="text-base font-bold text-on-surface">Digital Cashier Console</h2>
            <p className="text-[10px] text-outline uppercase font-semibold">Ledger & Securi-pay</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <CurrencySelector currency={currency} setCurrency={setCurrency} />
          <button 
            onClick={() => setView('buyer-marketplace')}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Modify selection
          </button>
        </div>
      </header>

      {/* Checkout Screen Split Column */}
      <div className="flex-grow p-4 md:p-8 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left half: form inputs */}
        <form onSubmit={handlePlaceOrder} className="md:col-span-7 space-y-6">
          
          {/* Sourcing Location details selector */}
          <div className="bg-white rounded-3xl p-6 border border-surface-container space-y-4 shadow-sm">
            <h3 className="font-extrabold text-on-surface text-base flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">local_shipping</span>
              Hub dropoff & Delivery Destination
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              <div 
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${address === 'Community Block A Hub Lockers' ? 'border-primary bg-primary/5' : 'border-surface-container-high hover:border-surface-container-highest'}`}
                onClick={() => setAddress('Community Block A Hub Lockers')}
              >
                <div className="flex justify-between items-center">
                  <p className="font-bold text-xs text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-primary">location_away</span>
                    Collect at Central Block A Lockers (Free)
                  </p>
                  {address === 'Community Block A Hub Lockers' && (
                    <span className="material-symbols-outlined text-primary text-[20px] fill-icon">check_circle</span>
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant mt-1.5 leading-relaxed">
                  Crops delivered fresh at 4:30 PM. Keep lock-box entry PIN secure. Less emissions, zero waste!
                </p>
              </div>

              <div 
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${address === 'Sarah Household Delivery / Apt 12' ? 'border-primary bg-primary/5' : 'border-surface-container-high hover:border-surface-container-highest'}`}
                onClick={() => setAddress('Sarah Household Delivery / Apt 12')}
              >
                <div className="flex justify-between items-center">
                  <p className="font-bold text-xs text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-secondary">home</span>
                    Direct Household Delivery (+$1.50)
                  </p>
                  {address === 'Sarah Household Delivery / Apt 12' && (
                    <span className="material-symbols-outlined text-primary text-[20px] fill-icon">check_circle</span>
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant mt-1.5 leading-relaxed">
                  Address: Apt 12, Block A Grand Heights, 102 Green St. Left on courier porch basket.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-outline uppercase block">Contact Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-surface-container px-3 py-2 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-outline uppercase block">Active Courier Pin/Phone</label>
                <div className="flex gap-1.5 font-sans">
                  <select
                    value={checkoutCountryCode}
                    onChange={(e) => setCheckoutCountryCode(e.target.value)}
                    className="bg-background border border-surface-container px-2 pb-1.5 pt-1 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+61">🇦🇺 +61</option>
                  </select>
                  <input 
                    type="text" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-background border border-surface-container px-3 py-2 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-outline uppercase block">Courier Notes / Dog Alerts</label>
              <input 
                type="text" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-background border border-surface-container px-3 py-2 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Payment Method Ledger Selection */}
          <div className="bg-white rounded-3xl p-6 border border-surface-container space-y-4 shadow-sm">
            <h3 className="font-extrabold text-on-surface text-base flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">credit_card</span>
              Secure Community Payment Node
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-2 px-1 rounded-xl border text-[10px] font-bold transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${paymentMethod === 'card' ? 'border-primary bg-primary/5 text-primary' : 'border-surface-container text-outline hover:text-on-surface'}`}
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                <span>Debit Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`py-2 px-1 rounded-xl border text-[10px] font-bold transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${paymentMethod === 'upi' ? 'border-primary bg-primary/5 text-primary' : 'border-surface-container text-outline hover:text-on-surface'}`}
              >
                <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                <span className="leading-none text-center">UPI / QR</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('digital')}
                className={`py-2 px-1 rounded-xl border text-[10px] font-bold transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${paymentMethod === 'digital' ? 'border-primary bg-primary/5 text-primary' : 'border-surface-container text-outline hover:text-on-surface'}`}
              >
                <span className="material-symbols-outlined text-[18px]">eco</span>
                <span>Credits</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('voice')}
                className={`py-2 px-1 rounded-xl border text-[10px] font-bold transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${paymentMethod === 'voice' ? 'border-primary bg-primary/5 text-primary' : 'border-surface-container text-outline hover:text-on-surface'}`}
              >
                <span className="material-symbols-outlined text-[18px]">mic_none</span>
                <span>Vocal</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('cod')}
                className={`col-span-2 sm:col-span-1 py-2 px-1 rounded-xl border text-[10px] font-bold transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${paymentMethod === 'cod' ? 'border-primary bg-primary/5 text-primary' : 'border-surface-container text-outline hover:text-on-surface'}`}
              >
                <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                <span>Pay on Drop</span>
              </button>
            </div>

            {paymentMethod === 'card' && (
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase block">Card number (Encrypted)</label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">lock</span>
                    <input 
                      type="text" 
                      placeholder="•••• •••• •••• 4292"
                      className="w-full bg-background border border-surface-container pl-10 pr-3 py-2.5 rounded-xl text-xs text-on-surface font-mono"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase block">Expiration</label>
                    <input 
                      type="text" 
                      placeholder="09 / 28" 
                      className="w-full bg-background border border-surface-container px-3 py-2.5 rounded-xl text-xs text-on-surface text-center font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase block">CVC Security code</label>
                    <input 
                      type="password" 
                      placeholder="•••" 
                      className="w-full bg-background border border-surface-container px-3 py-2.5 rounded-xl text-xs text-on-surface text-center font-mono"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'upi' && (
              <div className="space-y-4 pt-2 border-t border-surface-container/40">
                <div className="bg-surface-container border border-surface-container-high p-4 rounded-2xl flex flex-col items-center">
                  {/* UPI Header info */}
                  <div className="w-full flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider font-mono">BHIM UPI QR SCANNER</span>
                    <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                      Instant Settlement
                    </span>
                  </div>

                  {/* High Quality SVG UPI QR Code with scanning laser line */}
                  <div className="relative w-40 h-40 bg-white p-3 rounded-2xl border border-surface-container shadow-xs flex items-center justify-center group overflow-hidden">
                    {/* Pulsing Scan Laser Line */}
                    <div className="absolute left-0 right-0 h-[1.5px] bg-primary/70 shadow-[0_0_8px_rgba(15,82,56,0.6)] animate-scan-line"></div>
                    
                    {/* SVG representation of standard QR Code */}
                    <svg viewBox="0 0 100 100" className="w-full h-full text-[#271810] font-bold select-none">
                      <rect width="100" height="100" fill="#ffffff" />
                      {/* Top-left pattern */}
                      <rect x="5" y="5" width="24" height="24" fill="currentColor" />
                      <rect x="9" y="9" width="16" height="16" fill="#ffffff" />
                      <rect x="13" y="13" width="8" height="8" fill="currentColor" />
                      
                      {/* Top-right pattern */}
                      <rect x="71" y="5" width="24" height="24" fill="currentColor" />
                      <rect x="75" y="9" width="16" height="16" fill="#ffffff" />
                      <rect x="79" y="13" width="8" height="8" fill="currentColor" />
                      
                      {/* Bottom-left pattern */}
                      <rect x="5" y="71" width="24" height="24" fill="currentColor" />
                      <rect x="9" y="75" width="16" height="16" fill="#ffffff" />
                      <rect x="13" y="79" width="8" height="8" fill="currentColor" />
                      
                      {/* Alignment pattern helper */}
                      <rect x="75" y="75" width="8" height="8" fill="currentColor" />
                      <rect x="77" y="77" width="4" height="4" fill="#ffffff" />
                      
                      {/* Mock QR-code data noise blocks to look authentic */}
                      <rect x="34" y="5" width="4" height="8" fill="currentColor" />
                      <rect x="42" y="5" width="8" height="4" fill="currentColor" />
                      <rect x="54" y="5" width="12" height="4" fill="currentColor" />
                      <rect x="34" y="17" width="16" height="4" fill="currentColor" />
                      <rect x="42" y="13" width="4" height="12" fill="currentColor" />
                      <rect x="54" y="13" width="8" height="8" fill="currentColor" />
                      
                      <rect x="34" y="25" width="12" height="4" fill="currentColor" />
                      <rect x="50" y="25" width="4" height="12" fill="currentColor" />
                      <rect x="58" y="25" width="8" height="4" fill="currentColor" />
                      
                      <rect x="5" y="34" width="16" height="4" fill="currentColor" />
                      <rect x="25" y="34" width="4" height="12" fill="currentColor" />
                      <rect x="13" y="42" width="12" height="4" fill="currentColor" />
                      <rect x="34" y="38" width="8" height="8" fill="currentColor" />
                      <rect x="46" y="38" width="16" height="4" fill="currentColor" />
                      <rect x="58" y="34" width="12" height="12" fill="currentColor" />
                      <rect x="71" y="34" width="4" height="16" fill="currentColor" />
                      <rect x="79" y="34" width="16" height="4" fill="currentColor" />
                      <rect x="87" y="42" width="8" height="8" fill="currentColor" />
                      
                      <rect x="5" y="54" width="8" height="4" fill="currentColor" />
                      <rect x="17" y="54" width="12" height="8" fill="currentColor" />
                      <rect x="34" y="50" width="4" height="16" fill="currentColor" />
                      <rect x="42" y="54" width="16" height="4" fill="currentColor" />
                      <rect x="62" y="50" width="4" height="12" fill="currentColor" />
                      
                      <rect x="71" y="54" width="12" height="4" fill="currentColor" />
                      <rect x="87" y="54" width="8" height="4" fill="currentColor" />
                      
                      <rect x="34" y="71" width="12" height="4" fill="currentColor" />
                      <rect x="50" y="71" width="4" height="16" fill="currentColor" />
                      <rect x="58" y="71" width="8" height="4" fill="currentColor" />
                      
                      <rect x="34" y="83" width="4" height="12" fill="currentColor" />
                      <rect x="42" y="79" width="16" height="4" fill="currentColor" />
                      <rect x="46" y="87" width="12" height="8" fill="currentColor" />
                      <rect x="62" y="83" width="4" height="12" fill="currentColor" />
                      
                      {/* Mini Zenvego Logo inside the QR screen */}
                      <rect x="43" y="43" width="14" height="14" rx="3" fill="#0f5238" />
                      <polygon points="46,50 50,47 54,50 50,53" fill="#ffffff" />
                    </svg>
                  </div>

                  <p className="text-xs font-mono font-bold text-on-surface mt-3">
                    Merchant UPI: <span className="underline select-all text-primary">zenvego@okaxis</span>
                  </p>
                  
                  <div className="flex items-center gap-1.5 mt-2.5">
                    <button 
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('zenvego@okaxis');
                        addToast("📋 UPI ID Copied!");
                      }}
                      className="text-[9px] font-extrabold bg-white hover:bg-surface-container-high py-1 px-3 border border-surface-container rounded-lg text-outline hover:text-on-surface transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[12px]">content_copy</span>
                      Copy ID
                    </button>
                    <button 
                      type="button"
                      onClick={() => triggerUpiRedirect('UPI QR Code Scanner')}
                      className="text-[9px] font-extrabold bg-primary hover:bg-primary-container text-white py-1 px-3 rounded-lg transition-all flex items-center gap-1 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                      Simulate QR Scan
                    </button>
                  </div>
                </div>

                {/* Direct Tap apps */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-outline uppercase block">Secure One-Tap Direct launch UPI App</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => triggerUpiRedirect('Google Pay')}
                      className="bg-white border border-surface-container hover:border-blue-500 rounded-xl py-2 px-1 flex flex-col items-center justify-center gap-1 transition-all group hover:bg-blue-50/10 cursor-pointer shadow-xs"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[10px] uppercase font-mono group-hover:scale-110 transition-transform">G</div>
                      <span className="text-[9px] font-bold text-[#3c4043]">Google Pay</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerUpiRedirect('PhonePe')}
                      className="bg-white border border-surface-container hover:border-purple-500 rounded-xl py-2 px-1 flex flex-col items-center justify-center gap-1 transition-all group hover:bg-purple-50/10 cursor-pointer shadow-xs"
                    >
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-[10px] uppercase font-mono group-hover:scale-110 transition-transform">P</div>
                      <span className="text-[9px] font-bold text-[#3c4043]">PhonePe</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerUpiRedirect('Paytm')}
                      className="bg-white border border-surface-container hover:border-cyan-500 rounded-xl py-2 px-1 flex flex-col items-center justify-center gap-1 transition-all group hover:bg-cyan-50/10 cursor-pointer shadow-xs"
                    >
                      <div className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 font-bold text-[10px] uppercase font-mono group-hover:scale-110 transition-transform">Py</div>
                      <span className="text-[9px] font-bold text-[#3c4043]">Paytm</span>
                    </button>
                  </div>
                </div>

                {/* Direct UPI request VPA collect */}
                <div className="space-y-1.5 pt-1.5 border-t border-dashed border-surface-container">
                  <span className="text-[10px] font-bold text-outline uppercase block">Or Request via UPI ID / VPA</span>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. sarahjenkins@okaxis"
                      value={upiVpa}
                      onChange={(e) => setUpiVpa(e.target.value)}
                      className="flex-1 bg-background border border-surface-container px-3 py-1.5 rounded-xl text-xs text-on-surface font-mono text-center focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!upiVpa.trim() || !upiVpa.includes('@')) {
                          addToast("⚠️ Please enter a valid UPI VPA ID (e.g. name@upi)");
                          return;
                        }
                        triggerUpiRedirect(`UPI ID Account (${upiVpa.trim()})`);
                      }}
                      className="px-3 py-1.5 bg-secondary hover:bg-secondary-container rounded-xl text-xs font-bold text-white transition-all shadow-xs shrink-0"
                    >
                      Req Pay
                    </button>
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'digital' && (
              <div className="p-3 rounded-2xl bg-surface-container text-xs text-primary font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined">account_balance_wallet</span>
                <span>Available balance: 42.50 ZenCredits. You can apply them fully!</span>
              </div>
            )}

            {paymentMethod === 'voice' && (
              <div className="p-3 rounded-2xl bg-[#fff8eb] border border-[#ffe0b2] text-xs text-[#b78103] font-semibold space-y-1.5">
                <p className="flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-[16px]">spatial_audio</span>
                  Biometric Vocal Authorization Node
                </p>
                <p className="font-normal text-[11px] leading-relaxed">
                  Authorize your community ledger contract by speaking "Confirm community harvest 42" when submitting.
                </p>
              </div>
            )}

            {paymentMethod === 'cod' && (
              <div className="p-4 rounded-2xl bg-[#f5f9f6] border border-[#0f5238]/15 text-xs text-[#0f5238] space-y-2">
                <p className="flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                  Cash on Delivery (COD) Select
                </p>
                <p className="font-normal text-[11px] leading-relaxed text-[#271810]/75">
                  Your harvest reservation will be dropoff-ready directly! Settle the ledger securely with the rider/neighborhood courier via physical cash or by scanning their routing QR code at checkout delivery.
                </p>
              </div>
            )}
          </div>

          <button
            id="btn-confirm-booking"
            type="submit"
            disabled={isPlacingOrder || cart.length === 0}
            className={`w-full font-bold text-sm text-white py-4 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 ${cart.length === 0 ? 'bg-surface-dim cursor-not-allowed' : 'bg-primary hover:bg-primary-container hover:shadow-lg'}`}
          >
            {isPlacingOrder ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing community ledger contract...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">electric_car</span>
                Place Express Delivery Order - 30-40 Mins ({formatPrice(ledgerTotal, currency)})
              </>
            )}
          </button>
        </form>

        {/* Right half: Summary Sidebar */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-surface-container overflow-hidden shadow-sm">
            <div className="bg-primary/5 px-6 py-4 border-b border-surface-container flex justify-between items-center">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Your Harvest Cart</span>
              <span className="text-[10px] font-mono bg-primary text-white font-bold px-2 py-0.5 rounded-md">30-40 MIN DELIVERY</span>
            </div>

            <div className="p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-6 text-xs text-outline space-y-2">
                  <span className="material-symbols-outlined text-[36px] text-surface-dim">shopping_basket</span>
                  <p>No crops selected. Browse the crops first!</p>
                </div>
              ) : (
                <div className="space-y-3 divide-y divide-surface-container">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 pt-3 first:pt-0">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          onError={(e) => handleImageError(e, 'produce')}
                          className="w-10 h-10 rounded-xl object-cover border border-surface-container-high" 
                        />
                        <div>
                          <p className="font-bold text-on-surface text-xs leading-tight line-clamp-1">{item.name}</p>
                          <p className="text-[10px] text-outline mt-0.5">{item.farm} • Qty {item.quantity}</p>
                        </div>
                      </div>
                      <span className="font-bold text-xs text-[#271810]">{formatPrice(item.price * item.quantity, currency)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Price calculations */}
              <div className="pt-4 border-t border-surface-container space-y-2 text-xs">
                <div className="flex justify-between text-outline">
                  <span>Reserved Harvest Total:</span>
                  <span className="font-semibold text-on-surface">{formatPrice(cartPriceTotal, currency)}</span>
                </div>
                <div className="flex justify-between text-outline">
                  <span>Neighborhood Hub Drop Fee:</span>
                  <span className="font-semibold text-on-surface">{formatPrice(hubDropFee, currency)}</span>
                </div>
                <div className="flex justify-between text-outline">
                  <span>Farmer Conservation Levy:</span>
                  <span className="font-semibold text-on-surface">{formatPrice(ecoConservationTip, currency)}</span>
                </div>

                <div className="pt-3 border-t border-dashed border-surface-container-high flex justify-between items-center text-sm font-extrabold text-on-surface">
                  <span className="flex items-center gap-1 text-primary">
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    Ledger Booking Total
                  </span>
                  <span className="text-primary text-base">{formatPrice(ledgerTotal, currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Environmental Sourcing Offsets widgets */}
          <div className="bg-[#eaf6f0] rounded-3xl p-6 border border-[#cbe5d7] space-y-3 shadow-none">
            <h4 className="font-bold text-primary text-xs flex items-center gap-1.5 uppercase tracking-wide">
              <span className="material-symbols-outlined text-[18px]">energy_savings_leaf</span>
              Community Planet Offset
            </h4>
            <p className="text-xs text-primary-container leading-relaxed">
              Reserving directly from <strong>Sunny Hills Organic</strong> and local bakers bypasses <strong>{formatDistance(42, measurementSystem)}</strong> of central transit cold chain storage and massive warehouse waste.
            </p>
            <div className="flex items-center justify-between text-xs font-bold text-primary pt-1.5 border-t border-[#c6dfd2]">
              <span>Carbon Bypassed:</span>
              <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-mono">4.2 kg CO₂ Saved</span>
            </div>
          </div>
        </div>
      </div>

      {/* UPI Redirection Modal Simulator */}
      {upiRedirectionApp && (
        <div className="fixed inset-0 bg-[#0f5238]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 z-50 text-white select-none">
          <div className="text-center space-y-6 max-w-sm">
            <div className="relative flex items-center justify-center">
              {/* Outer spinning ring */}
              <div className="w-24 h-24 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
              {/* Central mobile icon */}
              <span className="material-symbols-outlined absolute text-[40px] text-white animate-pulse">cell_phone</span>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Launching {upiRedirectionApp}</h3>
              <p className="text-xs text-white/80 leading-relaxed px-4">
                We are securely transmitting transaction payload to your native payment application. Please verify details and authorize.
              </p>
            </div>

            {/* Simulated terminal logs */}
            <div className="bg-black/30 p-4 rounded-2xl border border-white/10 text-left font-mono text-[10px] space-y-1">
              <p className="text-emerald-300">➜ Initiating secure handoff...</p>
              <p className="text-white/60">💰 Amount: {formatPrice(ledgerTotal, currency)}</p>
              <p className="text-white/60 font-semibold">🔑 VPA: zenvego@okaxis</p>
              <p className="text-emerald-400 font-bold">⚡ Status: Waiting for user PIN input...</p>
            </div>

            {/* Countdown automatic bypass widget */}
            <div className="pt-2 text-xs">
              <p className="text-white/70 font-bold">Returning to website automatically in</p>
              <div className="text-3xl font-black mt-1 text-amber-300 animate-bounce">
                {redirectCountdown} <span className="text-xs">seconds</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => {
                // Instantly bypass countdown
                const now = new Date();
                setOrderPlacedTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }));
                setOrderPlacedDate(now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
                setIsSuccess(true);
                setUpiRedirectionApp('');
                if (onCheckoutSuccess) {
                  onCheckoutSuccess();
                }
              }}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-all border border-white/10 cursor-pointer"
            >
              Skip Redirect & Verify
            </button>
          </div>
        </div>
      )}

      {/* Success Modal Overlay */}
      {isSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto select-none">
          {/* Confetti nodes mapping */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(30)].map((_, i) => {
              const left = Math.random() * 100;
              const delay = Math.random() * 4;
              const size = Math.random() * 8 + 6;
              const color = i % 2 === 0 ? '#0f5238' : i % 3 === 0 ? '#ff5c3e' : '#ffcfba';
              return (
                <div 
                  key={i}
                  style={{
                    left: `${left}%`,
                    animationDelay: `${delay}s`,
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: color,
                    borderRadius: i % 4 === 0 ? '50%' : '2px',
                    position: 'absolute',
                  }}
                  className="animate-confetti"
                />
              );
            })}
          </div>

          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="bg-white rounded-[32px] max-w-md w-full p-8 text-center space-y-6 shadow-2xl border border-surface-container relative overflow-hidden"
          >
            {/* Stamp certification watermark */}
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-primary/5 rounded-full border border-primary/10 flex items-center justify-center p-6 text-primary rotate-12 select-none">
              <span className="text-[9px] font-black uppercase tracking-widest text-center">Approved Community</span>
            </div>

            <div className="w-16 h-16 bg-[#e2f5ec] text-primary rounded-full flex items-center justify-center mx-auto shadow-sm relative">
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="material-symbols-outlined text-[36px] fill-icon text-primary"
              >
                check_circle
              </motion.span>
              <div className="absolute inset-0 h-full w-full rounded-full border border-primary animate-ping opacity-25"></div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-[#271810]">Order Dispatched Successfully!</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed px-2">
                Your direct delivery order <strong className="text-primary">#ZVG-902-LEDGER</strong> has been successfully authorized and registered for express drop-off!
              </p>
            </div>

            {/* Timings and Ledger receipts log (Exact Order Placed Time) */}
            <div className="bg-surface-container p-4 rounded-2xl border border-surface-container-high text-left space-y-2.5">
              <div className="flex justify-between items-center text-[11px] border-b border-surface-container-high pb-2">
                <span className="text-outline font-semibold font-mono">Ledger Settlement:</span>
                <span className={`font-extrabold flex items-center gap-1 ${paymentMethod === 'cod' ? 'text-amber-600' : 'text-primary'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${paymentMethod === 'cod' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                  {paymentMethod === 'cod' ? 'PAY ON DROP (COD)' : 'PAID & SETTLED'}
                </span>
              </div>
              
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-outline col">Order Placed Time:</span>
                  <span className="font-mono font-bold text-[#b5270e] bg-red-50 px-2 py-0.5 rounded border border-red-100 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                    {orderPlacedTime || "11:25:34 AM"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-outline">Placement Date:</span>
                  <span className="font-semibold text-on-surface">{orderPlacedDate || "June 22, 2026"}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-outline">{paymentMethod === 'cod' ? 'Amount Due on Drop:' : 'Amount Settled:'}</span>
                  <span className="font-black text-primary font-mono">{formatPrice(ledgerTotal, currency)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-outline font-semibold">Source Gateway:</span>
                  <span className="font-mono text-outline uppercase">{paymentMethod === 'upi' ? 'Unified Payments Interface' : paymentMethod === 'card' ? 'Cryptographic Visa Card' : paymentMethod === 'digital' ? 'Local ZenCredits Wallet' : paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Biometric Audio Ledger'}</span>
                </div>
              </div>
            </div>

            {/* Alex River Live Step bike tracker */}
            <div className="border border-surface-container bg-surface-container-low p-4 rounded-2xl space-y-3">
              <div className="flex justify-between items-center text-[10px] font-extrabold text-outline uppercase">
                <span>Courier Tracker</span>
                <span className="text-primary font-black animate-pulse">Alex River is Biking</span>
              </div>
              
              {/* Bike track slider */}
              <div className="relative h-2 bg-surface-container-high rounded-full overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 bg-primary rounded-full animate-progress-fast"></div>
              </div>

              {/* Steps markers */}
              <div className="grid grid-cols-3 text-center text-[9px] font-bold text-outline">
                <span className="text-left text-primary">Harvest Packed</span>
                <span className="text-center font-black text-secondary">Alex Enroute</span>
                <span className="text-right">Dropoff Lockers</span>
              </div>
            </div>

            {/* Plated Ratatouille reward recipe */}
            <div className="bg-[#fcf7f3] p-3.5 rounded-2xl border border-[#ede3da] relative overflow-hidden text-left flex items-center gap-3">
              <span className="absolute top-2 right-2 bg-[#b5270e] text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full leading-none">RECIPE GIFT</span>
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFWJVcwNG1CKGaxq-YvECKdqXLr5OjnpfA0tYS76_HQ0eGyYRMzBhIhmmRYhrsJ9ZDNOuurLuFb1O7Vl8KVVtaCiQN2mcqpnG15F0m9kYCQpoQu4pPnZCdyVUc4lIo-anvQvbzcTUTF7qj0_EKBKklGEkEFdNBe2NatnG5G7nu9iC3eeKJqxx-PEf5p2kQivJl446_oK89Ug5j2K1e3HBIbL41SnTU6Afb7KuLZ_oBRo9mybmTlMYhmJd52Jixi0G3fM-f6TjDolZj" 
                alt="Plated Ratatouille" 
                referrerPolicy="no-referrer"
                onError={(e) => handleImageError(e, 'produce')}
                className="w-12 h-12 rounded-xl object-cover border border-[#ede3da] shrink-0" 
              />
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-on-surface">Heirloom Ratatouille Recipe Unlocked!</p>
                <p className="text-[9px] text-[#7a5743] leading-tight">We matched recipes based on your tomato selection.</p>
              </div>
            </div>

            <button
              onClick={handleFinalizeSuccess}
              className="w-full bg-primary hover:bg-primary-container text-white font-black py-4 rounded-2xl text-xs transition-colors shadow-sm cursor-pointer"
            >
              Go to Sarah Jenkins Dashboard
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
