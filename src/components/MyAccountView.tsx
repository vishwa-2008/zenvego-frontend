import React, { useState, useRef, useEffect } from 'react';
import { ViewState, LoggedInUser } from '../types';
import { Currency, formatPrice } from '../utils/currency';
import CurrencySelector from './CurrencySelector';
import { handleImageError } from '../utils/imageFallback';
import { formatDistance, formatWeight } from '../utils/measurement';
import QrCodeRenderer from './QrCodeRenderer';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const CUSTOMER_EMOJIS = ['🛒', '🍎', '🥗', '🌱', '🧺', '🥕', '🫐', '🍓', '🧅', '🌾', '💚', '⭐'];

function generateEmojiAvatar(emoji: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff3e0" rx="50"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="55">${emoji}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

interface MyAccountViewProps {
  setView: (view: ViewState) => void;
  addToast: (msg: string) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  sessionUser?: LoggedInUser | null;
  setSessionUser?: (user: LoggedInUser | null) => void;
  handleLogout?: () => void;
  measurementSystem?: 'US' | 'IND';
}

export default function MyAccountView({ 
  setView, 
  addToast, 
  currency, 
  setCurrency,
  sessionUser,
  setSessionUser,
  handleLogout,
  measurementSystem = 'US'
}: MyAccountViewProps) {
  const [activeTab, setActiveTab] = useState('orders');
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarTab, setAvatarTab] = useState<'emoji' | 'gallery' | 'camera'>('emoji');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showCustomerQrModal, setShowCustomerQrModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateAvatar = (avatar: string) => {
    if (sessionUser && setSessionUser) {
      const updated = { ...sessionUser, avatar };
      setSessionUser(updated);
      localStorage.setItem('zenvego_session_user', JSON.stringify(updated));
      addToast('✅ Profile photo updated!');
    }
    stopCamera();
    setShowAvatarModal(false);
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      addToast('📷 Camera not available. Please allow camera access.');
    }
  };

  const stopCamera = () => {
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    updateAvatar(canvas.toDataURL('image/jpeg', 0.85));
  };

  const openAvatarModal = (tab: 'emoji' | 'gallery' | 'camera') => {
    setAvatarTab(tab);
    setShowAvatarModal(true);
    if (tab === 'camera') startCamera();
  };

  const closeAvatarModal = () => {
    stopCamera();
    setShowAvatarModal(false);
  };

  // Deep interactive Courier Tracking Map & Chat System
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [courierLocation, setCourierLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    const COURIER_LOC_KEY = 'zenvego_courier_locations';

    const readLatestLocation = (): [number, number] | null => {
      try {
        const raw = localStorage.getItem(COURIER_LOC_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
            return [parsed.lat, parsed.lng];
          }
        }
      } catch (_) {}
      return null;
    };

    const initial = readLatestLocation();
    if (initial) {
      setCourierLocation(initial);
    } else {
      setCourierLocation(measurementSystem === 'IND' ? [19.0760, 72.8777] : [34.0522, -118.2437]);
    }

    const interval = setInterval(() => {
      const loc = readLatestLocation();
      if (loc) setCourierLocation(loc);
    }, 3000);

    const onStorage = (e: StorageEvent) => {
      if (e.key === COURIER_LOC_KEY) {
        const loc = readLatestLocation();
        if (loc) setCourierLocation(loc);
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, [measurementSystem]);

  const courierMotorcycleIcon = L.divIcon({
    html: `<div style="background-color: #ff5c3e; color: white; border-radius: 50%; padding: 4px; border: 2px solid white; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"><span class="material-symbols-outlined" style="font-size: 16px;">motorcycle</span></div>`,
    className: '', iconSize: [30, 30], iconAnchor: [15, 15]
  });

  const [chatMessages, setChatMessages] = useState([
    { sender: 'courier', text: 'Hi Sarah! I am heading to Sunny Hills Organic to collect your heirloom tomatoes and bunch of carrots. See you soon!', time: '12m ago' },
    { sender: 'system', text: 'Alex River registered secure handoff QR code: ZEN-RELEASE-7749.', time: '10m ago' }
  ]);
  const [typedMessage, setTypedMessage] = useState('');
  const [isCalling, setIsCalling] = useState(false);

  const handleSendChatMessage = () => {
    if (!typedMessage.trim()) return;
    const userMsg = typedMessage;
    
    setChatMessages(prev => [
      ...prev,
      { sender: 'user', text: userMsg, time: 'Just Now' }
    ]);
    setTypedMessage('');

    // Simulated responses from driver Alex
    setTimeout(() => {
      let automatedReply = "Received! Sourcing from grower John and packing it carefully into secure thermal pouch.";
      if (userMsg.toLowerCase().includes('rotten') || userMsg.toLowerCase().includes('fresh')) {
        automatedReply = "Yes, John's crops are harvested fresh today. Soil is completely organic!";
      } else if (userMsg.toLowerCase().includes('slow') || userMsg.toLowerCase().includes('where')) {
        automatedReply = "Drafting route on the radar map now. The delivery timeline is active!";
      } else if (userMsg.toLowerCase().includes('qr') || userMsg.toLowerCase().includes('code')) {
        automatedReply = "I have the QR display ready. John Miller can scan it once I pull up at the barn.";
      }
      setChatMessages(prev => [
        ...prev,
        { sender: 'courier', text: automatedReply, time: 'Just Now' }
      ]);
    }, 1500);
  };

  const trackerStats = [
    { label: "Community Orders", value: "14", unit: "bookings" },
    { label: "Hyperlocal Sourced", value: "98%", unit: "density" },
    { label: "Carbon Emissions Saved", value: "42.8", unit: "kg CO₂" },
    { label: "Local Economy Shared", value: formatPrice(392, currency), unit: "ZenRewards" }
  ];

  const recentBookings = [
    {
      id: "ZVG-902",
      date: "Just Now",
      status: "In progress - Courier Assigned",
      courier: "Alex River",
      items: [
        { name: "Organic Vine Heirloom Tomatoes", qty: measurementSystem === 'IND' ? '1.4 kg' : '3 lbs' },
        { name: "Rainbow Heirloom Carrots Bunch", qty: "1 bunch" }
      ],
      amount: 17.90
    },
    {
      id: "ZVG-811",
      date: "June 14, 2026",
      status: "Completed & Registered",
      courier: "Alex River",
      items: [
        { name: "Crusty Artisan Rye Sourdough Loup", qty: "1 loaf" },
        { name: "Earthy Mountain Dinosaur Kale", qty: "2 bunches" }
      ],
      amount: 12.00
    },
    {
      id: "ZVG-704",
      date: "June 02, 2026",
      status: "Completed & Registered",
      courier: "Mike Ross",
      items: [
        { name: "Wildflower Pure Raw Comb Honey", qty: "2 jars" }
      ],
      amount: 17.00
    }
  ];

  const favoritedFarmers = [
    {
      name: "Helen's Heritage Greenhouses",
      avgRange: formatDistance(3.4, measurementSystem),
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCCjUJN2RqS2wtqTaPi27AiyPi7g7S0RgEJtPiLJnl-mSe8feG3-3UKtT6OF8L6_bDFEPIYNLSPRloEOnxgbwHBhNwoEU5yGIQRMNnaZdtnv4tkw2kFA-HaNadp5_4KT5GyoqDyyVpb5r0uFsT-Efg27H8eGmChUD5P10ow4jDjRiEAOJcl93CoADfwn4wtkQF26kVcq2Jnl0391He7TFZx5Zat1DYNaBkyOqYn4FNFqVd-5BiOytimCkFIpXiLxIHj4zQv4vohxRlj",
      banner: "https://lh3.googleusercontent.com/aida-public/AB6AXuACPN9-qhfu4ljjZTTBJ56SF-QKxCkb8aLLLATJrhjSOafNha2Cm09u5QEt3GSHOMXDjVw8hEeOnnbecR2X7lGnO4eXlYjL4iiw5YPNjeAtRosMrbu-fIOi8FAjKj25tY2C5m67-s4XqxCzDkz5Kem4qZQx_GhnWCwOejoHSWNePjZDgujcX2DgFkM1nCKNNFGTYOv0tQcI8VISrT46Jr1ro3NmJA0e2-MvdNooGTlK47RQLMCBBcy7ptroN_SjgeNijsTZOWaV6h2c",
      produce: "Swedes, Dinosaur Kale, Bell Peppers",
      deliveries: 124
    }
  ];

  return (
    <div id="account-container" className="min-h-screen bg-[#fff8f6] flex flex-col font-sans">
      
      {/* Dynamic Profile Header */}
      <header className="bg-white border-b border-surface-container py-4 px-4 md:px-8 sticky top-0 z-40 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('buyer-marketplace')}>
          <span className="material-symbols-outlined text-primary hover:bg-surface-container p-2 rounded-full">arrow_back</span>
          <div className="flex items-center gap-2">
            <div className="relative group cursor-pointer" onClick={(e) => { e.stopPropagation(); openAvatarModal('emoji'); }}>
              {sessionUser?.avatar ? (
                <img 
                  src={sessionUser.avatar} 
                  alt="" 
                  onError={(e) => handleImageError(e, 'avatar')}
                  className="w-8 h-8 rounded-full object-cover border-2 border-primary/20 group-hover:opacity-75 transition-opacity"
                />
              ) : (
                <span className="material-symbols-outlined text-[28px] text-primary fill-icon">account_circle</span>
              )}
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[12px]">edit</span>
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#271810]">
                {sessionUser ? sessionUser.name : 'Sarah Jenkins'} / Profile Portal
              </h2>
              <p className="text-[9px] text-outline font-semibold uppercase tracking-wider">
                {sessionUser ? `Verified Member via ${sessionUser.authMethod}` : 'Verified Consumer Since 2024'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <CurrencySelector currency={currency} setCurrency={setCurrency} />
          
          <button 
            onClick={() => setView('buyer-marketplace')}
            className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-primary hover:bg-primary-container shadow-sm flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">storefront</span>
            Go Sourcing
          </button>
          
          {sessionUser && (
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-full text-xs font-bold text-[#7a5743] hover:text-white bg-surface-container hover:bg-[#a24000] border border-[#a24000]/10 transition-all cursor-pointer"
            >
              Log Out
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-grow p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
        
        {/* Upper Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {trackerStats.map((stat, idx) => (
            <div key={idx} className="bg-white p-4 rounded-2xl border border-surface-container shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-outline block">{stat.label}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-primary">{stat.value}</span>
                <span className="text-[10px] text-on-surface-variant">{stat.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Live Courier Dispatch tracking */}
        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfMWpyldO-8cnwsG7JzSrsxx9DrG4McUUom3CqMpQJVpj1v6I6TLZMadueF362Qs8Cjf7SfKJ3E4zmfFXEWy9Djbz4BUZUn2tkAKCrpYU2V4CwCLmff7VgNXZIGt_Mrh6YE_bXQ8CYgn1R_3lX8X2QuLDCkU1GQgz_N3aS83HjvoCw34wBwsuwL9vFEC4uRDKdE60KqoobRFrYkPPeUDlbc5pYHTVkjSN0SGDx0YGsUNofl4_CUVDD4k7gGQlZ-p3iHJnoeulHb1zf" 
                alt="Alex Courier" 
                onError={(e) => handleImageError(e, 'avatar')}
                className="w-12 h-12 rounded-full object-cover border-2 border-primary"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
            </div>
            
            <div className="space-y-0.5">
              <p className="text-xs uppercase font-bold text-secondary">Active Dispatch Notification</p>
              <h4 className="font-bold text-sm text-[#271810]">Alex River • Zenvego Neighborhood Courier</h4>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Courier expects completion at <strong>4:45 PM</strong>. Lock-box PIN generated: <code className="bg-surface-container px-1 rounded text-primary font-bold">#4910</code>
              </p>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => {
                setShowTrackerModal(true);
                addToast("📍 Mapped real-time GPS tracking dashboard to Courier Alex River.");
              }}
              className="flex-1 md:flex-none text-xs font-bold text-primary bg-surface-container-high hover:bg-surface-container-highest px-3.5 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">map</span>
              Track Map & Chat
            </button>
            <button 
              onClick={() => {
                setIsCalling(true);
                addToast("🛰️ Routing secure voice call tunnel to Alex River...");
              }}
              className="px-3 py-2 rounded-xl bg-primary hover:bg-primary-container text-white"
              title="Call Alex"
            >
              <span className="material-symbols-outlined text-[16px] leading-none">call</span>
            </button>
          </div>
        </div>

        {/* Outer Split Columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Recent Orders section */}
          <div className="md:col-span-7 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary">receipt_long</span>
              <h3 className="font-extrabold text-on-surface text-base">Your Community Ledger Bookings</h3>
            </div>

            <div className="space-y-4">
              {recentBookings.map((b) => (
                <div key={b.id} className="bg-white rounded-2xl p-5 border border-surface-container space-y-3 shadow-none">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-mono text-outline block">{b.date}</span>
                      <p className="font-bold text-xs text-on-surface">Reference {b.id}</p>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status.includes('progress') ? 'bg-secondary-container text-white' : 'bg-[#e2f5ec] text-primary'}`}>
                      {b.status}
                    </span>
                  </div>

                  <div className="bg-[#fff9f6] p-3 rounded-xl border border-surface-container-low space-y-1">
                    {b.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-on-surface-variant">
                        <span>{item.name}</span>
                        <span className="font-bold text-on-surface">{item.qty}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-surface-container-low">
                    <span className="text-outline">Assigned Courier: <strong>{b.courier}</strong></span>
                    <span className="font-extrabold text-primary">{formatPrice(b.amount, currency)}</span>
                  </div>

                  {b.id === 'ZVG-902' && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowCustomerQrModal(true)}
                        className="text-xs font-bold bg-[#ff5c3e] hover:bg-[#ff5c3e]/90 text-white px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">qr_code</span>
                        Show My QR
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right widgets */}
          <div className="md:col-span-5 space-y-6">
            
            {/* Ratatouille Recipe Card widget */}
            <div className="bg-white rounded-3xl border border-surface-container overflow-hidden shadow-sm">
              <div className="h-40 relative">
                <img 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFWJVcwNG1CKGaxq-YvECKdqXLr5OjnpfA0tYS76_HQ0eGyYRMzBhIhmmRYhrsJ9ZDNOuurLuFb1O7Vl8KVVtaCiQN2mcqpnG15F0m9kYCQpoQu4pPnZCdyVUc4lIo-anvQvbzcTUTF7qj0_EKBKklGEkEFdNBe2NatnG5G7nu9iC3eeKJqxx-PEf5p2kQivJl446_oK89Ug5j2K1e3HBIbL41SnTU6Afb7KuLZ_oBRo9mybmTlMYhmJd52Jixi0G3fM-f6TjDolZj" 
                  alt="Plated Ratatouille in Ceramic Bowl" 
                  referrerPolicy="no-referrer"
                  onError={(e) => handleImageError(e, 'produce')}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-3 left-3 bg-[#a24000] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  AI Culinary suggestion
                </span>
              </div>
              <div className="p-5 space-y-3">
                <h4 className="font-bold text-on-surface text-sm">Provencal Vegetable Ratatouille</h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Based on your purchase logs of organic heirlooms and purple brinjals, we generated a bespoke zero-waste family recipe.
                </p>
                <button 
                  onClick={() => setShowRecipeModal(true)}
                  className="w-full bg-[#faddce] hover:bg-[#ffe2d5] text-[#7c2f00] font-bold text-xs py-2 rounded-xl transition-colors"
                >
                  Show Ingredients & Methods
                </button>
              </div>
            </div>

            {/* Favorited growers */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-outline">Favorited Harvesters</h4>
              
              {favoritedFarmers.map((f, idx) => (
                <div key={idx} className="bg-white rounded-2xl overflow-hidden border border-surface-container shadow-none">
                  <div className="h-20 bg-cover bg-center" style={{ backgroundImage: `url(${f.banner})` }}></div>
                  <div className="p-4 flex gap-3 -mt-6">
                    <img 
                      src={f.avatar} 
                      alt={f.name} 
                      onError={(e) => handleImageError(e, 'avatar')}
                      className="w-10 h-10 rounded-full border-2 border-white object-cover" 
                    />
                    <div className="space-y-1 mt-6 flex-grow">
                      <h5 className="font-bold text-xs text-on-surface">{f.name}</h5>
                      <p className="text-[10px] text-outline">{f.avgRange} • Verified Supplier</p>
                      <p className="text-[10px] text-primary font-bold">Producing: {f.produce}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recipie popup Modal */}
      {showRecipeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-surface-container">
              <div>
                <h3 className="font-extrabold text-[#271810] text-base">Provencal Heirloom Ratatouille</h3>
                <p className="text-[10px] text-[#7c2f00]">Matched with your vine tomato cart</p>
              </div>
              <button 
                onClick={() => setShowRecipeModal(false)}
                className="text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-on-surface-variant">
              <div>
                <span className="font-bold text-[#271810]">Ingredients available in your order:</span>
                <ul className="list-disc pl-4 mt-1 space-y-1">
                  <li>3 Vine Heirloom Tomatoes (sliced thinly)</li>
                  <li>{formatWeight(1.5, measurementSystem)} Purple Brinjals / Eggplants (sliced)</li>
                  <li>1 bundle Dinosaur Kale (sautéed for serving base)</li>
                </ul>
              </div>

              <div>
                <span className="font-bold text-[#271810]">Required pantry addition:</span>
                <p className="mt-0.5">Extra virgin olive oil, 2 cloves minced garlic, fresh basil, and coarse sea salt.</p>
              </div>

              <div className="pt-2 border-t border-surface-container space-y-2">
                <p className="font-bold text-[#271810]">Chef's Methods:</p>
                <ol className="list-decimal pl-4 space-y-1.5 font-normal text-on-surface-variant">
                  <li>Preheat standard oven to 375°F. Arrange tomato and eggplant slices sequentially in circular patterns inside shallow baking dish.</li>
                  <li>Drizzle with robust local olive oil, minced garlic, sea salt, and minced basil leaves.</li>
                  <li>Cover with parchment paper and bake for 40 minutes until veggies are tender. Serve hot on beds of braised dynamic dinosaur kale!</li>
                </ol>
              </div>
            </div>

            <button 
              onClick={() => {
                setShowRecipeModal(false);
                addToast("Recipe steps saved to your local recipe book.");
              }}
              className="w-full bg-primary text-white font-bold py-2.5 rounded-xl text-xs mt-3"
            >
              Close recipe
            </button>
          </div>
        </div>
      )}

      {/* CUSTOMER QR CODE MODAL — show to delivery partner for package confirmation */}
      {showCustomerQrModal && (
        <div className="fixed inset-0 bg-[#271810]/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl text-center space-y-5 border border-slate-100">
            <button onClick={() => setShowCustomerQrModal(false)} className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center text-slate-500 font-bold">✕</button>
            <div className="space-y-1">
              <span className="bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-primary/20">Package Confirmation QR</span>
              <h3 className="text-base font-black text-[#271810] pt-1">Show This to Your Rider</h3>
              <p className="text-xs text-slate-500">Alex River will scan or enter this code to confirm your delivery.</p>
            </div>
            <div className="flex justify-center">
              <QrCodeRenderer text="ZVG-CONFIRM-902" size={180} />
            </div>
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Your Confirmation Code</p>
              <p className="text-2xl font-black font-mono text-primary tracking-widest mt-1">ZVG-CONFIRM-902</p>
            </div>
            <p className="text-[10px] text-slate-400 italic">This code is tied to Order #ZVG-902. Do not share with others.</p>
            <button onClick={() => setShowCustomerQrModal(false)} className="w-full bg-primary text-white font-bold py-2.5 rounded-xl text-sm">
              Done
            </button>
          </div>
        </div>
      )}

      {/* AVATAR PICKER MODAL */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-[#271810]/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex border-b border-slate-100">
              {(['emoji', 'gallery', 'camera'] as const).map(tab => (
                <button key={tab}
                  onClick={() => { if (tab === 'camera') startCamera(); else stopCamera(); setAvatarTab(tab); }}
                  className={`flex-1 py-3 text-xs font-extrabold capitalize transition-colors ${avatarTab === tab ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-500 hover:bg-slate-50'}`}>
                  {tab === 'emoji' ? '😄 Emoji' : tab === 'gallery' ? '🖼 Gallery' : '📷 Camera'}
                </button>
              ))}
            </div>
            <div className="p-5">
              {avatarTab === 'emoji' && (
                <div className="grid grid-cols-4 gap-3">
                  {CUSTOMER_EMOJIS.map(emoji => (
                    <button key={emoji} onClick={() => updateAvatar(generateEmojiAvatar(emoji))}
                      className="text-4xl bg-slate-50 hover:bg-primary/5 border border-slate-100 hover:border-primary/20 rounded-2xl aspect-square flex items-center justify-center transition-all hover:scale-110 shadow-sm">
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              {avatarTab === 'gallery' && (
                <div className="text-center space-y-4 py-4">
                  <span className="material-symbols-outlined text-[48px] text-slate-400 block">photo_library</span>
                  <p className="text-sm text-slate-600 font-medium">Select a photo from your device</p>
                  <button onClick={() => fileInputRef.current?.click()} className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-container transition-colors text-sm">Browse Files</button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
                </div>
              )}
              {avatarTab === 'camera' && (
                <div className="space-y-3">
                  <div className="relative bg-black rounded-2xl overflow-hidden aspect-square">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    {!cameraStream && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/60">
                        <span className="material-symbols-outlined text-[40px]">photo_camera</span>
                        <p className="text-xs">Starting camera...</p>
                      </div>
                    )}
                  </div>
                  {cameraStream && (
                    <button onClick={capturePhoto} className="w-full bg-primary text-white font-extrabold py-3 rounded-xl hover:bg-primary-container transition-colors flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">camera</span>
                      Capture Photo
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="px-5 pb-5">
              <button onClick={closeAvatarModal} className="w-full text-slate-500 text-sm font-bold py-2 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100">Cancel</button>
            </div>
          </div>
        </div>
      )}



      {/* REAL-TIME DYNAMIC COURIER TRACKER & LIVE CHAT TOOL PANEL */}
      {showTrackerModal && (
        <div className="fixed inset-0 bg-[#271810]/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in text-on-surface">
          <div className="bg-[#fff8f6] border-2 border-[#ff5c3e]/20 text-[#271810] rounded-[32px] p-6 max-w-3xl w-full grid grid-cols-1 md:grid-cols-12 gap-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowTrackerModal(false)}
              className="absolute top-4 right-4 bg-gray-200/50 hover:bg-gray-200 w-8 h-8 rounded-full flex items-center justify-center text-gray-700 font-bold z-10"
            >
              ✕
            </button>

            {/* Left Column: Live SVG Vector Radar Map */}
            <div className="md:col-span-7 bg-white border border-[#eddcd4] rounded-2.5xl p-4.5 space-y-4 flex flex-col justify-between">
              <div>
                <span className="bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                  GPS MAP NODE TRACKING
                </span>
                <h4 className="text-sm font-black text-[#271810] mt-1.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">navigation</span>
                  Real-time Harvest Vector Map
                </h4>
                <p className="text-[10px] text-gray-500 leading-normal mt-0.5">Alex River is moving from Sunny Hills Farm to drop-off lockers.</p>
              </div>

                {/* Vector representation of active route coordinates (Leaflet Live) */}
                <div className="bg-[#271810] rounded-2xl h-52 relative border border-[#ff5c3e]/10 overflow-hidden shadow-inner z-0">
                   {courierLocation && (
                      <MapContainer 
                        center={courierLocation} 
                        zoom={14} 
                        style={{ height: '100%', width: '100%', zIndex: 0 }} 
                        zoomControl={false}
                      >
                        <TileLayer
                          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        />
                        <Marker position={courierLocation} icon={courierMotorcycleIcon}>
                           <Popup className="text-xs font-mono">Alex River (Live Position)</Popup>
                        </Marker>
                      </MapContainer>
                   )}
                  
                  {/* Floating Map Overlays */}
                  <div className="absolute top-0 left-0 right-0 flex justify-between items-start z-10 text-[9px] font-mono text-white/50 p-2 pointer-events-none">
                    <div className="bg-[#271810]/80 backdrop-blur text-emerald-400 p-1.5 rounded border border-emerald-500/10">
                      <span className="font-extrabold block">ORIGIN (A)</span>
                      <span className="text-white">Sunny Hills Organic</span>
                    </div>
                    <div className="bg-[#271810]/80 backdrop-blur text-[#ff5c3e] p-1.5 rounded border border-orange-500/10 text-right">
                      <span className="font-extrabold block">DESTINATION (B)</span>
                      <span className="text-white">Dropoff Locker #41</span>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-between items-end text-[9px] font-mono text-white/90 p-2 pointer-events-none bg-gradient-to-t from-black/80 to-transparent">
                    <p>ETA Remaining: <strong className="text-[#ff5c3e]">~8 MINS</strong></p>
                    <p>Network: <strong className="text-emerald-400">WebSocket Ping</strong></p>
                  </div>
                </div>

              <div className="flex gap-2 divide-x divide-gray-150 text-xs text-gray-500 font-bold bg-gray-50 p-3 rounded-xl border border-gray-100 font-mono">
                <div className="flex-1 text-center">
                  <span className="text-[8.5px] uppercase text-gray-400 block tracking-wider leading-none">Job Rate</span>
                  <p className="text-[#271810] font-extrabold text-sm ml-1 mt-0.5">17.90 USD</p>
                </div>
                <div className="flex-grow pl-3 text-center">
                  <span className="text-[8.5px] uppercase text-gray-400 block tracking-wider leading-none">Security Pin</span>
                  <p className="text-[#271810] font-extrabold text-sm ml-1 mt-0.5">ZEN-RELEASE-7749</p>
                </div>
              </div>

            </div>

            {/* Right Column: Live Chat thread widget */}
            <div className="md:col-span-5 bg-white border border-[#eddcd4] rounded-2xl p-4 flex flex-col justify-between" style={{height: '420px'}}>
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <div className="relative">
                  <img 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfMWpyldO-8cnwsG7JzSrsxx9DrG4McUUom3CqMpQJVpj1v6I6TLZMadueF362Qs8Cjf7SfKJ3E4zmfFXEWy9Djbz4BUZUn2tkAKCrpYU2V4CwCLmff7VgNXZIGt_Mrh6YE_bXQ8CYgn1R_3lX8X2QuLDCkU1GQgz_N3aS83HjvoCw34wBwsuwL9vFEC4uRDKdE60KqoobRFrYkPPeUDlbc5pYHTVkjSN0SGDx0YGsUNofl4_CUVDD4k7gGQlZ-p3iHJnoeulHb1zf" 
                    alt="Alex" 
                    className="w-10 h-10 rounded-full border border-gray-100 object-cover" 
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-[#271810]">Alex River (Rider)</h4>
                  <span className="text-[9px] text-[#ff5c3e] block font-semibold uppercase font-mono tracking-wider">ECO-TRANSIT COURIER</span>
                </div>
              </div>

              {/* Chat thread box */}
              <div className="flex-grow my-3 overflow-y-auto space-y-2.5 pr-1 max-h-56">
                {chatMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex flex-col text-xs max-w-[85%] ${msg.sender === 'user' ? 'ml-auto text-right items-end' : msg.sender === 'system' ? 'mx-auto text-center items-center' : 'mr-auto text-left items-start'}`}
                  >
                    <div 
                      className={`p-2.5 rounded-2xl leading-normal ${msg.sender === 'user' ? 'bg-[#ff5c3e] text-white rounded-tr-none' : msg.sender === 'system' ? 'bg-gray-100 text-gray-500 italic text-[10px]' : 'bg-gray-50 border border-gray-200 text-[#271810] rounded-tl-none'}`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[8px] text-gray-400 font-mono mt-0.5">{msg.time}</span>
                  </div>
                ))}
              </div>

              {/* Chat Input area */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="Ask Alex: 'Fresh?', 'Slow?', etc."
                    value={typedMessage}
                    onChange={(e) => setTypedMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendChatMessage();
                    }}
                    className="w-full bg-[#fdfaf8] border border-gray-200 text-xs py-2 px-3 rounded-xl focus:outline-none focus:border-[#ff5c3e] font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleSendChatMessage}
                    className="bg-primary hover:bg-primary-container text-white p-2.5 rounded-xl flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px] block">send</span>
                  </button>
                </div>
                <div className="flex gap-1.5 justify-center">
                  <button onClick={() => { setTypedMessage("Is crop load verified organic?"); }} className="text-[8.5px] bg-gray-100 hover:bg-gray-200 hover:text-black py-1 px-2 rounded-lg text-gray-500 font-bold">Query Organic Status</button>
                  <button onClick={() => { setTypedMessage("Where are you on the map?"); }} className="text-[8.5px] bg-gray-100 hover:bg-gray-200 hover:text-black py-1 px-2 rounded-lg text-gray-500 font-bold">Query Map ETA</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* COURIER DIALER CALL POPUP SYSTEM */}
      {isCalling && (
        <div className="fixed bottom-6 left-6 bg-[#271810] border-2 border-[#ff5c3e] text-white p-4 rounded-3xl max-w-sm w-80 space-y-4 shadow-2xl z-50 animate-fade-in text-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
              <span className="material-symbols-outlined text-white">call</span>
            </div>
            <div className="text-left font-mono">
              <p className="text-[10px] text-gray-400 uppercase font-bold">Zenvego Voice Service</p>
              <h4 className="text-sm font-black">Alex River • Rider</h4>
              <p className="text-[10px] text-emerald-400">Dialing voice node tunnel...</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCalling(false)}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-2 rounded-xl text-xs"
          >
            End Cellular Connection
          </button>
        </div>
      )}

    </div>
  );
}
