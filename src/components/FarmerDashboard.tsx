import React, { useState, useEffect } from 'react';
import { ViewState, LoggedInUser } from '../types';
import { Currency, formatPrice } from '../utils/currency';
import CurrencySelector from './CurrencySelector';
import { handleImageError } from '../utils/imageFallback';
import { subscribeToOrders, seedDefaultOrders, publishOrder, fetchOrders, LiveOrder } from '../utils/orderBus';
import { Html5QrcodeScanner } from "html5-qrcode";

interface FarmerDashboardProps {
  setView: (view: ViewState) => void;
  addToast: (msg: string) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  sessionUser?: LoggedInUser | null;
  setSessionUser?: (user: LoggedInUser | null) => void;
  handleLogout?: () => void;
  measurementSystem: 'US' | 'IND';
}

export default function FarmerDashboard({ 
  setView, 
  addToast, 
  currency, 
  setCurrency,
  sessionUser,
  setSessionUser,
  handleLogout,
  measurementSystem
}: FarmerDashboardProps) {
  const [selectedRange, setSelectedRange] = useState('weekly');
  const [showScanStationModal, setShowScanStationModal] = useState(false);
  
  const salesHistory = [
    { day: "Mon", sales: 120, preorders: 34, co2Offset: 42 },
    { day: "Tue", sales: 180, preorders: 45, co2Offset: 63 },
    { day: "Wed", sales: 240, preorders: 60, co2Offset: 84 },
    { day: "Thu", sales: 190, preorders: 52, co2Offset: 66 },
    { day: "Fri", sales: 310, preorders: 84, co2Offset: 108 },
    { day: "Sat", sales: 420, preorders: 110, co2Offset: 147 },
    { day: "Sun", sales: 380, preorders: 95, co2Offset: 133 }
  ];

  const [incomingOrders, setIncomingOrders] = useState<LiveOrder[]>([]);

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const gainNode1 = audioCtx.createGain();
      osc1.connect(gainNode1);
      gainNode1.connect(audioCtx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gainNode1.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.4);

      const osc2 = audioCtx.createOscillator();
      const gainNode2 = audioCtx.createGain();
      osc2.connect(gainNode2);
      gainNode2.connect(audioCtx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gainNode2.gain.setValueAtTime(0.15, audioCtx.currentTime + 0.1);
      gainNode2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc2.start(audioCtx.currentTime + 0.1);
      osc2.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio context playback blocked", e);
    }
  };

  // Load and subscribe to order updates
  useEffect(() => {
    seedDefaultOrders();
    let isInitial = true;
    const unsubscribe = subscribeToOrders((liveOrders) => {
      setIncomingOrders((prev) => {
        if (!isInitial && liveOrders.length > prev.length) {
          playNotificationSound();
          const newOrder = liveOrders.find(mo => !prev.some(po => po.id === mo.id));
          if (newOrder) {
            addToast(`🔔 Express Order Arrived! ${newOrder.consumer} ordered ${newOrder.qty} of ${newOrder.item.replace('Organic ', '').replace('Heirloom ', '')}`);
          } else {
            addToast("🔔 New Express Order Arrived! Preparing dispatch.");
          }
        }
        isInitial = false;
        return liveOrders;
      });
    });
    return unsubscribe;
  }, []);

  const overallFeedback = [
    { score: "5/5", text: "Stunning tomato sweetness, completely clean and free of spots. Love Sunny Hills!", author: "Sarah J." },
    { score: "4.8/5", text: "Very sweet rainbow carrots. Delivered promptly to community lockers.", author: "Michael B." }
  ];

  const triggerExport = (type: 'daily' | 'weekly' | 'monthly') => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Transaction ID,Consumer,Item,Qty,Payout,Time\n";
    
    let exportData = [...incomingOrders];
    if (type === 'weekly') {
      exportData.push({ id: "TXN-01", consumer: "Weekly Buyer", item: "Bulk Produce", qty: "10 lbs", payout: 45.00, time: "2d ago" });
    } else if (type === 'monthly') {
      exportData.push({ id: "TXN-00", consumer: "Monthly Sub", item: "Monthly Box", qty: "20 lbs", payout: 120.00, time: "1w ago" });
    }

    exportData.forEach((row) => {
      csvContent += `${row.id},"${row.consumer}","${row.item}","${row.qty}",${row.payout},${row.time}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `zenvego_${type}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast(`📥 Exported ${type} dispatch manifest .CSV successfully!`);
  };

  const simulateNewOrder = () => {
    const newOrder: LiveOrder = { 
      id: `TXN-${Math.floor(10 + Math.random() * 90)}`, 
      consumer: "New Customer", 
      item: "Fresh Strawberries Box", 
      qty: "1 box", 
      payout: 8.50, 
      time: "Just now",
      status: 'pending',
      deliveryCode: 'ZVG-CONFIRM-902'
    };
    publishOrder(newOrder);
  };

  // Matching QR handoff scanner states
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [verificationInput, setVerificationInput] = useState('');
  
  const handleApproveHandover = () => {
    const cleanInput = verificationInput.trim().toUpperCase();
    if (cleanInput === '7749' || cleanInput.includes('7749') || cleanInput.includes('ZEN-RELEASE-7749')) {
      // Find the pending order and publish it as dispatched to the orderBus!
      const activeOrder = (JSON.parse(localStorage.getItem('zenvego_live_orders') || '[]') as LiveOrder[]).find((o: LiveOrder) => o.status === 'pending');
      if (activeOrder) {
        publishOrder({ ...activeOrder, status: 'dispatched' });
      }

      // Synchronize back to the active delivery job
      const activeJobRaw = localStorage.getItem('zenvego_active_delivery_job');
      if (activeJobRaw) {
        try {
          const parsed = JSON.parse(activeJobRaw);
          parsed.status = "Transit"; // This triggers the courier screen to shift coordinates!
          localStorage.setItem('zenvego_active_delivery_job', JSON.stringify(parsed));
        } catch(e) {}
      }
      addToast("✅ QR SCAN MATCHED: Courier identification verified! Sourcing cargo safely released.");
      setShowHandoffModal(false);
      setShowScanStationModal(false);
    } else {
      addToast("❌ Code Verification Mismatch. Ensure the Driver displays their correct autogen security QR.");
    }
  };

  const autofillScanCode = () => {
    // Autoload live code from storage for beautiful zero friction simulation
    const codeFromStorage = localStorage.getItem('zenvego_active_verification_code') || 'ZEN-RELEASE-7749';
    setVerificationInput(codeFromStorage);
    addToast("📷 Camera Optical Sweep Simulated: Scanned Courier QR Code successfully!");
  };

  // HTML5 QR Code Scanner Lifecycle
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    
    if (showScanStationModal) {
      // Small timeout to ensure the DOM node 'reader' is rendered before initializing
      setTimeout(() => {
        scanner = new Html5QrcodeScanner(
          "reader",
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          false
        );

        scanner.render(
          (decodedText) => {
            setVerificationInput(decodedText);
            addToast("📷 Live QR Code successfully scanned!");
            if (scanner) {
              scanner.clear().catch(e => console.error("Scanner clear error", e));
            }
          },
          (err) => { /* ignore */ }
        );
      }, 100);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error("Cleanup clear error", e));
      }
    };
  }, [showScanStationModal]);

  // Avatar Modal Handlers
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const EMOJI_OPTIONS = ['👨‍🌾', '👩‍🌾', '🚜', '🍅', '🥕', '🍎', '🌻', '🥦', '🐝', '🍄', '🌿', '🥑'];

  const generateEmojiAvatar = (emoji: string) => {
    // Generates a base64 SVG data URI for seamless integration with <img> tags
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#eefcf4" rx="50"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="55">${emoji}</text></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  const handleSelectEmoji = (emoji: string) => {
    if (sessionUser && setSessionUser) {
      const updatedUser = { ...sessionUser, avatar: generateEmojiAvatar(emoji) };
      setSessionUser(updatedUser);
      localStorage.setItem('zenvego_session_user', JSON.stringify(updatedUser));
      addToast(`Profile picture updated to ${emoji} successfully!`);
    }
    setShowAvatarModal(false);
  };

  return (
    <div id="farmer-dash-container" className="min-h-screen bg-[#fff8f6] text-[#271810] flex flex-col font-sans">
      
      {/* Header bar */}
      <header className="bg-white border-b border-[#ffeae0] py-3.5 px-4 md:px-8 sticky top-0 z-40 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="relative group cursor-pointer"
            onClick={() => setView('seller-account')}
            title="View Profile & Edit Photo"
          >
            <img 
              src={sessionUser?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuDoAL8ofMRyL8kK_sYXBp_4J5XwePZQ_K1_9StG4EkZdaYa9qxrtabVpwVkHWzfWg74YTz3ckjzbmsxnK0g7N57RVGNRxSwjLbgcrRUORPa-F9ev2RJAGll9ppZfPmCRTfQX9YWhyapxPnIZrWy6QcEXlEM70Fz8RfF9pfTjirT1urJ7-p8nC8WRmswBLMypTur2EmDoonUeyCHUDRGRUYKZ3oNzHPuqwIfadVdEr-5QnPca_F8mDfT5wYs2UVqEesaGf-2GjxHEdsq"} 
              alt={sessionUser?.name || "John Miller"} 
              referrerPolicy="no-referrer"
              onError={(e) => handleImageError(e, 'avatar')}
              className="w-11 h-11 rounded-full border-2 border-emerald-500/20 object-cover shadow-sm transition-all group-hover:opacity-75" 
            />
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[18px]">person</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-sm font-extrabold text-[#271810] flex items-center gap-1">
                {sessionUser ? sessionUser.name : "John Miller"} / Sunny Hills Organic
              </h1>
              <span className="material-symbols-outlined text-[14px] text-primary fill-icon" title="Verified Harvester">verified</span>
              <span className="relative flex h-2 w-2 ml-1" title="Real-time Order Sync Active">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-[10px] text-outline uppercase font-semibold">
              {sessionUser ? `Logged in via ${sessionUser.authMethod}` : "Decentralized Harvester Ledger Portal"}
            </p>
          </div>
        </div>

        {/* Header CTA Switcher */}
        <div className="flex items-center gap-2">
          <CurrencySelector currency={currency} setCurrency={setCurrency} />
          
          <button 
            onClick={() => setView('farmer-inventory')}
            className="bg-surface-container hover:bg-surface-container-highest text-primary font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">inventory_2</span>
            Inventory Management
          </button>
          
          <button 
            onClick={() => {
              if (handleLogout) {
                handleLogout();
              }
              setView('market-home');
            }}
            className="hover:bg-surface-container text-outline font-bold text-xs px-2.5 py-2 rounded-xl transition-all cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Grid content */}
      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Metric Cards top row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#ffeae0] shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Express Deliveries Value</span>
            <p className="text-2xl font-black text-emerald-700">{formatPrice(1830.00, currency)}</p>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[10px] font-bold">trending_up</span>
              +14% vs last drop
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#ffeae0] shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Ecosystem Rating</span>
            <p className="text-2xl font-black text-slate-800 flex items-center gap-1">
              4.92 <span className="material-symbols-outlined text-amber-500 text-[20px] fill-icon">star</span>
            </p>
            <span className="text-[10px] text-slate-400">Based on 142 voter ledger marks</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#ffeae0] shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Active Reserves Capacity</span>
            <p className="text-2xl font-black text-amber-600">82% Locked</p>
            <span className="text-[10px] text-emerald-700 font-semibold">14 bunches remaining</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#ffeae0] shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Carbon Saved Bypassed</span>
            <p className="text-2xl font-black text-[#0c6b41]">341.2 kg CO₂</p>
            <span className="text-[10px] text-slate-400">Zero storage chain emissions</span>
          </div>
        </div>

        {/* Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left: Sales Performance Chart */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-surface-container space-y-4 shadow-sm">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="font-extrabold text-on-surface text-base flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary">analytics</span>
                  Historical Community Express Order Volumes
                </h3>
                <p className="text-xs text-on-surface-variant">Real-time local ledger checkins</p>
              </div>

              {/* Time Range Selector */}
              <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl">
                <button 
                  onClick={() => setSelectedRange('weekly')} 
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${selectedRange === 'weekly' ? 'bg-white text-primary shadow-sm' : 'text-outline hover:text-on-surface'}`}
                >
                  Weekly
                </button>
                <button 
                  onClick={() => setSelectedRange('monthly')} 
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${selectedRange === 'monthly' ? 'bg-white text-primary shadow-sm' : 'text-outline hover:text-on-surface'}`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* Custom SVG High-Fidelity Chart */}
            <div className="pt-4">
              <div className="relative h-64 w-full flex items-end justify-between gap-2.5 pt-6 border-b border-surface-container-high px-2 pb-1 bg-[#fffdfc] rounded-2xl border border-surface-container-low">
                {/* Horizontal guide lines */}
                <div className="absolute left-0 right-0 top-1/4 border-b border-dashed border-surface-container-low/85"></div>
                <div className="absolute left-0 right-0 top-2/4 border-b border-dashed border-surface-container-low/85"></div>
                <div className="absolute left-0 right-0 top-3/4 border-b border-dashed border-surface-container-low/85"></div>

                {salesHistory.map((item, idx) => {
                  const barHeightPercent = (item.sales / 450) * 100;
                  const preorderHeightPercent = (item.preorders / 120) * 100;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative z-10">
                      {/* Interactive Tooltip Card */}
                      <div className="absolute bottom-full mb-2 bg-[#271810] text-white text-[10px] p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-white/10 text-center pointer-events-none">
                        <p className="font-bold">{item.day} Sells</p>
                        <p className="text-primary font-bold">Total: ${item.sales}</p>
                        <p className="text-[#a24000] font-bold">Reserves: {item.preorders}</p>
                        <p className="text-xs text-green-400">-{item.co2Offset}kg CO₂</p>
                      </div>

                      {/* Stacked Graphic columns */}
                      <div className="w-full max-w-[28px] rounded-t-lg bg-primary/10 hover:bg-primary/20 transition-colors h-48 flex items-end gap-[2px] justify-center overflow-hidden">
                        <div 
                          style={{ height: `${preorderHeightPercent}%` }} 
                          className="w-[8px] bg-secondary rounded-t"
                          title="Preorders limit"
                        ></div>
                        <div 
                          style={{ height: `${barHeightPercent}%` }} 
                          className="w-[12px] bg-primary rounded-t"
                          title="Sales volume"
                        ></div>
                      </div>

                      <span className="text-[10px] font-bold text-outline mt-2 block">{item.day}</span>
                    </div>
                  );
                })}
              </div>

              {/* Chart Legend */}
              <div className="flex justify-center gap-6 pt-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-primary rounded"></span>
                  <span className="text-on-surface-variant">General Market Purchases ($)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-secondary rounded"></span>
                  <span className="text-on-surface-variant">Express Delivery Orders</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Incoming Purchases list & Customer feedback */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Multi-Device & Scan Station Center */}
            <div className="bg-[#0f5238] rounded-3xl p-6 text-white space-y-4 shadow-sm relative overflow-hidden border border-[#1b6144]">
              <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/5 rounded-full pointer-events-none"></div>
              <div className="space-y-1">
                <span className="bg-white/10 text-emerald-300 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-white/10">
                  Multi-Tab Sync Engine
                </span>
                <h4 className="text-sm font-black flex items-center gap-1.5 pt-1">
                  <span className="material-symbols-outlined text-[16px] text-emerald-300">devices</span>
                  Multi-Device Scan Station
                </h4>
                <p className="text-[10.5px] text-emerald-100/80 leading-relaxed">
                  Open this dashboard on a secondary phone/tablet to configure it as a dedicated scan station. Sync is instant across all connected tabs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setVerificationInput('');
                  setShowScanStationModal(true);
                }}
                className="w-full bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                Launch Scan Station Mode
              </button>
            </div>

            {/* Real-time deliveries dispatch list */}
            <div className="bg-white rounded-3xl p-6 border border-[#ffeae0] space-y-4 shadow-sm flex-grow">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b border-[#ffeae0] pb-3">
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600">bookmark_manager</span>
                  Express Dispatch List
                </h3>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={simulateNewOrder}
                    className="text-xs font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">notifications_active</span>
                    Simulate Order
                  </button>
                  <select 
                    onChange={(e) => {
                      if(e.target.value) {
                        triggerExport(e.target.value as any);
                        e.target.value = "";
                      }
                    }}
                    className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1.5 rounded-lg hover:bg-slate-200 focus:outline-none cursor-pointer transition-colors"
                  >
                    <option value="">⬇️ Export Reports</option>
                    <option value="daily">Today's Orders (CSV)</option>
                    <option value="weekly">Weekly Income (CSV)</option>
                    <option value="monthly">Monthly Income (CSV)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {incomingOrders.map((txn, idx) => (
                  <div key={idx} className="p-5 rounded-2.5xl bg-white border border-[#ffeae0] shadow-sm hover:shadow-md hover:border-emerald-200 transition-all space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-base font-extrabold text-[#271810] block">{txn.consumer}</span>
                        <span className="text-xs text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full mt-1 inline-block border border-emerald-100/50">
                          {txn.qty} x {txn.item.replace('Organic ', '').replace('Heirloom ', '')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-emerald-700 block leading-tight">{formatPrice(txn.payout, currency)}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-semibold">{txn.time}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                      <span className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span className="material-symbols-outlined text-[14px] text-emerald-600">receipt_long</span>
                        ID: {txn.id}
                      </span>
                      <span className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full ${txn.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' : txn.status === 'dispatched' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                        {txn.status || 'pending'}
                      </span>
                    </div>

                    {/* Integrated scanning dispatch trigger */}
                    {(txn.status === 'pending' || txn.id === 'TXN-09') && (
                      <div className="pt-3 border-t border-slate-100 mt-2 flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Assigned Driver</span>
                          <span className="text-xs text-emerald-700 font-extrabold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                            Alex River ({txn.id === 'TXN-09' ? '#ZVG-902' : `#ZVG-${txn.id.replace('TXN-', '')}`})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setVerificationInput('');
                            setShowHandoffModal(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-transform active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                          Scan Code
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Live customer testimonials */}
            <div className="bg-white rounded-3xl p-6 border border-surface-container space-y-3 shadow-sm">
              <h4 className="font-bold text-on-surface text-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary fill-icon">volunteer_activism</span>
                Community trust ratings
              </h4>

              <div className="space-y-2.5 divide-y divide-surface-container">
                {overallFeedback.map((comment, idx) => (
                  <div key={idx} className="pt-2.5 first:pt-0 space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-primary">{comment.author}</span>
                      <span className="bg-secondary/15 text-secondary px-1.5 py-0.5 rounded text-[9px] font-extrabold flex items-center gap-0.5">
                        {comment.score} <span className="material-symbols-outlined text-[9px] fill-icon">star</span>
                      </span>
                    </div>
                    <p className="text-[11px] italic text-[#271810]/80">"{comment.text}"</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* HARVEST HANDOVER QR CODES SCANNERS SYSTEM */}
      {showHandoffModal && (
        <div className="fixed inset-0 bg-[#271810]/75 backdrop-blur-md flex items-center justify-center p-4 z-50 text-center animate-fade-in text-surface">
          <div className="bg-white border-2 border-primary/20 text-[#271810] rounded-3xl p-6 md:p-8 max-w-sm w-full space-y-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowHandoffModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 outline-none text-sm font-bold"
            >
              ✕
            </button>

            <div className="space-y-1">
              <span className="bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-primary/25">
                Harvest Code Handoff Matrix
              </span>
              <h4 className="text-base font-serif font-black text-[#271810] pt-1">Verify Rider Alex River (#902)</h4>
              <p className="text-[11px] text-[#271810]/70">Confirm rider holds valid autogen release PIN and that payload is routed to Sarah Jenkins.</p>
            </div>

            {/* Simulated Live Camera Scanner Optical frame */}
            <div className="relative border-4 border-dashed border-primary rounded-2xl p-4 bg-gray-50 h-44 flex flex-col justify-center items-center overflow-hidden">
              <span className="material-symbols-outlined text-[48px] text-primary block animate-pulse">qr_code_scanner</span>
              <p className="text-[9px] text-[#271810]/60 font-mono tracking-wider uppercase mt-2">Optical Lens Alignment Live...</p>
              
              {/* Corner target decorators */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary"></div>

              {verificationInput && (
                <div className="absolute inset-0 bg-[#eefcf4]/90 flex flex-col justify-center items-center p-2 text-center">
                  <span className="material-symbols-outlined text-emerald-600 text-[28px]">verified</span>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 font-mono tracking-wide mt-1">SWEEP SUCCESSFUL !</span>
                  <span className="text-xs font-black font-mono mt-0.5 text-[#271810]">{verificationInput}</span>
                </div>
              )}
            </div>

            <div className="space-y-3.5 text-xs font-medium">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={autofillScanCode}
                  className="w-full bg-[#271810] text-[#ffede5] font-extrabold py-2 rounded-xl text-[10.5px] transition-all hover:bg-[#1c110a] flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[14px]">scanner</span>
                  Scan Screen QR
                </button>
              </div>

              <div className="space-y-1 text-left pt-1 font-mono">
                <label className="text-[10px] text-gray-500 uppercase block font-semibold">Or Enter Verification PIN Code:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="E.g. ZEN-RELEASE-7749"
                    value={verificationInput}
                    onChange={(e) => setVerificationInput(e.target.value)}
                    className="w-full bg-[#fffcfb] border border-gray-200 text-xs py-1.5 px-3 rounded-lg focus:outline-none focus:border-primary text-center font-bold" 
                  />
                  <button
                    type="button"
                    onClick={handleApproveHandover}
                    className="bg-primary hover:bg-primary-hover text-white font-extrabold px-4.5 rounded-lg text-xs"
                  >
                    Confirm
                  </button>
                </div>
              </div>

              <div className="bg-amber-100/40 p-2.5 rounded-xl text-[10.5px] text-amber-900 border border-amber-200/50 leading-relaxed italic text-center">
                <strong>💡 QR Synchronization:</strong> Scanning is fully linked into active driver dashboard. Approving will transition the rider's navigation panel coordinates instantly.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AVATAR SELECTOR MODAL */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-[#271810]/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] text-center animate-fade-in text-slate-800">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative border border-slate-100">
            <button
              type="button"
              onClick={() => setShowAvatarModal(false)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors"
            >
              ✕
            </button>
            <div className="space-y-1 pb-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800">Choose an Avatar</h3>
              <p className="text-xs text-slate-500">Pick a vibrant icon to represent your farm on the local ledger.</p>
            </div>
            
            <div className="grid grid-cols-4 gap-3 py-5">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSelectEmoji(emoji)}
                  className="text-4xl bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 rounded-2xl aspect-square flex items-center justify-center transition-all hover:scale-110 shadow-sm"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN SCAN STATION MODE OVERLAY */}
      {showScanStationModal && (
        <div className="fixed inset-0 bg-[#1c110a] text-white flex flex-col justify-between p-6 z-[9999] animate-fade-in font-sans">
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400">ZenVego Scan Station</h2>
                <p className="text-[10px] text-white/50">Grower John Miller • Sunny Hills Organic</p>
              </div>
            </div>
            <button
              onClick={() => setShowScanStationModal(false)}
              className="bg-white/5 hover:bg-white/10 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl border border-white/10 cursor-pointer"
            >
              Exit Station
            </button>
          </div>

          {/* Scanner frame */}
          <div className="my-auto max-w-sm w-full mx-auto space-y-6 text-center">
            <div className="space-y-1">
              <h3 className="text-lg font-bold">Align Courier Handover Code</h3>
              <p className="text-xs text-white/60">Position the courier's release QR code within the target frame below.</p>
            </div>

            <div className="relative border-4 border-dashed border-emerald-500 rounded-3xl p-6 bg-white/5 aspect-square flex flex-col justify-center items-center overflow-hidden">
              {/* Corner brackets */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-emerald-500"></div>
              <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-emerald-500"></div>
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-emerald-500"></div>
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-emerald-500"></div>

              {/* Pulsing red scan line (decorative if video is off, but behind video) */}
              <div className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_12px_#10b981] animate-scan-line z-0"></div>

              <div id="reader" className="w-full h-full object-cover z-10 border-none bg-transparent"></div>
              
              {verificationInput && (
                <div className="absolute inset-0 bg-emerald-950/95 flex flex-col justify-center items-center p-4">
                  <span className="material-symbols-outlined text-emerald-400 text-[40px]">check_circle</span>
                  <span className="text-xs uppercase font-mono font-bold tracking-widest text-emerald-300 mt-2">CODE MATCHED</span>
                  <span className="text-lg font-black font-mono text-white mt-1">{verificationInput}</span>
                </div>
              )}
            </div>

            <div className="space-y-3 font-mono text-xs">
              <button
                type="button"
                onClick={autofillScanCode}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">scanner</span>
                Simulate Camera Scan (Bypass)
              </button>

              <div className="space-y-1 text-left pt-2">
                <label className="text-[10px] text-white/40 uppercase font-semibold">Or Enter Code Manually:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="E.g. ZEN-RELEASE-7749"
                    value={verificationInput}
                    onChange={(e) => setVerificationInput(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-center font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleApproveHandover}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 rounded-xl transition-colors cursor-pointer"
                  >
                    Verify
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-[10px] text-white/30 border-t border-white/5 pt-4">
            ZenVego cryptographic verification protocol active. Peer-to-peer ledger storage engine.
          </div>
        </div>
      )}

    </div>
  );
}
