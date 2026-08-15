import React, { useState, useEffect } from 'react';
import { ViewState, CartItem, LoggedInUser, Product } from '../types';
import { Currency, formatPrice } from '../utils/currency';
import CurrencySelector from './CurrencySelector';
import { handleImageError } from '../utils/imageFallback';
import { speechService } from '../utils/speech';
import { formatDistance, convertAndFormatProductWeight } from '../utils/measurement';

interface BuyerMarketplaceProps {
  setView: (view: ViewState) => void;
  cart: CartItem[];
  addToCart: (item: any) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  sessionUser?: LoggedInUser | null;
  handleLogout?: () => void;
  globalSearchTerm?: string;
  setGlobalSearchTerm?: (term: string) => void;
  products: Product[];
  measurementSystem?: 'US' | 'IND';
}

export default function BuyerMarketplace({ 
  setView, 
  cart, 
  addToCart, 
  removeFromCart, 
  clearCart,
  currency,
  setCurrency,
  sessionUser,
  handleLogout,
  globalSearchTerm = '',
  setGlobalSearchTerm,
  products,
  measurementSystem = 'US'
}: BuyerMarketplaceProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState(globalSearchTerm);
  const [isListening, setIsListening] = useState(false);
  const [voiceTransit, setVoiceTransit] = useState('');
  const [showCartDropdown, setShowCartDropdown] = useState(false);

  // Sync state initially
  useEffect(() => {
    setSearchTerm(globalSearchTerm);
  }, [globalSearchTerm]);

  const categories = ['All', 'Vegetables', 'Roots', 'Bakery', 'Sweets & Honey'];

  const handleVoiceListen = () => {
    if (isListening) {
      speechService.stop();
      setIsListening(false);
      return;
    }
    
    setIsListening(true);
    setVoiceTransit('Say "Organic Tomatoes", "Go to checkout" or "Clear cart"...');
    
    speechService.listen({
      onStart: () => {
        setIsListening(true);
      },
      onResult: (transcript: string, isFinal: boolean) => {
        setVoiceTransit(transcript);
        setSearchTerm(transcript);
        setGlobalSearchTerm?.(transcript);
        
        if (isFinal) {
          setIsListening(false);
          processVoiceMarketplaceCommand(transcript);
        }
      },
      onError: (err) => {
        console.warn('Speech error in BuyerMarketplace:', err);
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      }
    });
  };

  const processVoiceMarketplaceCommand = (phrase: string) => {
    const lower = phrase.toLowerCase();
    
    // Check navigation command triggers
    if (lower.includes('checkout') || lower.includes('buy') || lower.includes('pay')) {
      setView('checkout');
    } else if (lower.includes('home') || lower.includes('back')) {
      setView('market-home');
    } else if (lower.includes('account') || lower.includes('profile')) {
      setView('buyer-account');
    } else if (lower.includes('clear') || lower.includes('empty')) {
      clearCart();
    } else if (lower.includes('add') || lower.includes('reserve')) {
      // Find matching items in products
      let match = null;
      if (lower.includes('tomato')) match = products.find(p => p.id === 'prod-tomato');
      else if (lower.includes('carrot')) match = products.find(p => p.id === 'prod-carrot');
      else if (lower.includes('kale')) match = products.find(p => p.id === 'prod-kale');
      else if (lower.includes('sourdough') || lower.includes('bread')) match = products.find(p => p.id === 'prod-sourdough');
      else if (lower.includes('honey')) match = products.find(p => p.id === 'prod-honey');
      
      if (match) {
        addToCart(match);
      }
    }
  };

  const triggerMockMarketplaceVoice = (phrase: string) => {
    setIsListening(true);
    setVoiceTransit('Analyzing simulated vocal input...');
    let i = 0;
    const interval = setInterval(() => {
      const parts = phrase.split(' ');
      const sub = parts.slice(0, i + 1).join(' ');
      setVoiceTransit(sub);
      setSearchTerm(sub);
      setGlobalSearchTerm?.(sub);
      i++;
      if (i >= parts.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsListening(false);
          processVoiceMarketplaceCommand(phrase);
        }, 300);
      }
    }, 250);
  };

  // Conversational / Broad queries shouldn't result in "No results"
  const checkIsSmartMatchActive = (): boolean => {
    const norm = searchTerm.toLowerCase().trim();
    if (!norm) return false;
    
    // Check if the search contains specific product names first to avoid false positives
    const specificKeywords = ['tomato', 'carrot', 'kale', 'bread', 'sourdough', 'eggplant', 'brinjal', 'honey'];
    const containsSpecificProduct = specificKeywords.some(kw => norm.includes(kw));
    if (containsSpecificProduct) return false;

    // Common phrases for "what are today's varieties" or general queries
    const generalPhrases = [
      'variety', 'varieties', 'today', "today's", 'todays', 'fresh', 'items', 'item', 'option', 'specials', 'special', 'have', 'offer',
      'what are', 'show me', 'what is', 'what do you', 'list', 'anything', 'sourcing', 'crops'
    ];
    return generalPhrases.some(phrase => norm.includes(phrase)) || norm.length > 15;
  };

  const isSmartMatchActive = checkIsSmartMatchActive();

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    
    // If the term is empty, match everything
    if (!searchTerm.trim()) {
      return matchesCategory;
    }

    // Check if the entire term is a broad conversational query
    if (isSmartMatchActive) {
      return true; // Match ALL available items on the harvest board, bypassing categories to avoid empty checks
    }

    // Otherwise, split search query into individual words and do a smart "OR" search across Name, Farm, Category and Desc
    const queryParts = searchTerm.toLowerCase().split(/\s+/).filter(word => word.length > 1);
    
    if (queryParts.length === 0) {
      return matchesCategory;
    }

    // A product matches if any search keyword is contained in name, farm, category, or description
    const matchesSearch = queryParts.some(part => 
      p.name.toLowerCase().includes(part) || 
      p.farm.toLowerCase().includes(part) || 
      p.category.toLowerCase().includes(part) ||
      p.desc.toLowerCase().includes(part)
    );

    return matchesCategory && matchesSearch;
  });

  const cartTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  const cartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div id="marketplace-container" className="min-h-screen bg-background flex flex-col font-sans">
      {/* Navbar segment */}
      <header id="marketplace-nav" className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-surface-container py-3 px-4 md:px-8 flex items-center justify-between shadow-sm">
        <div id="brand-indicator-nav" className="flex items-center gap-2 cursor-pointer" onClick={() => setView('market-home')}>
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXsVjZW7CF_rEkkvuw2qwPfrvFDlKOiWodRP081VLO2Y4YevOjDl9jG8hK4EgoqSeMU2Jjex7NxUXwlde8ZAJRY6EYqA8bjzUm9JdN8CRl-uwjaUquc-kZmZcMt72R3xgYxlBwTIc_j4N2M3QhM-OsVR6WyPYfN1SRVlY77RKuCHKxgD5vZ5B4OiuaWPw4LbMoCICk3WlLJVKkPYMTW0U0NC8mqcSiVXYvTnyiZgniHLfmVHp5XV00iLqr0W5Imi5-nxB0BNP6bJwE" 
            alt="Zenvego" 
            onError={(e) => handleImageError(e, 'logo')}
            className="w-8 h-8 object-contain rounded-full border border-primary/10"
          />
          <div>
            <h2 className="text-base font-bold text-primary leading-tight">Zenvego Ledger</h2>
            <p className="text-[9px] uppercase font-semibold text-secondary tracking-widest">Buyer Market</p>
          </div>
        </div>

        {/* Global Search Bar embedded in navbar */}
        <div className="hidden md:flex items-center flex-grow max-w-sm mx-4 relative bg-surface-container-low rounded-full px-3 py-1.5 border border-surface-container">
          <span className="material-symbols-outlined text-[18px] text-outline">search</span>
          <input 
            type="text" 
            placeholder="Search farm yields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs w-full px-2 focus:outline-none text-on-background"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-outline hover:text-on-background">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
          <button 
            onClick={handleVoiceListen}
            className={`p-1.5 rounded-full ${isListening ? 'bg-secondary text-white' : 'hover:bg-surface-container text-primary'}`}
            title="Search with Voice"
          >
            <span className="material-symbols-outlined text-[16px]">{isListening ? 'mic' : 'mic_none'}</span>
          </button>
        </div>

        {/* User Account Button & Interactive Cart Drawer link */}
        <div className="flex items-center gap-3">
          <CurrencySelector currency={currency} setCurrency={setCurrency} />
          
          <div className="flex items-center gap-2">
            <button 
              id="nav-account-btn"
              onClick={() => setView('buyer-account')}
              className="flex items-center gap-1.5 text-xs font-bold text-on-surface hover:text-primary transition-colors bg-surface-container px-3 py-1.5 rounded-full cursor-pointer"
            >
              {sessionUser?.avatar ? (
                <img 
                  src={sessionUser.avatar} 
                  alt="" 
                  onError={(e) => handleImageError(e, 'avatar')}
                  className="w-5 h-5 rounded-full object-cover border border-primary/20"
                />
              ) : (
                <span className="material-symbols-outlined text-[18px] text-primary fill-icon">account_circle</span>
              )}
              <span className="hidden sm:inline">{sessionUser ? sessionUser.name : 'Sarah Jenkins'}</span>
            </button>
            {sessionUser && (
              <button
                onClick={handleLogout}
                className="p-1 px-2.5 rounded-full bg-surface-container hover:bg-primary hover:text-white transition-all text-[10px] font-extrabold text-[#7a5743] hover:shadow-xs cursor-pointer"
                title="Log Out of Session"
              >
                Log Out
              </button>
            )}
          </div>

          {/* Interactive shopping bag container */}
          <div className="relative">
            <button 
              id="marketplace-cart-trigger"
              onClick={() => setShowCartDropdown(!showCartDropdown)}
              className="relative p-2.5 bg-surface-container hover:bg-surface-container-highest rounded-full transition-all text-primary flex items-center justify-center border border-primary/10"
            >
              <span className="material-symbols-outlined leading-none text-[20px]">shopping_bag</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-secondary text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-background shadow-sm">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Cart Dropdown popup */}
            {showCartDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-surface-container-high p-4 z-50 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-surface-container">
                  <h4 className="font-bold text-sm text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-primary">shopping_basket</span>
                    Active Delivery Basket (30-40 Mins) ({cartCount})
                  </h4>
                  <button onClick={() => setShowCartDropdown(false)} className="text-outline hover:text-on-surface">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-6 text-xs text-outline space-y-2">
                    <span className="material-symbols-outlined text-[36px] text-surface-dim">eco</span>
                    <p>No organic crops in your express cart yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-surface-container last:border-0">
                        <div className="flex items-center gap-2">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            onError={(e) => handleImageError(e, 'produce')}
                            className="w-8 h-8 rounded-lg object-cover" 
                          />
                          <div>
                            <p className="font-bold text-on-surface leading-tight line-clamp-1">{item.name}</p>
                            <span className="text-[10px] text-outline">{item.quantity} x {formatPrice(item.price, currency)}/{item.unit}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-error hover:bg-error-container p-1 rounded transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-surface-container flex justify-between items-center font-bold text-sm text-on-surface">
                      <span>Ledger Total:</span>
                      <span className="text-primary">{formatPrice(cartTotal, currency)}</span>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  {cart.length > 0 && (
                    <>
                      <button 
                        onClick={clearCart}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold text-outline hover:bg-surface-container transition-colors text-center"
                      >
                        Clear All
                      </button>
                      <button 
                        onClick={() => {
                          setShowCartDropdown(false);
                          setView('checkout');
                        }}
                        className="flex-2 py-2 px-3 rounded-xl text-xs font-bold bg-primary hover:bg-primary-container text-white transition-all text-center flex items-center justify-center gap-1.5"
                      >
                        Checkout
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Category Filter Hub */}
      <section id="category-selector-sec" className="bg-white py-4 px-4 md:px-8 border-b border-surface-container flex flex-wrap items-center justify-between gap-4">
        {/* Chips */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-container hover:bg-surface-container-highest text-on-surface-variant'
              }`}
            >
              {cat === 'All' && '🌱 All Yields'}
              {cat === 'Vegetables' && '🥬 Vegetables'}
              {cat === 'Roots' && '🥕 Root Crops'}
              {cat === 'Bakery' && '🍞 Micro-Bakeries'}
              {cat === 'Sweets & Honey' && '🍯 Sweet Honey'}
            </button>
          ))}
        </div>

        <div className="text-xs text-on-surface-variant flex items-center gap-1 font-semibold">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
          <span>Sourcing within <span className="text-primary font-bold">{formatDistance(5.8, measurementSystem)}</span> of Block A Hub</span>
        </div>
      </section>

      {/* Marketplace Grid listing crops */}
      <main id="marketplace-grid-sec" className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-lg font-extrabold text-on-surface flex items-center gap-1.5">
              <span>Today's Fresh Harvest</span>
              <span className="font-normal text-xs text-outline font-mono">({filteredProducts.length} varieties ready now)</span>
            </h3>
            <p className="text-xs text-secondary font-semibold">⚡ We pack and deliver direct to your doorstep in <span className="underline font-black text-primary">30 to 40 minutes</span> flat!</p>
          </div>
          
          {/* Active listening helper */}
          {isListening ? (
            <div className="bg-secondary/15 text-secondary px-3 py-2 rounded-2xl text-xs animate-pulse flex flex-col gap-1 border border-secondary/20 max-w-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">mic</span>
                <span className="font-bold">Listening:</span>
                <span className="font-mono italic font-semibold text-[#271810]">"{voiceTransit}"</span>
              </div>
            </div>
          ) : (
            <div id="voice-assistant-controls" className="flex flex-wrap items-center gap-2 text-xs text-outline">
              <span className="font-bold text-[10px] bg-[#e1f1ff] text-[#1e4869] px-2 py-0.5 rounded-md flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">record_voice_over</span> AI Voice Control
              </span>
              <button 
                onClick={() => triggerMockMarketplaceVoice('Add 1 Heirloom Tomatoes')}
                className="hover:text-primary transition-all underline cursor-pointer font-bold"
              >
                "Add tomatoes"
              </button>
              <span>•</span>
              <button 
                onClick={() => triggerMockMarketplaceVoice('Add 1 Dinosaur Kale')}
                className="hover:text-primary transition-all underline cursor-pointer font-bold"
              >
                "Add kale"
              </button>
              <span>•</span>
              <button 
                onClick={() => triggerMockMarketplaceVoice('Go to checkout')}
                className="hover:text-primary transition-all underline cursor-pointer font-bold"
              >
                "Go to checkout"
              </button>
              <span>•</span>
              <button 
                onClick={() => {
                  triggerMockMarketplaceVoice("what are today's varieties?");
                }}
                className="hover:text-secondary text-secondary transition-all underline cursor-pointer font-extrabold bg-secondary/5 px-2 py-0.5 rounded-full"
              >
                "What are today's varieties?"
              </button>
            </div>
          )}
        </div>

        {/* AI Smart Search / Google-like Match Notification Banner */}
        {isSmartMatchActive && (
          <div className="bg-gradient-to-r from-primary/5 via-[#fdf6f0] to-primary/10 border-2 border-primary/25 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary text-white rounded-xl shadow-xs shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px] leading-none animate-pulse">explore_neighbor</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-[#7a5743] uppercase tracking-wider block">Zenvego AI Search Match</span>
                <p className="font-bold text-on-surface text-sm">
                  Showing all <span className="text-primary font-extrabold">{filteredProducts.length} crop varieties</span> available near you for <span className="underline decoration-primary font-extrabold text-primary">30-40 min Delivery</span>!
                </p>
                <p className="text-xs text-on-surface-variant font-mono text-[11px] mt-0.5 italic">
                  Matched query request: "{searchTerm}"
                </p>
              </div>
            </div>
            <button 
              onClick={() => { setSearchTerm(''); }}
              className="px-3 py-1 bg-surface-container hover:bg-surface-container-highest cursor-pointer hover:text-black hover:scale-105 rounded-full text-xs font-bold text-outline border border-[#e1d5ca] transition-all"
            >
              Reset Search
            </button>
          </div>
        )}

        {/* Dynamic Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-surface-container max-w-md mx-auto space-y-4">
            <span className="material-symbols-outlined text-[48px] text-surface-dim">search_off</span>
            <p className="font-bold text-on-surface text-base">No yields found matching your criteria.</p>
            <button 
              onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}
              className="text-xs font-bold text-white bg-primary px-4 py-2 rounded-full"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((p) => {
              const inCart = cart.find(item => item.id === p.id);
              const qtyInCart = inCart ? inCart.quantity : 0;
              const meas = convertAndFormatProductWeight(p.price, p.unit, measurementSystem, currency);

              return (
                <div 
                  key={p.id}
                  className={`bg-white rounded-3xl border ${qtyInCart > 0 ? 'border-primary shadow-md' : 'border-surface-container'} overflow-hidden flex flex-col justify-between group transition-all duration-300`}
                >
                  <div>
                    {/* Img frame */}
                    <div className="h-48 relative overflow-hidden bg-surface-container-low">
                      <img 
                        src={p.image} 
                        alt={p.name} 
                        referrerPolicy="no-referrer"
                        onError={(e) => handleImageError(e, 'produce')}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Sourcing tags or labels */}
                      <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md text-[10px] uppercase font-bold px-2 py-0.5 rounded-md text-primary">
                        {p.category}
                      </span>
                      {qtyInCart > 0 && (
                        <div className="absolute top-3 left-3 bg-secondary text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1 animate-bounce">
                          <span className="material-symbols-outlined text-[12px] fill-icon">shopping_bag</span>
                          Reserved: {qtyInCart} {meas.unit}
                        </div>
                      )}
                    </div>

                    <div className="p-5 space-y-2">
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="font-bold text-[#271810] text-base leading-snug line-clamp-1 group-hover:text-primary transition-colors">{p.name}</h4>
                        <div className="text-right">
                          <span className="text-lg font-extrabold text-primary">{meas.formatted}</span>
                          <span className="text-[10px] text-outline block">/{meas.unit}</span>
                        </div>
                      </div>

                      <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed h-8">
                        {p.desc}
                      </p>

                      <div className="pt-3 border-t border-surface-container flex items-center justify-between text-xs">
                        {/* Farmer info */}
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-primary">agriculture</span>
                          <span className="font-bold text-on-surface text-[11px]">{p.farm}</span>
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded font-mono ${p.qty <= 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-surface-container text-primary'}`}>
                          {p.qty <= 0 ? 'Out of Stock' : `${p.qty} left`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Add action bucket */}
                  <div className="px-5 pb-5 pt-1">
                    {qtyInCart > 0 ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => removeFromCart(p.id)}
                          className="w-10 h-10 bg-surface-container hover:bg-surface-container-highest rounded-xl text-primary font-bold flex items-center justify-center transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">remove</span>
                        </button>
                        <span className="font-bold text-sm text-on-surface flex-grow text-center">{qtyInCart} reserved</span>
                        <button 
                          onClick={() => addToCart(p)}
                          disabled={qtyInCart >= p.qty}
                          className={`w-10 h-10 bg-surface-container hover:bg-surface-container-highest rounded-xl text-primary font-bold flex items-center justify-center transition-colors ${qtyInCart >= p.qty ? 'opacity-30 cursor-not-allowed' : ''}`}
                          title={qtyInCart >= p.qty ? "Cannot add more than available harvest stock" : "Add one more"}
                        >
                          <span className="material-symbols-outlined text-[18px]">add</span>
                        </button>
                      </div>
                    ) : (
                      p.qty <= 0 ? (
                        <button 
                          disabled
                          className="w-full bg-surface-container text-outline font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-[16px]">remove_shopping_cart</span>
                          Sold Out Today
                        </button>
                      ) : (
                        <button 
                          onClick={() => addToCart(p)}
                          className="w-full bg-primary hover:bg-primary-container text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                          Add to Pre-order list
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Embedded footer navigation for prototyping */}
      <div className="sticky bottom-0 bg-white border-t border-surface-container p-3 flex justify-around md:hidden z-40">
        <button onClick={() => setView('market-home')} className="flex flex-col items-center gap-0.5 text-xs text-outline">
          <span className="material-symbols-outlined">home</span>
          <span>Home</span>
        </button>
        <button onClick={() => setView('buyer-marketplace')} className="flex flex-col items-center gap-0.5 text-xs text-primary font-bold">
          <span className="material-symbols-outlined fill-icon">storefront</span>
          <span>Market</span>
        </button>
        <button onClick={() => setView('buyer-account')} className="flex flex-col items-center gap-0.5 text-xs text-outline">
          <span className="material-symbols-outlined">account_circle</span>
          <span>Account</span>
        </button>
        <button onClick={() => setView('checkout')} className="flex flex-col items-center gap-0.5 text-xs text-outline relative">
          <span className="material-symbols-outlined">shopping_basket</span>
          <span>Checkout</span>
          {cartCount > 0 && (
            <span className="absolute top-0 right-3 bg-secondary text-white w-2 h-2 rounded-full"></span>
          )}
        </button>
      </div>
    </div>
  );
}
