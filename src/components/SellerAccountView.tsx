import React, { useState, useRef } from 'react';
import { ViewState, LoggedInUser } from '../types';
import { Currency, formatPrice } from '../utils/currency';
import { handleImageError } from '../utils/imageFallback';

interface SellerAccountViewProps {
  setView: (view: ViewState) => void;
  addToast: (msg: string) => void;
  currency: Currency;
  sessionUser?: LoggedInUser | null;
  setSessionUser?: (user: LoggedInUser | null) => void;
  handleLogout?: () => void;
}

const FARM_EMOJIS = ['👨‍🌾', '👩‍🌾', '🚜', '🍅', '🥕', '🍎', '🌻', '🥦', '🐝', '🍄', '🌿', '🥑', '🌽', '🫛', '🍋', '🧅'];

function generateEmojiAvatar(emoji: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#eefcf4" rx="50"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="55">${emoji}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export default function SellerAccountView({
  setView,
  addToast,
  currency,
  sessionUser,
  setSessionUser,
  handleLogout,
}: SellerAccountViewProps) {
  const [avatarTab, setAvatarTab] = useState<'emoji' | 'gallery' | 'camera'>('emoji');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectEmoji = (emoji: string) => {
    const avatar = generateEmojiAvatar(emoji);
    updateAvatar(avatar);
  };

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

  const openModal = (tab: 'emoji' | 'gallery' | 'camera') => {
    setAvatarTab(tab);
    setShowAvatarModal(true);
    if (tab === 'camera') startCamera();
  };

  const closeModal = () => {
    stopCamera();
    setShowAvatarModal(false);
  };

  const sellerStats = [
    { label: 'Total Revenue', value: formatPrice(8420, currency), icon: 'payments' },
    { label: 'Active Orders', value: '12', icon: 'orders' },
    { label: 'Ecosystem Rating', value: '4.92 ★', icon: 'star' },
    { label: 'Products Listed', value: '6', icon: 'inventory_2' },
  ];

  return (
    <div id="seller-account-container" className="min-h-screen bg-slate-50 flex flex-col font-sans">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-4 md:px-8 sticky top-0 z-40 shadow-sm flex justify-between items-center">
        <button onClick={() => setView('farmer-dashboard')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <span className="text-sm font-bold">Back to Dashboard</span>
        </button>
        <h1 className="text-sm font-black text-slate-800">Seller Profile</h1>
        {sessionUser && (
          <button onClick={handleLogout} className="text-xs font-bold text-slate-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50">
            Log Out
          </button>
        )}
      </header>

      <main className="flex-grow p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6">

        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Banner */}
          <div className="h-28 bg-gradient-to-br from-emerald-600 via-green-500 to-teal-500 relative">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)' }} />
            <span className="absolute top-3 right-3 bg-white/20 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider border border-white/30">🌱 Verified Grower</span>
          </div>

          <div className="px-6 pb-6 -mt-10 relative">
            {/* Avatar */}
            <div className="flex items-end gap-4">
              <div className="relative">
                <img
                  src={sessionUser?.avatar || generateEmojiAvatar('👨‍🌾')}
                  alt={sessionUser?.name || 'Farmer'}
                  onError={(e) => handleImageError(e, 'avatar')}
                  className="w-20 h-20 rounded-2xl border-4 border-white object-cover shadow-lg"
                />
                <button
                  onClick={() => openModal('emoji')}
                  className="absolute -bottom-2 -right-2 bg-emerald-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-md hover:bg-emerald-700 transition-colors"
                  title="Edit photo"
                >
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                </button>
              </div>
              <div className="pb-2">
                <h2 className="text-lg font-black text-slate-800">{sessionUser?.name || 'John Miller'}</h2>
                <p className="text-xs text-emerald-700 font-bold">Sunny Hills Organic Farm</p>
                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mt-0.5">via {sessionUser?.authMethod || 'sandbox'}</p>
              </div>
            </div>

            {/* Avatar Edit Buttons */}
            <div className="mt-5 flex gap-2 flex-wrap">
              <button onClick={() => openModal('emoji')} className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl hover:bg-emerald-100 transition-colors">
                😄 Choose Emoji
              </button>
              <button onClick={() => { fileInputRef.current?.click(); }} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-200 transition-colors">
                <span className="material-symbols-outlined text-[14px]">photo_library</span>
                Upload Photo
              </button>
              <button onClick={() => openModal('camera')} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-200 transition-colors">
                <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                Take Photo
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          {sellerStats.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{s.label}</span>
              <p className="text-xl font-black text-slate-800">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-extrabold text-slate-800">Quick Actions</h3>
          <button onClick={() => setView('farmer-dashboard')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors text-left">
            <span className="material-symbols-outlined text-emerald-600">dashboard</span>
            <div>
              <p className="text-sm font-bold text-slate-800">Farmer Dashboard</p>
              <p className="text-[11px] text-slate-500">View live orders & analytics</p>
            </div>
            <span className="material-symbols-outlined text-slate-400 ml-auto">chevron_right</span>
          </button>
          <button onClick={() => setView('farmer-inventory')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors text-left">
            <span className="material-symbols-outlined text-slate-600">inventory_2</span>
            <div>
              <p className="text-sm font-bold text-slate-800">Inventory Management</p>
              <p className="text-[11px] text-slate-500">Manage your listed produce</p>
            </div>
            <span className="material-symbols-outlined text-slate-400 ml-auto">chevron_right</span>
          </button>
        </div>

      </main>

      {/* Avatar Picker Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-[#271810]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              {(['emoji', 'gallery', 'camera'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    if (tab === 'camera') startCamera(); else stopCamera();
                    setAvatarTab(tab);
                  }}
                  className={`flex-1 py-3 text-xs font-extrabold capitalize transition-colors ${avatarTab === tab ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  {tab === 'emoji' ? '😄 Emoji' : tab === 'gallery' ? '🖼 Gallery' : '📷 Camera'}
                </button>
              ))}
            </div>

            <div className="p-5">
              {avatarTab === 'emoji' && (
                <div className="grid grid-cols-4 gap-3">
                  {FARM_EMOJIS.map(emoji => (
                    <button key={emoji} onClick={() => handleSelectEmoji(emoji)}
                      className="text-4xl bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 rounded-2xl aspect-square flex items-center justify-center transition-all hover:scale-110 shadow-sm">
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {avatarTab === 'gallery' && (
                <div className="text-center space-y-4 py-4">
                  <span className="material-symbols-outlined text-[48px] text-slate-400 block">photo_library</span>
                  <p className="text-sm text-slate-600 font-medium">Select a photo from your device</p>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors text-sm">
                    Browse Files
                  </button>
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
                    <button onClick={capturePhoto}
                      className="w-full bg-emerald-600 text-white font-extrabold py-3 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">camera</span>
                      Capture Photo
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 pb-5">
              <button onClick={closeModal} className="w-full text-slate-500 text-sm font-bold py-2 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
