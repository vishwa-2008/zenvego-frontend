import React, { useState, useRef, useEffect } from 'react';
import { ViewState, LoggedInUser, Product } from '../types';
import { Currency, formatPrice } from '../utils/currency';
import CurrencySelector from './CurrencySelector';
import { handleImageError } from '../utils/imageFallback';
import { speechService } from '../utils/speech';

interface FarmerInventoryProps {
  setView: (view: ViewState) => void;
  addToast: (msg: string) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  sessionUser?: LoggedInUser | null;
  handleLogout?: () => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  measurementSystem: 'US' | 'IND';
}

export default function FarmerInventory({ 
  setView, 
  addToast, 
  currency, 
  setCurrency,
  sessionUser,
  handleLogout,
  products,
  setProducts,
  measurementSystem
}: FarmerInventoryProps) {
  const [voiceLogCheckinf, setVoiceLogCheckinf] = useState('Idle. Speak command to edit...');
  const [isListening, setIsListening] = useState(false);
  
  // Crop listings hook to master database list
  const listings = products;
  const setListings = setProducts;

  // Form states for adding new yield listing
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newUnit, setNewUnit] = useState('lb');
  const [newCategory, setNewCategory] = useState('Vegetables');
  const [newOrganic, setNewOrganic] = useState(true);
  const [newDesc, setNewDesc] = useState('');

  // Sourcing photo uploads / snapping states
  const [useUploadMethod, setUseUploadMethod] = useState<'upload' | 'camera' | 'presets'>('presets');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string>('https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400');
  
  const PRESET_IMAGES = [
    { name: 'Red Tomatoes', url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400' },
    { name: 'Bright Oranges', url: 'https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&q=80&w=400' },
    { name: 'Leafy Spinach', url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=400' },
    { name: 'Fresh Potatoes', url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=400' },
    { name: 'Raw Honey', url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=400' },
    { name: 'Red Berries', url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&q=80&w=400' },
    { name: 'Artisan Bread', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400' },
    { name: 'Assorted Harvest', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=400' },
  ];

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 300 } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.error(e));
      }
    } catch (err: any) {
      console.warn("Webcam access failed:", err);
      setCameraError("Camera permission blocked or webcam is unavailable in this sandbox. Use 'Choose Preset' or standard file picker!");
      setUseUploadMethod('presets');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 320;
      canvas.height = videoRef.current.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setPreviewImage(dataUrl);
        addToast("📸 Live crop visual captured successfully!");
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPreviewImage(reader.result);
          addToast("📁 Uploaded crop photo loaded successfully!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Voice command handling
  const handleVoiceCommand = () => {
    if (isListening) {
      speechService.stop();
      setIsListening(false);
      return;
    }
    
    setIsListening(true);
    setVoiceLogCheckinf('🎙️ Live Voice Parser Active. Speak commands like "add 10 tomatoes", "set peppers to 50"...');
    
    speechService.listen({
      onStart: () => {
        setIsListening(true);
      },
      onResult: (transcript: string, isFinal: boolean) => {
        setVoiceLogCheckinf(`Hearing: "${transcript}"`);
        if (isFinal) {
          setIsListening(false);
          processVoiceCommandText(transcript);
        }
      },
      onError: (err: any) => {
        console.warn('Farmer mic error:', err);
        setVoiceLogCheckinf('⚠️ Microphone access restricted. Click one of the quick mock actions below to try!');
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      }
    });
  };

  const processVoiceCommandText = (text: string) => {
    const lower = text.toLowerCase();
    
    // 1. Try to find a number/quantity
    const numMatch = lower.match(/\b\d+\b/);
    const quantity = numMatch ? parseInt(numMatch[0], 10) : null;
    
    // 2. Identify the action (add, subtract/decrease/remove, set/update)
    let action: 'add' | 'remove' | 'update' | null = null;
    if (lower.includes('add') || lower.includes('increase') || lower.includes('plus') || lower.includes('more')) {
      action = 'add';
    } else if (lower.includes('remove') || lower.includes('reduce') || lower.includes('minus') || lower.includes('less') || lower.includes('decrease')) {
      action = 'remove';
    } else if (lower.includes('set') || lower.includes('update') || lower.includes('stock')) {
      action = 'update';
    }
    
    // 3. Match items in inventory
    let matchedItemIndex = -1;
    let matchedScore = 0;
    
    listings.forEach((item, index) => {
      const nameParts = item.name.toLowerCase().split(' ');
      let score = 0;
      nameParts.forEach(part => {
        if (part.length > 2 && lower.includes(part)) {
          score += 2;
        }
      });
      
      // also check category or tags
      if (lower.includes(item.category.toLowerCase())) {
        score += 1;
      }
      
      if (score > matchedScore) {
        matchedScore = score;
        matchedItemIndex = index;
      }
    });
    
    // Direct actions based on parse success:
    if (matchedItemIndex !== -1 && quantity !== null && action) {
      const updated = [...listings];
      const item = updated[matchedItemIndex];
      const prevQty = item.qty;
      
      if (action === 'add') {
        item.qty += quantity;
        setListings(updated);
        setVoiceLogCheckinf(`Vocal Match: "Add ${quantity} to ${item.name}" - Stock updated: ${prevQty} ➔ ${item.qty}`);
        addToast(`🎙️ Voice parsed: Added ${quantity} to ${item.name} stock!`);
      } else if (action === 'remove') {
        item.qty = Math.max(0, item.qty - quantity);
        setListings(updated);
        setVoiceLogCheckinf(`Vocal Match: "Remove ${quantity} from ${item.name}" - Stock updated: ${prevQty} ➔ ${item.qty}`);
        addToast(`🎙️ Voice parsed: Reduced ${item.name} stock by ${quantity}`);
      } else if (action === 'update') {
        item.qty = quantity;
        setListings(updated);
        setVoiceLogCheckinf(`Vocal Match: "Set ${item.name} to ${quantity}" - Stock updated: ${prevQty} ➔ ${item.qty}`);
        addToast(`🎙️ Voice parsed: Set ${item.name} stock to ${quantity}`);
      }
      return;
    }
    
    // 4. Other commands: Boost
    if (lower.includes('boost') || lower.includes('feature')) {
      let targetIndex = matchedItemIndex;
      if (targetIndex === -1) {
        targetIndex = listings.findIndex(l => l.name.toLowerCase().includes('tomato'));
      }
      if (targetIndex !== -1) {
        const updated = [...listings];
        updated[targetIndex].boosted = !updated[targetIndex].boosted;
        setListings(updated);
        setVoiceLogCheckinf(`Vocal Match: "Boost ${updated[targetIndex].name}" - Highlight: ${updated[targetIndex].boosted ? 'ENABLED' : 'DISABLED'}`);
        addToast(`🎙️ Voice Toggle: ${updated[targetIndex].name} boosted!`);
        return;
      }
    }
    
    // 5. Organic
    if (lower.includes('organic') || lower.includes('gmo')) {
      let targetIndex = matchedItemIndex;
      if (targetIndex === -1) {
        targetIndex = listings.findIndex(l => l.name.toLowerCase().includes('peppers'));
      }
      if (targetIndex !== -1) {
        const updated = [...listings];
        updated[targetIndex].organic = !updated[targetIndex].organic;
        setListings(updated);
        setVoiceLogCheckinf(`Vocal Match: "Organic ${updated[targetIndex].name}" - Organic: ${updated[targetIndex].organic ? 'TRUE' : 'FALSE'}`);
        addToast(`🎙️ Voice Toggle: ${updated[targetIndex].name} organic flag toggled.`);
        return;
      }
    }
    
    // fallback
    setVoiceLogCheckinf(`Parsed vocal transcript: "${text}" (Unsure about command. Try saying: "add 10 tomatoes")`);
    addToast(`Hearing: "${text}". Ask to add, update or toggle listings.`);
  };

  const triggerMockFarmerVoice = (phrase: string) => {
    setIsListening(true);
    setVoiceLogCheckinf('Processing voice token stream...');
    let i = 0;
    const interval = setInterval(() => {
      const parts = phrase.split(' ');
      const sub = parts.slice(0, i + 1).join(' ');
      setVoiceLogCheckinf(`Vocal stream: "${sub}"`);
      i++;
      if (i >= parts.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsListening(false);
          processVoiceCommandText(phrase);
        }, 400);
      }
    }, 240);
  };

  const handleAddNewListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPrice || !newQty) {
      addToast("Please fill in all core harvest parameters!");
      return;
    }
    const safeDesc = newDesc.trim() || `Freshly harvested premium ${newName} sourced from direct community soil blocks. Deliver flat in 30-40 mins.`;
    const item: Product = {
      id: `prod-user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: newName,
      price: parseFloat(newPrice),
      qty: parseInt(newQty),
      unit: newUnit,
      category: newCategory,
      origin: 'Field Block G',
      organic: newOrganic,
      boosted: false,
      image: previewImage,
      farm: sessionUser?.name || "Sunny Hills Organic",
      farmer: sessionUser?.name || "Local grower",
      desc: safeDesc
    };
    setListings([...listings, item]);
    addToast(`Successfully registered ${newName} on community harvest ledger!`);
    
    // clear form
    setNewName('');
    setNewPrice('');
    setNewQty('');
    setNewDesc('');
  };

  const handleRemoveListing = (id: string | number) => {
    setListings(listings.filter(l => l.id !== id));
    addToast("🗑️ Harvest listing removed from today's items to sell!");
  };

  const toggleBoost = (id: string | number) => {
    setListings(listings.map(l => l.id === id ? { ...l, boosted: !l.boosted } : l));
    const item = listings.find(l => l.id === id);
    if (item) {
      addToast(!item.boosted ? `Boosted priority ranking for ${item.name}!` : `Deactivated priority ranking for ${item.name}`);
    }
  };

  const toggleOrganic = (id: string | number) => {
    setListings(listings.map(l => l.id === id ? { ...l, organic: !l.organic } : l));
  };

  const updateQty = (id: string | number, delta: number) => {
    setListings(listings.map(l => {
      if (l.id === id) {
        const targetQty = l.qty + delta;
        return { ...l, qty: targetQty < 0 ? 0 : targetQty };
      }
      return l;
    }));
  };

  return (
    <div id="farmer-inventory-container" className="min-h-screen bg-[#fff8f6] flex flex-col font-sans">
      
      {/* Header */}
      <header className="bg-white border-b border-surface-container py-3.5 px-4 md:px-8 sticky top-0 z-40 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary hover:bg-surface-container p-2 rounded-full cursor-pointer" onClick={() => setView('farmer-dashboard')}>arrow_back</span>
          <div>
            <h1 className="text-sm font-extrabold text-[#271810]">
              Crop Inventory Hub • {sessionUser ? sessionUser.name : "Sunny Hills"}
            </h1>
            <p className="text-[10px] text-outline font-semibold uppercase tracking-wider">Configure your live crop drop schedules</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CurrencySelector currency={currency} setCurrency={setCurrency} />
          
          <button 
            onClick={() => setView('farmer-dashboard')}
            className="bg-primary hover:bg-primary-container text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">analytics</span>
            Sales Overview Dashboard
          </button>
        </div>
      </header>

      <div className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Crop listings & Voice Assistant widget */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Voice Assistant command module */}
          <div className="bg-white rounded-3xl p-6 border border-surface-container space-y-3 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none"></div>
            
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-extrabold text-[#271810] text-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary leading-none">record_voice_over</span>
                  Farmer Vocal Assistant Ledger Tool
                </h3>
                <p className="text-xs text-on-surface-variant">Perform hands-free stock increments direct from field fields</p>
              </div>

              <button 
                onClick={handleVoiceCommand}
                type="button"
                className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${isListening ? 'bg-secondary text-white animate-pulse' : 'bg-surface-container hover:bg-surface-container-highest text-primary'}`}
              >
                <span className="material-symbols-outlined text-[16px] leading-none">{isListening ? 'mic' : 'mic_none'}</span>
                {isListening ? 'Listening field command...' : 'Talk to ledger'}
              </button>
            </div>

            <div className="p-3 bg-surface-container-low rounded-xl border border-surface-container-high space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                  <span className="font-mono text-outline">{voiceLogCheckinf}</span>
                </div>
              </div>
              
              <div id="farmer-voice-shortcuts" className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-dashed border-surface-container-high">
                <span className="text-[10px] font-bold text-primary uppercase mr-1">Vocal Presets:</span>
                <button 
                  onClick={() => triggerMockFarmerVoice('Add 10 Tomatoes')}
                  type="button"
                  className="px-2 py-0.5 text-[10px] font-bold bg-white text-[#7a5743] hover:text-[#271810] border border-surface-container-highest rounded-full hover:shadow-2xs cursor-pointer"
                >
                  "Add 10 Tomatoes"
                </button>
                <button 
                  onClick={() => triggerMockFarmerVoice('Set peppers to 50')}
                  type="button"
                  className="px-2 py-0.5 text-[10px] font-bold bg-white text-[#7a5743] hover:text-[#271810] border border-surface-container-highest rounded-full hover:shadow-2xs cursor-pointer"
                >
                  "Set peppers to 50"
                </button>
                <button 
                  onClick={() => triggerMockFarmerVoice('Reduce carrots by 5')}
                  type="button"
                  className="px-2 py-0.5 text-[10px] font-bold bg-white text-[#7a5743] hover:text-[#271810] border border-surface-container-highest rounded-full hover:shadow-2xs cursor-pointer"
                >
                  "Reduce carrots by 5"
                </button>
                <button 
                  onClick={() => triggerMockFarmerVoice('Boost tomatoes')}
                  type="button"
                  className="px-2 py-0.5 text-[10px] font-bold bg-white text-[#7a5743] hover:text-[#271810] border border-surface-container-highest rounded-full hover:shadow-2xs cursor-pointer"
                >
                  "Boost tomatoes"
                </button>
              </div>
            </div>
          </div>

          {/* Active Listings status list */}
          <div className="space-y-4">
            <h3 className="font-semibold text-on-surface text-sm">Your Live Sourcing Ledger Items</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {listings.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl p-4 border border-surface-container flex gap-3 shadow-xs hover:border-surface-container-high transition-colors">
                  {/* Small crop photo preview frame */}
                  <div className="w-16 h-16 rounded-xl bg-surface-container-low overflow-hidden shrink-0 border border-surface-container flex items-center justify-center">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      onError={(e) => handleImageError(e, 'produce')}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Details and Actions */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] text-outline uppercase font-mono tracking-wider truncate">{item.origin} • {item.category}</p>
                          <h4 className="font-extrabold text-on-surface text-xs mt-0.5 truncate" title={item.name}>{item.name}</h4>
                          <p className="text-xs text-primary font-bold mt-0.5">{formatPrice(item.price, currency)} / {item.unit}</p>
                        </div>

                        {/* Control buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button 
                            type="button"
                            onClick={() => toggleBoost(item.id)}
                            className={`p-1.5 rounded-lg border transition-all ${item.boosted ? 'bg-[#ffebd5] border-[#ffb74d] text-[#b26a00]' : 'bg-surface-container border-surface-container-high text-outline hover:text-on-surface'}`}
                            title={item.boosted ? "Priority Boosted active" : "Boost priority ranking"}
                          >
                            <span className="material-symbols-outlined text-[14px] leading-none">rocket_launch</span>
                          </button>
                          
                          <button 
                            type="button"
                            onClick={() => handleRemoveListing(item.id)}
                            className="p-1.5 rounded-lg border border-red-100 hover:border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-all"
                            title="Remove listing from ledger"
                          >
                            <span className="material-symbols-outlined text-[14px] leading-none">delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Stock Adjuster */}
                      <div className="flex items-center justify-between bg-surface-container-low rounded-lg p-1.5 border border-surface-container mt-2">
                        <span className="text-[10px] text-on-surface font-semibold">Qty left:</span>
                        <div className="flex items-center gap-1.5">
                          <button 
                            type="button"
                            onClick={() => updateQty(item.id, -1)}
                            className="w-6 h-6 rounded bg-white border border-surface-container hover:bg-surface-container text-xs text-outline font-bold flex items-center justify-center transition-colors"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold text-xs text-primary px-1">{item.qty} {item.unit}</span>
                          <button 
                            type="button"
                            onClick={() => updateQty(item.id, 1)}
                            className="w-6 h-6 rounded bg-white border border-surface-container hover:bg-surface-container text-xs text-outline font-bold flex items-center justify-center transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Line Toggles */}
                    <div className="flex items-center justify-between text-[10px] pt-1.5 mt-2 border-t border-surface-container/40">
                      <label className="flex items-center gap-1 cursor-pointer font-bold text-outline">
                        <input 
                          type="checkbox" 
                          checked={item.organic}
                          onChange={() => toggleOrganic(item.id)}
                          className="rounded accent-primary text-[10px]" 
                        />
                        <span>Organic</span>
                      </label>

                      <span className="text-[9px] text-outline font-semibold">
                        {item.boosted ? '🚀 Boost Active' : 'Standard'}
                      </span>
                    </div>

                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

        {/* Right Column: Add New yield register Form */}
        <div className="lg:col-span-4">
          <form onSubmit={handleAddNewListing} className="bg-white rounded-3xl p-6 border border-surface-container space-y-4 shadow-sm sticky top-24">
            <div>
              <h3 className="font-extrabold text-[#271810] text-sm">Register Fresh Harvest Yield</h3>
              <p className="text-xs text-on-surface-variant">Publish items instantly to neighborhood consumer shopping bags</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-outline uppercase block">Crop Label / Item Title</label>
              <input 
                type="text" 
                placeholder="e.g. Heirloom Swish Bell Peppers"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-background border border-surface-container px-3 py-2.5 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-outline uppercase block">Unit price ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="3.20"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full bg-background border border-surface-container px-3 py-2.5 rounded-xl text-xs text-on-surface text-center font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-outline uppercase block">Unit type</label>
                <select 
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full bg-background border border-surface-container px-3 py-2.5 rounded-xl text-xs text-on-surface"
                >
                  <option value="lb">lb (pound)</option>
                  <option value="bunch">Bunch</option>
                  <option value="loaf">Loaf</option>
                  <option value="piece">Piece</option>
                  <option value="jar">Jar</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-outline uppercase block">Initial Quantity</label>
                <input 
                  type="number" 
                  placeholder="15"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  className="w-full bg-background border border-surface-container px-3 py-2.5 rounded-xl text-xs text-on-surface text-center font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-outline uppercase block">Product category</label>
                <select 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-background border border-surface-container px-3 py-2.5 rounded-xl text-xs text-on-surface"
                >
                  <option value="Vegetables">Vegetables</option>
                  <option value="Roots">Root Crops</option>
                  <option value="Bakery">Micro-Baked</option>
                  <option value="Sweets">Sweets & Honey</option>
                </select>
              </div>
            </div>

            {/* Custom Description row */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-outline uppercase block">Crops Short Description</label>
              <textarea 
                rows={2}
                placeholder="Describe freshness, aroma, soil block, or taste..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full bg-background border border-surface-container px-3 py-2 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Sourcing Crop Photo bucket */}
            <div className="space-y-2 border border-surface-container rounded-2xl p-3 bg-surface-container-low">
              <span className="text-[10px] font-bold text-outline uppercase block">Crop Image / Snapshot</span>
              
              {/* Media preview screen */}
              <div className="h-32 rounded-xl bg-black overflow-hidden relative flex items-center justify-center border border-surface-container">
                {useUploadMethod === 'camera' && cameraStream ? (
                  <video 
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <img 
                    src={previewImage} 
                    alt="Preview" 
                    onError={(e) => handleImageError(e, 'produce')}
                    className="w-full h-full object-cover"
                  />
                )}
                
                {useUploadMethod === 'camera' && cameraStream && (
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-full shadow-md flex items-center gap-1 transition-all animate-pulse"
                  >
                    <span className="material-symbols-outlined text-[12px]">photo_camera</span>
                    Snap Crop Photo
                  </button>
                )}
              </div>

              {cameraError && (
                <p className="text-[9px] text-red-600 font-extrabold leading-snug">{cameraError}</p>
              )}

              {/* Selector methods */}
              <div className="flex gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setUseUploadMethod('presets');
                    stopCamera();
                  }}
                  className={`flex-1 py-1 px-2 text-[9px] font-extrabold rounded-lg transition-all ${useUploadMethod === 'presets' ? 'bg-primary text-white shadow-xs' : 'bg-white border border-surface-container hover:bg-surface-container-low text-outline'}`}
                >
                  Preset Crop
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseUploadMethod('camera');
                    startCamera();
                  }}
                  className={`flex-1 py-1 px-2 text-[9px] font-extrabold rounded-lg transition-all ${useUploadMethod === 'camera' ? 'bg-primary text-white shadow-xs' : 'bg-white border border-surface-container hover:bg-surface-container-low text-outline'}`}
                >
                  📸 Live Snap
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseUploadMethod('upload');
                    stopCamera();
                  }}
                  className={`flex-1 py-1 px-2 text-[9px] font-extrabold rounded-lg transition-all ${useUploadMethod === 'upload' ? 'bg-primary text-white shadow-xs' : 'bg-white border border-surface-container hover:bg-surface-container-low text-outline'}`}
                >
                  📁 File Upload
                </button>
              </div>

              {/* Content conditional loaders */}
              {useUploadMethod === 'presets' && (
                <div className="grid grid-cols-4 gap-1 pt-1 max-h-16 overflow-y-auto">
                  {PRESET_IMAGES.map((img) => (
                    <button
                      key={img.name}
                      type="button"
                      onClick={() => setPreviewImage(img.url)}
                      className={`h-8 rounded overflow-hidden border transition-all relative ${previewImage === img.url ? 'border-primary ring-2 ring-primary/20 scale-95' : 'border-surface-container'}`}
                      title={img.name}
                    >
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {useUploadMethod === 'upload' && (
                <div className="pt-1 select-none">
                  <label className="flex items-center justify-center gap-1 h-9 border border-dashed border-outline-variant hover:border-primary rounded-xl cursor-pointer text-[9px] font-bold text-outline hover:text-primary bg-white transition-all">
                    <span className="material-symbols-outlined text-[14px]">upload_file</span>
                    Choose Crop PNG/JPG
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload}
                      className="hidden" 
                    />
                  </label>
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[#271810] pt-1.5">
              <input 
                type="checkbox" 
                checked={newOrganic} 
                onChange={(e) => setNewOrganic(e.target.checked)}
                className="rounded text-primary accent-primary" 
              />
              <span>Grown with 100% Organic principles</span>
            </label>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-container text-white font-bold py-3.5 rounded-2xl text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Publish Harvest Listing
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
