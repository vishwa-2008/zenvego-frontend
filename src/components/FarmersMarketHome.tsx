import React, { useState, useEffect } from 'react';
import { ViewState, LoggedInUser } from '../types';
import { Currency } from '../utils/currency';
import CurrencySelector from './CurrencySelector';
import { handleImageError } from '../utils/imageFallback';
import { speechService } from '../utils/speech';
import { formatDistance } from '../utils/measurement';

interface FarmersMarketHomeProps {
  setView: (view: ViewState) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  sessionUser?: LoggedInUser | null;
  handleLogout?: () => void;
  setPreselectedRole?: (role: 'customer' | 'seller' | 'delivery' | null) => void;
  globalSearchTerm?: string;
  setGlobalSearchTerm?: (term: string) => void;
  measurementSystem?: 'US' | 'IND';
}

export default function FarmersMarketHome({
  setView,
  currency,
  setCurrency,
  sessionUser,
  handleLogout,
  setPreselectedRole,
  globalSearchTerm = '',
  setGlobalSearchTerm,
  measurementSystem = 'US'
}: FarmersMarketHomeProps) {
  const [searchTerm, setSearchTerm] = useState(globalSearchTerm);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');

  // Suffix sync
  useEffect(() => {
    setSearchTerm(globalSearchTerm);
  }, [globalSearchTerm]);
  
  const handleVoiceSearch = () => {
    if (isListening) {
      speechService.stop();
      setIsListening(false);
      return;
    }
    
    setVoiceError('');
    setVoiceTranscript('Say something like "Organic Tomatoes"...');
    setIsListening(true);
    
    const cleanup = speechService.listen({
      onStart: () => {
        setIsListening(true);
      },
      onResult: (transcript: string, isFinal: boolean) => {
        setVoiceTranscript(transcript);
        setSearchTerm(transcript);
        if (isFinal) {
          setIsListening(false);
          setGlobalSearchTerm?.(transcript);
          setTimeout(() => {
            setView('buyer-marketplace');
          }, 300);
        }
      },
      onError: (err: any) => {
        console.warn('FarmersMarketHome speech error:', err);
        setVoiceError('Microphone not responsive. Feel free to use the shortcut voice command buttons below!');
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      }
    });

    return cleanup;
  };

  const triggerMockVoice = (phrase: string) => {
    setVoiceError('');
    setIsListening(true);
    setVoiceTranscript('Generating voice signal...');
    let i = 0;
    const interval = setInterval(() => {
      const parts = phrase.split(' ');
      const sub = parts.slice(0, i + 1).join(' ');
      setVoiceTranscript(sub);
      setSearchTerm(sub);
      i++;
      if (i >= parts.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsListening(false);
          setGlobalSearchTerm?.(phrase);
          setView('buyer-marketplace');
        }, 500);
      }
    }, 280);
  };

  const rawFeaturedFarms = [
    {
      name: "Sunny Hills Organic",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuACPN9-qhfu4ljjZTTBJ56SF-QKxCkb8aLLLATJrhjSOafNha2Cm09u5QEt3GSHOMXDjVw8hEeOnnbecR2X7lGnO4eXlYjL4iiw5YPNjeAtRosMrbu-fIOi8FAjKj25tY2C5m67-s4XqxCzDkz5Kem4qZQx_GhnWCwOejoHSWNePjZDgujcX2DgFkM1nCKNNFGTYOv0tQcI8VISrT46Jr1ro3NmJA0e2-MvdNooGTlK47RQLMCBBcy7ptroN_SjgeNijsTZOWaV6h2c",
      produces: "Heirloom Tomatoes & Carrots",
      miles: 3.2
    },
    {
      name: "Wildflower Honey Farm",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC8pugnV0BLFVi8gSCu6pnvYnXInuTgKjD_8fq5Fd085LvMjx_RWOrh6M7zhMYUNQAsRIu68Fnx5LoubgCZc_RMW8k_qgwtEFpouZUTpeD_AFTyz1iPnesIDrp7wI51xn9rBkN_AlZ618W1bOob4E0EOlZZ5-omNCjR4F_SzKDaETFNmzLwM_SYS2TaVwNtwp8M-vrXS3E_gl2cVSFPiDdSg3euE6NnYHcLSjTySxBorhkqlriKegj59floP2Z6E80gxc_LlVDXjR2r",
      produces: "Raw Artisan Honey",
      miles: 4.8
    },
    {
      name: "Windmill Sourdough Bakery",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAnlpqVuHoSzGhCqhMrwleYIaLojumCQW0NB_D16Nb74C_AyiotbEz8lK5l2HzOQXi1qusiDTQ60zhjEJj9Ts0xGE0DcgG6wTFDH25P9-Drxtcjvp4q1Go5MWyP4newHP6d6wkGaf2lm-sbcgL6MTYXi0gByROD1fw0qwREjsWWFBSIeWzaUwOeglmxMqWKXG2ZmoYZ8Zl0vmwIKlsHYMhYW9qWhOEI_uGtoyQOgflOzXDF65ELtN8orhokzChLl36J2far-yrW7uXV",
      produces: "Woodfired Artisan Crusts",
      miles: 1.5
    }
  ];

  const featuredFarms = rawFeaturedFarms.map(farm => ({
    name: farm.name,
    image: farm.image,
    produces: farm.produces,
    location: `${formatDistance(farm.miles, measurementSystem)} away`
  }));

  const valueProps = [
    { 
      icon: "distance", 
      title: "Hyperlocal Sourcing", 
      desc: `All suppliers are tracked locally live on community registers under ${formatDistance(15, measurementSystem)} radius.` 
    },
    { 
      icon: "receipt_long", 
      title: "Frictionless Ledgers", 
      desc: "Verifiable transaction listings keep pricing honest, stable, and highly rewarding for harvesters." 
    },
    { 
      icon: "energy_savings_leaf", 
      title: "Eco Footprint Minimization", 
      desc: "No warehouses. Fresh harvesting to direct local drop-offs via decentralized neighborhood hubs." 
    }
  ];

  return (
    <div id="landing-container" className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header id="landing-header" className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-surface-container py-3 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('market-home')}>
          <img 
            id="logo-img-home" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXsVjZW7CF_rEkkvuw2qwPfrvFDlKOiWodRP081VLO2Y4YevOjDl9jG8hK4EgoqSeMU2Jjex7NxUXwlde8ZAJRY6EYqA8bjzUm9JdN8CRl-uwjaUquc-kZmZcMt72R3xgYxlBwTIc_j4N2M3QhM-OsVR6WyPYfN1SRVlY77RKuCHKxgD5vZ5B4OiuaWPw4LbMoCICk3WlLJVKkPYMTW0U0NC8mqcSiVXYvTnyiZgniHLfmVHp5XV00iLqr0W5Imi5-nxB0BNP6bJwE" 
            alt="Zenvego Logo" 
            referrerPolicy="no-referrer"
            onError={(e) => handleImageError(e, 'logo')}
            className="w-10 h-10 object-contain rounded-full border-2 logo-breathing-highlight logo-ring-shimmer transition-all duration-300 hover:scale-110 cursor-pointer active:scale-95 shadow-md"
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-primary">Zenvego</h1>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-tertiary">Hyperlocal Farmers Market</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <CurrencySelector currency={currency} setCurrency={setCurrency} />
          
          {sessionUser ? (
            <div className="flex items-center gap-2 bg-primary/5 pl-3.5 pr-2 py-1.5 rounded-full border border-primary/10 text-xs">
              <span className="font-bold text-[#271810] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                {sessionUser.name} 
                <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  {sessionUser.role}
                </span>
              </span>
              <button
                onClick={handleLogout}
                className="p-1 px-2.5 rounded-full bg-surface-container-highest hover:bg-primary hover:text-white transition-all cursor-pointer text-[10px] font-extrabold text-[#7a5743] hover:shadow-xs animate-fade-in"
              >
                Log Out
              </button>
            </div>
          ) : (
            <>
              <button 
                id="btn-goto-login-home" 
                onClick={() => setView('login')}
                className="px-4 py-1.5 text-sm font-semibold text-primary hover:bg-surface-container rounded-full transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button 
                id="btn-goto-dashboard-home" 
                onClick={() => {
                  setPreselectedRole?.('customer');
                  setView('buyer-marketplace');
                }}
                className="px-4 py-1.5 text-sm font-semibold text-white bg-primary hover:bg-primary-container rounded-full transition-colors shadow-sm cursor-pointer"
              >
                Browse Marketplace
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section id="landing-hero" className="relative grid grid-cols-1 md:grid-cols-12 gap-8 px-4 md:px-8 py-10 md:py-16 max-w-7xl mx-auto w-full items-center">
        <div className="md:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 bg-surface-container px-3 py-1 rounded-full border border-surface-container-high">
            <span className="material-symbols-outlined text-[16px] text-primary fill-icon">notifications_active</span>
            <span className="text-xs font-semibold text-primary-fixed-dim text-primary">Pre-ordered items drop in 4 hours</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface leading-tight">
            Freshness From Your <br />
            <span className="text-primary font-black">Decentralized Neighborhood</span> Hub
          </h2>
          
          <p className="text-on-surface-variant text-base max-w-xl leading-relaxed">
            Connect directly with verified hyper-local crop harvesters, micro-bakers, and apiaries. Pre-order direct from the source was never this clean, simple, and satisfying.
          </p>

          {/* Search Bar / Input Widget */}
          <div className="relative max-w-lg bg-surface-container-low rounded-2xl p-2 border border-surface-container-highest flex items-center shadow-sm">
            <span className="material-symbols-outlined ml-2 text-outline">search</span>
            <input 
              id="search-input-landing"
              type="text"
              placeholder="What are you craving today? Try 'Tomatoes' or 'Kale'..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setGlobalSearchTerm?.(e.target.value);
              }}
              onKeyDown={(e) => e.key === 'Enter' && setView('buyer-marketplace')}
              className="w-full bg-transparent px-3 py-2 text-sm text-on-background focus:outline-none"
            />
            
            <button 
              id="btn-voice-landing"
              onClick={handleVoiceSearch}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${isListening ? 'bg-secondary animate-pulse text-white' : 'bg-surface-container hover:bg-surface-container-highest text-primary'}`}
              title="Voice Search Powered by Zenvego AI"
            >
              <span className="material-symbols-outlined leading-none">{isListening ? 'mic' : 'mic_none'}</span>
            </button>
          </div>

          {isListening && (
            <div className="bg-secondary/5 rounded-xl p-2 border border-secondary/10 flex items-center gap-2 text-xs text-secondary animate-pulse max-w-lg">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span className="font-semibold col-span-1">Transcript:</span>
              <span className="font-mono bg-white/40 px-2 py-0.5 rounded-md border border-secondary/10 italic">
                "{voiceTranscript || 'Listening...'}"
              </span>
            </div>
          )}

          {voiceError && (
            <p className="text-xs text-[#a24000] font-semibold bg-red-55 animate-fade-in max-w-lg">
              {voiceError}
            </p>
          )}

          {/* Quick Vocal Commands / Dictate Shortcuts */}
          <div className="space-y-1.5 max-w-lg">
            <p className="text-[10px] text-outline uppercase tracking-wider font-extrabold flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px] leading-none text-primary">record_voice_over</span>
              Vocal Dictation Shortcuts (100% Accurate)
            </p>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => triggerMockVoice('Organic Tomatoes')}
                className="px-2.5 py-1 text-[11px] font-bold text-[#7a5743] hover:text-[#271810] bg-surface-container hover:bg-surface-container-highest rounded-full border border-primary/5 cursor-pointer transition-all flex items-center gap-1 hover:shadow-2xs"
              >
                <span>🍅</span> "Organic Tomatoes"
              </button>
              <button 
                onClick={() => triggerMockVoice('Dinosaur Kale')}
                className="px-2.5 py-1 text-[11px] font-bold text-[#7a5743] hover:text-[#271810] bg-surface-container hover:bg-surface-container-highest rounded-full border border-primary/5 cursor-pointer transition-all flex items-center gap-1 hover:shadow-2xs"
              >
                <span>🥬</span> "Dinosaur Kale"
              </button>
              <button 
                onClick={() => triggerMockVoice('Artisan Sourdough')}
                className="px-2.5 py-1 text-[11px] font-bold text-[#7a5743] hover:text-[#271810] bg-surface-container hover:bg-surface-container-highest rounded-full border border-primary/5 cursor-pointer transition-all flex items-center gap-1 hover:shadow-2xs"
              >
                <span>🍞</span> "Artisan Sourdough"
              </button>
              <button 
                onClick={() => triggerMockVoice('Sweet Honey')}
                className="px-2.5 py-1 text-[11px] font-bold text-[#7a5743] hover:text-[#271810] bg-surface-container hover:bg-surface-container-highest rounded-full border border-primary/5 cursor-pointer transition-all flex items-center gap-1 hover:shadow-2xs"
              >
                <span>🍯</span> "Sweet Honey"
              </button>
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button 
              id="btn-explore-now-hero" 
              onClick={() => setView('buyer-marketplace')}
              className="px-6 py-3 rounded-full font-bold text-sm text-white bg-primary hover:bg-primary-container shadow-md transition-all flex items-center gap-2 group"
            >
              Order Fresh (30-40 Min Delivery)
              <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">arrow_forward</span>
            </button>
            <button 
              id="btn-explore-farmer-hero" 
              onClick={() => setView('farmer-dashboard')}
              className="px-6 py-3 rounded-full font-bold text-sm text-primary bg-surface-container hover:bg-surface-container-highest transition-all"
            >
              Sell Your Yields
            </button>
          </div>
        </div>

        <div className="md:col-span-5 relative">
          <div className="w-full h-80 md:h-[400px] rounded-[32px] overflow-hidden shadow-2xl border-4 border-surface-container relative group cursor-pointer">
            <img 
              id="landing-hero-img" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXu0OPy13Tds7JAWWSMDT0m5H6T3t_IT_Tp7mGT2rf2DwMgW5MkDIaLckDh6RInK1JNmtH4Y43OVpEENVHwtE492QRY2yuQhH4xDBznuUYz8jq2l_v0_EhkUXqrJTTgEsXn3apknurAfRhfkwUA4Un2f62fGX0rB9STLD8LJdZ4m3EKEsQWMUiP2RzffNIWmQS9dbSry--uSiUtLc-RUFHq-O1jZBdGS9i76jejFXfgN1RLeO07P5ONEVdgXc0ACrURmZ7ixW7uqfr5m3dc" 
              alt="Fresh Farm Produce Assembly" 
              referrerPolicy="no-referrer"
              onError={(e) => handleImageError(e, 'hero')}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-dark/60 via-transparent to-transparent flex items-end p-6 group-hover:from-dark/85 transition-all duration-300">
              <div className="bg-background/90 backdrop-blur-md p-4 rounded-2xl border border-surface-container-high max-w-xs shadow-lg logo-breathing-highlight logo-ring-shimmer transition-all duration-300 transform hover:scale-[1.02]">
                <p className="text-[10px] uppercase font-bold tracking-wider text-secondary flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-ping"></span>
                  Preorder dropoff point
                </p>
                <div className="flex gap-2 items-center mt-1">
                  <span className="material-symbols-outlined text-primary text-[20px]">location_on</span>
                  <p className="text-xs font-semibold text-on-surface">Community Center Block A</p>
                </div>
              </div>
            </div>
          </div>
          {/* Accent decoration element */}
          <div className="absolute -top-3 -right-3 bg-secondary-container text-on-secondary-container p-3 rounded-full shadow-lg border border-surface-container transform rotate-12">
            <span className="material-symbols-outlined font-bold text-[28px] text-white">eco</span>
          </div>
        </div>
      </section>

      {/* Dynamic Ecosystem Role Gateways */}
      <section id="landing-roles" className="px-4 md:px-8 py-12 max-w-7xl mx-auto w-full space-y-8 border-t border-surface-container/40">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#a24000] bg-surface-container px-3 py-1 rounded-full border border-surface-container-high">Interactive Role Gateways</span>
          <h3 className="text-2xl md:text-3xl font-extrabold text-on-surface">Choose Your Workspace Role</h3>
          <p className="text-xs text-outline max-w-lg mx-auto">Access your custom dashboard to buy, sell, or manage local neighborhood deliveries instantly.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer / Buyer Card */}
          <div className="bg-white rounded-3xl p-6 border-2 border-primary/10 hover:border-primary/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-full pointer-events-none group-hover:bg-primary/10 transition-colors"></div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[28px] fill-icon">shopping_basket</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-on-surface text-lg">Customer Portal</h4>
                <p className="text-xs text-[#a24000] font-semibold">Buy Hyperlocal Harvests</p>
                <p className="text-xs text-on-surface-variant leading-relaxed pt-1">
                  Secure fresh organic tomatoes, micro-baked sourdoughs, and raw honeys directly from verified growers.
                </p>
              </div>
              <ul className="space-y-2 pt-2 border-t border-surface-container text-xs text-outline">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600 text-[16px] font-bold">check</span>
                  Browse live nearby crop lists
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600 text-[16px] font-bold">check</span>
                  Secure INR & USD multi-currency checkout
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600 text-[16px] font-bold">check</span>
                  Instant locker drop alerts
                </li>
              </ul>
            </div>
            <button 
              id="btn-role-customer"
              onClick={() => {
                if (!sessionUser) {
                  setPreselectedRole?.('customer');
                  setView('login');
                } else {
                  setView('buyer-marketplace');
                }
              }}
              className="w-full py-3 rounded-2xl bg-primary hover:bg-primary-container text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              Enter Customer Marketplace
              <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
            </button>
          </div>

          {/* Seller / Farmer Card */}
          <div className="bg-[#fffdfb] rounded-3xl p-6 border-2 border-[#a24000]/10 hover:border-[#a24000]/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#a24000]/5 rounded-bl-full pointer-events-none group-hover:bg-[#a24000]/15 transition-colors"></div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#a24000]/10 flex items-center justify-center text-[#a24000]">
                <span className="material-symbols-outlined text-[28px] fill-icon">agriculture</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-on-surface text-lg">Seller / Farmer Portal</h4>
                <p className="text-xs text-primary font-semibold">Distribute Farm Yields</p>
                <p className="text-xs text-on-surface-variant leading-relaxed pt-1">
                  Register field blocks, broadcast live crop yields, manage orders, and check payouts hands-free with Vocal Assist.
                </p>
              </div>
              <ul className="space-y-2 pt-2 border-t border-surface-container text-xs text-outline">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600 text-[16px] font-bold">check</span>
                  Manage crop inventory limits
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600 text-[16px] font-bold">check</span>
                  View booking payout logs
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600 text-[16px] font-bold">check</span>
                  Hands-free vocal ledger stock checks
                </li>
              </ul>
            </div>
            <button 
              id="btn-role-farmer"
              onClick={() => {
                if (!sessionUser) {
                  setPreselectedRole?.('seller');
                  setView('login');
                } else {
                  setView('farmer-dashboard');
                }
              }}
              className="w-full py-3 rounded-2xl bg-[#a24000] hover:bg-[#a24000]/90 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              Enter Farmer Workspace
              <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
            </button>
          </div>

          {/* Delivery Partner / Courier Card */}
          <div className="bg-[#fcfcff] rounded-3xl p-6 border-2 border-secondary/10 hover:border-secondary/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-secondary/5 rounded-bl-full pointer-events-none group-hover:bg-secondary/15 transition-colors"></div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[28px] fill-icon">local_shipping</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-on-surface text-lg">Delivery Partner Portal</h4>
                <p className="text-xs text-secondary font-semibold">Drop-off Courier Dispatch</p>
                <p className="text-xs text-on-surface-variant leading-relaxed pt-1">
                  Access optimal routing directions, secure multi-drop consensus bins, and earn ecosystem health bonuses.
                </p>
              </div>
              <ul className="space-y-2 pt-2 border-t border-surface-container text-xs text-outline">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600 text-[16px] font-bold">check</span>
                  Real-time driving route mapping
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600 text-[16px] font-bold">check</span>
                  Ecosystem payout bonuses
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600 text-[16px] font-bold">check</span>
                  On-street Vocal Navigation assist
                </li>
              </ul>
            </div>
            <button 
              id="btn-role-courier"
              onClick={() => {
                if (!sessionUser) {
                  setPreselectedRole?.('delivery');
                  setView('login');
                } else {
                  setView('delivery-dashboard');
                }
              }}
              className="w-full py-3 rounded-2xl bg-[#5d4037] hover:bg-[#4e342e] text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              Enter Courier Workspace
              <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
            </button>
          </div>
        </div>
      </section>

      {/* Unified values props */}
      <section id="landing-props" className="bg-white/50 border-t border-b border-surface-container py-12 px-4 md:px-8 mt-4">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center space-y-2 mb-10">
            <h3 className="text-xs font-bold uppercase tracking-widest text-secondary">The Zenvego Ecosystem Difference</h3>
            <p className="text-2xl font-extrabold text-on-surface">Designed for Complete Transparency & Trust</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {valueProps.map((prop, idx) => (
              <div key={idx} className="bg-background rounded-2xl p-6 border border-surface-container shadow-sm flex flex-col gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">{prop.icon}</span>
                </div>
                <h4 className="font-bold text-base text-on-surface">{prop.title}</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">{prop.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Sellers section */}
      <section id="landing-sellers" className="px-4 md:px-8 py-16 max-w-7xl mx-auto w-full">
        <div id="sellers-header" className="flex items-end justify-between mb-8">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Verified Nearby Harvesters</span>
            <h3 className="text-2xl font-extrabold text-on-surface">Sourcing from Real Hands</h3>
          </div>
          <button 
            onClick={() => setView('buyer-marketplace')}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            See all local farmers
            <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredFarms.map((farm, idx) => (
            <div key={idx} className="bg-white rounded-3xl border border-surface-container overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
              <div className="h-44 relative overflow-hidden bg-surface-container-low">
                <img 
                  src={farm.image} 
                  alt={farm.name} 
                  referrerPolicy="no-referrer"
                  onError={(e) => handleImageError(e, 'hero')}
                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                />
                <div className="absolute top-3 right-3 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined text-[10px] fill-icon">verified</span>
                  VERIFIED
                </div>
              </div>
              <div className="p-5 space-y-3 flex flex-col justify-between flex-grow">
                <div>
                  <h4 className="font-bold text-on-surface text-lg">{farm.name}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant mt-1">
                    <span className="material-symbols-outlined text-[14px] text-secondary">local_shipping</span>
                    <span>Recent prep items: {farm.produces}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-surface-container">
                  <span className="text-xs text-outline font-semibold">{farm.location}</span>
                  <button 
                    onClick={() => setView('buyer-marketplace')}
                    className="text-xs font-bold text-primary bg-surface-container px-3 py-1.5 rounded-full hover:bg-primary hover:text-white transition-all flex items-center gap-1"
                  >
                    Explore Shop
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Core Footer */}
      <footer id="landing-footer" className="mt-auto bg-surface-container-low border-t border-surface-container-high py-12 px-4 md:px-8">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-xs text-on-surface-variant">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXsVjZW7CF_rEkkvuw2qwPfrvFDlKOiWodRP081VLO2Y4YevOjDl9jG8hK4EgoqSeMU2Jjex7NxUXwlde8ZAJRY6EYqA8bjzUm9JdN8CRl-uwjaUquc-kZmZcMt72R3xgYxlBwTIc_j4N2M3QhM-OsVR6WyPYfN1SRVlY77RKuCHKxgD5vZ5B4OiuaWPw4LbMoCICk3WlLJVKkPYMTW0U0NC8mqcSiVXYvTnyiZgniHLfmVHp5XV00iLqr0W5Imi5-nxB0BNP6bJwE" 
                alt="Zenvego" 
                onError={(e) => handleImageError(e, 'logo')}
                className="w-6 h-6 object-contain"
              />
              <span className="text-sm font-bold text-primary font-sans">Zenvego Ecosystem</span>
            </div>
            <p className="leading-relaxed">
              Decentralized agriculture community register. Empowering local farm growers, micro-bakers, and green distribution partners.
            </p>
          </div>
          <div>
            <h5 className="font-bold text-on-surface mb-3 uppercase tracking-wider text-[10px]">Marketplace</h5>
            <ul className="space-y-2">
              <li><button onClick={() => setView('buyer-marketplace')} className="hover:text-primary">Organic Green Vegetables</button></li>
              <li><button onClick={() => setView('buyer-marketplace')} className="hover:text-primary">Lawn Harvest Gourds</button></li>
              <li><button onClick={() => setView('buyer-marketplace')} className="hover:text-primary">Micro Bakery & Doughs</button></li>
              <li><button onClick={() => setView('buyer-marketplace')} className="hover:text-primary">Heirloom Root Crops</button></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-on-surface mb-3 uppercase tracking-wider text-[10px]">For Partners</h5>
            <ul className="space-y-2">
              <li><button onClick={() => setView('farmer-dashboard')} className="hover:text-primary">Farmer Yield Registration</button></li>
              <li><button onClick={() => setView('farmer-inventory')} className="hover:text-primary">Harvester Stock Management</button></li>
              <li><button onClick={() => setView('delivery-dashboard')} className="hover:text-primary">Become a Neighborhood Courier</button></li>
              <li><button onClick={() => setView('delivery-route')} className="hover:text-primary">Digital Courier Navigation Routing</button></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-on-surface mb-3 uppercase tracking-wider text-[10px]">Secure Ledger</h5>
            <p className="leading-relaxed mb-2">
              Zenvego utilizes client-side cryptographically signed ledgers with immediate checkout routing.
            </p>
            <div className="flex gap-2">
              <span className="inline-block px-1.5 py-0.5 rounded bg-surface-container font-mono text-[9px] text-primary">v2.1 Stable</span>
              <span className="inline-block px-1.5 py-0.5 rounded bg-surface-container font-mono text-[9px] text-secondary">Preorder Mode</span>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto w-full pt-6 border-t border-surface-container-high flex flex-col sm:flex-row items-center justify-between text-[11px] text-outline">
          <p>© 2026 Zenvego Hyperlocal Community Ledger. Built for real sustainable community markets.</p>
          <div className="flex gap-4 mt-2 sm:mt-0">
            <span className="hover:underline cursor-pointer">Terms of Harvest</span>
            <span className="hover:underline cursor-pointer">Ledger Privacy</span>
            <span className="hover:underline cursor-pointer">Hub Locations</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
