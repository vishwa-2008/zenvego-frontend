import React, { useState, useRef } from 'react';
import { ViewState, LoggedInUser } from '../types';
import { Currency, formatPrice } from '../utils/currency';
import { handleImageError } from '../utils/imageFallback';

interface DeliveryAccountViewProps {
  setView: (view: ViewState) => void;
  addToast: (msg: string) => void;
  currency: Currency;
  sessionUser?: LoggedInUser | null;
  setSessionUser?: (user: LoggedInUser | null) => void;
  handleLogout?: () => void;
}

const RIDER_EMOJIS = ['🏍️', '🚴', '🛵', '🚚', '📦', '⚡', '🌍', '🔥', '💨', '🎯', '🥇', '🤙'];

function generateEmojiAvatar(emoji: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff3e0" rx="50"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="55">${emoji}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export default function DeliveryAccountView({
  setView,
  addToast,
  currency,
  sessionUser,
  setSessionUser,
  handleLogout,
}: DeliveryAccountViewProps) {
  const [avatarTab, setAvatarTab] = useState<'emoji' | 'gallery' | 'camera'>('emoji');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalEarnings = parseFloat(localStorage.getItem('zenvego_delivery_earnings') || '48.50');
  const completedDrops = parseInt(localStorage.getItem('zenvego_delivery_drops') || '6');
  const distanceTraveled = parseFloat(localStorage.getItem('zenvego_delivery_distance') || '8.4');

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

  const riderStats = [
    { label: 'Total Earnings', value: formatPrice(totalEarnings, currency), color: 'text-orange-600' },
    { label: 'Completed Drops', value: String(completedDrops), color: 'text-slate-800' },
    { label: 'Distance Covered', value: `${distanceTraveled} mi`, color: 'text-slate-800' },
    { label: 'Rating', value: '4.8 ★', color: 'text-amber-600' },
  ];

  return (
    <div id="delivery-account-container" className="min-h-screen bg-[#1c110a] text-[#ffede5] flex flex-col font-sans">

      {/* Header */}
      <header className="bg-[#271810] border-b border-white/10 py-4 px-4 md:px-8 sticky top-0 z-40 shadow-sm flex justify-between items-center">
        <button onClick={() => setView('delivery-dashboard')} className="flex items-center gap-2 text-orange-200 hover:text-white transition-colors">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <span className="text-sm font-bold">Back to Dashboard</span>
        </button>
        <h1 className="text-sm font-black text-white">Rider Profile</h1>
        {sessionUser && (
          <button onClick={handleLogout} className="text-xs font-bold text-orange-200/60 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
            Log Out
          </button>
        )}
      </header>

      <main className="flex-grow p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6">

        {/* Profile Card */}
        <div className="bg-[#271810] rounded-3xl border border-white/10 shadow-lg overflow-hidden">
          {/* Banner */}
          <div className="h-28 bg-gradient-to-br from-[#ff5c3e] via-orange-600 to-amber-600 relative">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)' }} />
            <span className="absolute top-3 right-3 bg-white/20 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider border border-white/30">⚡ Eco Courier</span>
          </div>

          <div className="px-6 pb-6 -mt-10 relative">
            <div className="flex items-end gap-4">
              <div className="relative">
                <img
                  src={sessionUser?.avatar || generateEmojiAvatar('🏍️')}
                  alt={sessionUser?.name || 'Rider'}
                  onError={(e) => handleImageError(e, 'avatar')}
                  className="w-20 h-20 rounded-2xl border-4 border-[#271810] object-cover shadow-lg"
                />
                <button
                  onClick={() => openModal('emoji')}
                  className="absolute -bottom-2 -right-2 bg-[#ff5c3e] text-white rounded-full w-7 h-7 flex items-center justify-center shadow-md hover:bg-orange-600 transition-colors"
                  title="Edit photo"
                >
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                </button>
              </div>
              <div className="pb-2">
                <h2 className="text-lg font-black text-white">{sessionUser?.name || 'Alex River'}</h2>
                <p className="text-xs text-orange-400 font-bold">Zenvego Eco-Transit Courier</p>
                <p className="text-[10px] text-white/30 font-mono uppercase tracking-wider mt-0.5">via {sessionUser?.authMethod || 'sandbox'}</p>
              </div>
            </div>

            {/* Avatar Edit Buttons */}
            <div className="mt-5 flex gap-2 flex-wrap">
              <button onClick={() => openModal('emoji')} className="flex items-center gap-1.5 text-xs font-bold text-orange-300 bg-white/5 border border-white/10 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors">
                😄 Choose Emoji
              </button>
              <button onClick={() => { fileInputRef.current?.click(); }} className="flex items-center gap-1.5 text-xs font-bold text-orange-200 bg-white/5 border border-white/10 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-[14px]">photo_library</span>
                Upload Photo
              </button>
              <button onClick={() => openModal('camera')} className="flex items-center gap-1.5 text-xs font-bold text-orange-200 bg-white/5 border border-white/10 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                Take Photo
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          {riderStats.map((s, i) => (
            <div key={i} className="bg-[#271810] rounded-2xl border border-white/10 p-4 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider block">{s.label}</span>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-[#271810] rounded-3xl border border-white/10 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-extrabold text-white">Quick Actions</h3>
          <button onClick={() => setView('delivery-dashboard')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-orange-900/30 border border-orange-800/20 hover:bg-orange-900/50 transition-colors text-left">
            <span className="material-symbols-outlined text-[#ff5c3e]">dashboard</span>
            <div>
              <p className="text-sm font-bold text-white">Delivery Dashboard</p>
              <p className="text-[11px] text-white/40">View pending jobs & earnings</p>
            </div>
            <span className="material-symbols-outlined text-white/30 ml-auto">chevron_right</span>
          </button>
          <button onClick={() => setView('delivery-route')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left">
            <span className="material-symbols-outlined text-orange-400">route</span>
            <div>
              <p className="text-sm font-bold text-white">Active Route</p>
              <p className="text-[11px] text-white/40">Current dispatch & scanner</p>
            </div>
            <span className="material-symbols-outlined text-white/30 ml-auto">chevron_right</span>
          </button>
        </div>

      </main>

      {/* Avatar Picker Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#271810] rounded-3xl w-full max-w-sm shadow-2xl border border-white/10 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-white/10">
              {(['emoji', 'gallery', 'camera'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    if (tab === 'camera') startCamera(); else stopCamera();
                    setAvatarTab(tab);
                  }}
                  className={`flex-1 py-3 text-xs font-extrabold capitalize transition-colors ${avatarTab === tab ? 'text-orange-400 border-b-2 border-[#ff5c3e] bg-white/5' : 'text-white/40 hover:bg-white/5'}`}
                >
                  {tab === 'emoji' ? '😄 Emoji' : tab === 'gallery' ? '🖼 Gallery' : '📷 Camera'}
                </button>
              ))}
            </div>

            <div className="p-5">
              {avatarTab === 'emoji' && (
                <div className="grid grid-cols-4 gap-3">
                  {RIDER_EMOJIS.map(emoji => (
                    <button key={emoji} onClick={() => updateAvatar(generateEmojiAvatar(emoji))}
                      className="text-4xl bg-white/5 hover:bg-orange-900/30 border border-white/10 hover:border-orange-500/30 rounded-2xl aspect-square flex items-center justify-center transition-all hover:scale-110">
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {avatarTab === 'gallery' && (
                <div className="text-center space-y-4 py-4">
                  <span className="material-symbols-outlined text-[48px] text-white/30 block">photo_library</span>
                  <p className="text-sm text-white/60 font-medium">Select a photo from your device</p>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-[#ff5c3e] text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors text-sm">
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
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/40">
                        <span className="material-symbols-outlined text-[40px]">photo_camera</span>
                        <p className="text-xs">Starting camera...</p>
                      </div>
                    )}
                  </div>
                  {cameraStream && (
                    <button onClick={capturePhoto}
                      className="w-full bg-[#ff5c3e] text-white font-extrabold py-3 rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">camera</span>
                      Capture Photo
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 pb-5">
              <button onClick={closeModal} className="w-full text-white/40 text-sm font-bold py-2 rounded-xl hover:bg-white/5 transition-colors border border-white/10">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
