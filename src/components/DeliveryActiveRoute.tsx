import React, { useState, useEffect } from 'react';
import { ViewState, LoggedInUser } from '../types';
import { handleImageError } from '../utils/imageFallback';
import { Currency, formatPrice } from '../utils/currency';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface DeliveryActiveRouteProps {
  setView: (view: ViewState) => void;
  addToast: (msg: string) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  sessionUser?: LoggedInUser | null;
  handleLogout?: () => void;
  measurementSystem: 'US' | 'IND';
}

export default function DeliveryActiveRoute({ 
  setView, 
  addToast, 
  currency, 
  setCurrency,
  sessionUser,
  handleLogout,
  measurementSystem
}: DeliveryActiveRouteProps) {
  // Load active delivery assignment details from storage
  const [job, setJob] = useState<any>(() => {
    const cached = localStorage.getItem('zenvego_active_delivery_job');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {
        // Fallback below
      }
    }
    // Deep fallback if empty
    return {
      id: "ZVG-902",
      farmName: "Sunny Hills Organic",
      farmerName: "John Miller",
      pickupLoc: "Sunny Hills Orchard, Field Gate A",
      pickupDist: 0.8,
      dropoffName: "Sarah Jenkins",
      dropoffLoc: "Block A Central Lockers, Apt 12",
      dropoffDist: 1.4,
      items: "2 Boxes (Crimson Vine Heirloom Tomatoes, Rainbow Carrots Bunch)",
      lockerPin: "#4910",
      targetMins: 15,
      basePay: 9.50,
      bonusPay: 2.50,
      status: "Ready for collection"
    };
  });

  // Transit states:
  // 'sourcing' = heading to farm to pick up harvest
  // 'approaching' = collected and heading to customer locker point
  // 'arrived' = at locker point, ready to drop in locker
  // 'settled' = order ledger finalized
  const [transitStage, setTransitStage] = useState<'sourcing' | 'approaching' | 'arrived' | 'settled'>('sourcing');
  const [etaMins, setEtaMins] = useState(job.targetMins);
  const [activeDistance, setActiveDistance] = useState(job.pickupDist);
  
  // Real-time Geolocation tracking state
  const [currentLocation, setCurrentLocation] = useState<[number, number]>(measurementSystem === 'IND' ? [19.0760, 72.8777] : [34.0522, -118.2437]); 
  const farmLocation: [number, number] = measurementSystem === 'IND' ? [19.0850, 72.8850] : [34.0622, -118.2537];
  const dropoffLocation: [number, number] = measurementSystem === 'IND' ? [19.0650, 72.8650] : [34.0422, -118.2337];

  // Leaflet Custom Vector Icons
  const courierIcon = L.divIcon({
    html: `<div style="background-color: #22c55e; color: white; border-radius: 50%; padding: 4px; border: 2px solid white; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"><span class="material-symbols-outlined" style="font-size: 16px;">navigation</span></div>`,
    className: '', iconSize: [30, 30], iconAnchor: [15, 15]
  });
  const farmIcon = L.divIcon({
    html: `<div style="background-color: #eab308; color: #271810; border-radius: 50%; padding: 4px; border: 2px solid white; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"><span class="material-symbols-outlined" style="font-size: 16px;">agriculture</span></div>`,
    className: '', iconSize: [30, 30], iconAnchor: [15, 15]
  });
  const dropoffIcon = L.divIcon({
    html: `<div style="background-color: #f97316; color: white; border-radius: 50%; padding: 4px; border: 2px solid white; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"><span class="material-symbols-outlined" style="font-size: 16px;">local_shipping</span></div>`,
    className: '', iconSize: [30, 30], iconAnchor: [15, 15]
  });

  // Start watching navigator GPS and persist to localStorage for cross-tab visibility
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const COURIER_LOC_KEY = 'zenvego_courier_locations';
    
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading } = pos.coords;
        setCurrentLocation([latitude, longitude]);
        
        // Persist live location to localStorage so customer tracker map can see it
        try {
          localStorage.setItem(COURIER_LOC_KEY, JSON.stringify({
            courier_id: sessionUser?.id || 'courier_local',
            lat: latitude,
            lng: longitude,
            heading: heading || 0,
            updated_at: Date.now()
          }));
        } catch (_) {}
      },
      (err) => console.warn("GPS tracking error (simulating stationary map):", err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, [sessionUser]);

  // Auto generated verification matching code
  const verificationCode = "ZEN-RELEASE-7749";
  const [showQrModal, setShowQrModal] = useState(false);
  const [typedReleasePin, setTypedReleasePin] = useState('');

  // Sourcing verification state: checks local storage for synchronization with the Farmer Dashboard scan
  useEffect(() => {
    // Keep active verification code in memory so farmer can find it
    localStorage.setItem('zenvego_active_verification_code', verificationCode);

    const checkApproval = setInterval(() => {
      const activeJobCached = localStorage.getItem('zenvego_active_delivery_job');
      if (activeJobCached) {
        try {
          const parsed = JSON.parse(activeJobCached);
          if (parsed.status === "Transit" && transitStage === "sourcing") {
            setTransitStage("approaching");
            addToast("🌾 SELLER CONFIRMED QR CODE MATCHING: Cargo safely released! Heading to dropoff coordinates.");
          }
        } catch (e) {
          // ignore error
        }
      }
    }, 2000);

    return () => clearInterval(checkApproval);
  }, [transitStage]);

  // Live Timer Count Down hook simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setEtaMins((prev: number) => {
        if (prev <= 1) return 1;
        return prev - 1;
      });
      // Gently reduce remaining distance relative to movement
      setActiveDistance((prev: number) => {
        if (prev <= 0.1) return 0.1;
        return parseFloat((prev - 0.1).toFixed(1));
      });
    }, 12000); // simulation tick

    return () => clearInterval(interval);
  }, []);

  // Update distance when state changes
  useEffect(() => {
    if (transitStage === 'sourcing') {
      setActiveDistance(job.pickupDist);
      setEtaMins(Math.max(5, Math.ceil(job.targetMins * 0.4)));
    } else if (transitStage === 'approaching') {
      setActiveDistance(job.dropoffDist);
      setEtaMins(Math.max(5, Math.ceil(job.targetMins * 0.6)));
    } else if (transitStage === 'arrived') {
      setActiveDistance(0);
      setEtaMins(0);
    }
  }, [transitStage, job]);

  // Handle voice speech direction instructions simulation
  const triggerVoiceDirection = () => {
    const directions = [
      `Head north towards ${job.farmName} to pick up ${job.items}.`,
      `Turn left onto Grand Heights Avenue, then proceed 1.4 miles to dropoff locker for ${job.dropoffName}.`,
      `Secure locker ${job.lockerPin} reserved. Settle the cash or scanning receipt node on deliver.`
    ];
    const speech = transitStage === 'sourcing' ? directions[0] : transitStage === 'approaching' ? directions[1] : directions[2];
    
    addToast(`🔊 Vocal Optimizer: "${speech}"`);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(speech);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCropsCollected = () => {
    setTransitStage('approaching');
    addToast("🌾 CROPS SECURED: Harvest payload verification verified. Proceeding to dropoff coordinates.");
    triggerVoiceDirection();
  };

  const handleArrivedAtLocker = () => {
    setTransitStage('arrived');
    addToast("📍 LOCATION MATCHED: Secure dropoff locker zone reached. Enter PIN to release door.");
  };

  const handleFinalizeDelivery = () => {
    // Add rewards to cumulative total metrics
    const jobPayout = job.basePay + job.bonusPay;
    const totalMiles = job.pickupDist + job.dropoffDist;

    // Load previous ledger
    const prevEarnings = parseFloat(localStorage.getItem('zenvego_delivery_earnings') || '48.50');
    const prevDrops = parseInt(localStorage.getItem('zenvego_delivery_drops') || '6');
    const prevDistance = parseFloat(localStorage.getItem('zenvego_delivery_distance') || '8.4');

    // Update
    localStorage.setItem('zenvego_delivery_earnings', (prevEarnings + jobPayout).toFixed(2));
    localStorage.setItem('zenvego_delivery_drops', String(prevDrops + 1));
    localStorage.setItem('zenvego_delivery_distance', (prevDistance + totalMiles).toFixed(2));

    setTransitStage('settled');
    addToast(`💰 LEDGER UPDATE: +${formatPrice(jobPayout, currency)} added to profile ledger!`);
  };

  const exitSettlementView = () => {
    setView('delivery-dashboard');
  };

  return (
    <div id="delivery-route-container" className="min-h-screen bg-[#271810] text-[#ffede5] flex flex-col font-sans select-none">
      
      {/* High-visibility active header */}
      <header className="bg-[#3e2d23] border-b border-white/10 py-4 px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setView('delivery-dashboard')} 
            className="text-white hover:bg-white/10 p-2 rounded-full cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined block text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xs font-black tracking-widest text-white flex items-center gap-1.5 uppercase">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              Active Dispatch Node
            </h1>
            <p className="text-[10px] text-orange-200/80 uppercase font-mono tracking-wider font-semibold">Route #{job.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={triggerVoiceDirection}
            className="text-[11px] bg-[#ff5c3e] hover:bg-[#ff5c3e]/90 transition-colors text-white font-extrabold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[15px]">volume_up</span>
            Speech Guidance
          </button>
          
          <button 
            type="button"
            onClick={() => addToast("🚨 Emergency dispatch alert locked on block sub-station...")}
            className="text-xs bg-white/10 hover:bg-white/20 transition-colors text-white font-bold p-2.5 rounded-xl border border-white/10"
            title="Flag Incident"
          >
            <span className="material-symbols-outlined text-[15px] block">warning</span>
          </button>
        </div>
      </header>

      {/* Main split routing layouts */}
      {transitStage !== 'settled' ? (
        <div className="flex-grow flex flex-col lg:flex-row">
          
          {/* Left pane: Dynamic GPS Vector Route map (Powered by Leaflet) */}
          <div className="flex-grow lg:w-3/5 h-[350px] lg:h-auto relative bg-[#1c110a] overflow-hidden border-r border-white/5 z-0">
            
            <MapContainer 
              key={`${currentLocation[0]}-${currentLocation[1]}`} // Re-mounts if base coord completely shifts (e.g. region toggle)
              center={currentLocation} 
              zoom={14} 
              style={{ height: '100%', width: '100%', zIndex: 0 }} 
              zoomControl={false}
            >
              {/* Free CARTO Dark Matter Tiles for the premium dark aesthetic */}
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              />
              
              <Marker position={currentLocation} icon={courierIcon}>
                <Popup className="text-xs font-mono">You are here</Popup>
              </Marker>
              
              <Marker position={farmLocation} icon={farmIcon}>
                <Popup className="text-xs font-mono">Pickup: {job.farmName}</Popup>
              </Marker>

              <Marker position={dropoffLocation} icon={dropoffIcon}>
                <Popup className="text-xs font-mono">Dropoff: {job.dropoffName}</Popup>
              </Marker>
            </MapContainer>

            {/* Instruction Overlay Banner */}
            <div className="absolute top-4 left-4 bg-[#3e2d23]/95 backdrop-blur-md p-4 rounded-2xl border border-white/10 max-w-sm space-y-1.5 shadow-xl z-10">
              <span className="text-[8px] uppercase font-mono tracking-widest text-[#faddce] font-bold block">Live Navigation Dispatch Instruction</span>
              <p className="text-xs font-extrabold text-white">
                {transitStage === 'sourcing' 
                  ? `Collect from ${job.farmName} in ${activeDistance} mi` 
                  : transitStage === 'approaching'
                  ? `Proceed to dropoff point lockers in ${activeDistance} mi`
                  : `Coordinates locked: Deliver to ${job.dropoffName}`}
              </p>
              <div className="flex items-center gap-2 pt-1 border-t border-white/5 text-[9px] font-mono text-white/70">
                <span className="inline-block w-1.5 h-1.5 bg-red-400 rounded-full animate-ping"></span>
                <span>GPS Connected & Broadcasting Live</span>
              </div>
            </div>
            
            {/* Dynamic visual map overlay for real-time speed */}
            <div className="absolute bottom-4 left-4 bg-[#271810]/90 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/5 text-[10px] text-white/95 font-mono space-y-0.5 z-10 shadow-lg">
              <p>GPS Node: <strong className="text-emerald-400">CONNECT-902</strong></p>
              <p>Lat / Lng: {currentLocation[0].toFixed(4)}°, {currentLocation[1].toFixed(4)}°</p>
              <p>Network: Supabase WebSocket Ping 12ms</p>
            </div>
          </div>

          {/* Right pane: Action Required checklist and contact details */}
          <div className="lg:w-2/5 bg-[#3e2d23] p-6 flex flex-col justify-between space-y-6">
            
            <div className="space-y-5">
              
              {/* ETA Count down block */}
              <div className="bg-[#271810] p-4 rounded-2xl border border-white/10 flex justify-between items-center">
                <div>
                  <span className="text-[9px] uppercase font-bold text-white/50 block font-mono">Stage Timeline</span>
                  <p className="text-sm font-black text-white uppercase mt-0.5 text-ellipsis overflow-hidden">
                    {transitStage === 'sourcing' ? '1. Heading to Sourcing Farm' : '2. Heading to Drop Locker'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-black text-[#ff5c3e] font-mono">{etaMins}</span>
                  <span className="text-[8px] font-mono font-extrabold text-[#ff5c3e] block uppercase leading-none mt-0.5">Mins target</span>
                </div>
              </div>

              {/* Specific detail list of pickup + drop for this specific delivery */}
              <div className="space-y-4">
                
                {/* 1. Sourcing details */}
                <div className={`p-4 rounded-2xl border transition-all ${transitStage === 'sourcing' ? 'bg-[#271810] border-[#0f5238]' : 'bg-[#271810]/40 border-white/5 opacity-70'}`}>
                  <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-2.5">
                    <span className="text-[9px] font-bold uppercase text-[#22c55e] font-mono tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">agriculture</span>
                      Stage 1: Farm Pickup Verification
                    </span>
                    <span className="text-[9px] text-[#22c55e] font-bold font-mono">
                      {transitStage === 'sourcing' ? `${activeDistance} mi left` : 'COLLECTED & VERIFIED'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <h4 className="font-extrabold text-white text-sm">{job.farmName}</h4>
                    <p className="text-white/70 text-[11px] leading-tight font-medium">📍 {job.pickupLoc}</p>
                    
                    {transitStage === 'sourcing' && (
                      <div className="bg-emerald-500/10 border border-emerald-500/25 p-3 rounded-xl space-y-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-emerald-400 font-extrabold font-mono tracking-wide uppercase">AUTOGEN HANDOVER QR CODE</span>
                          <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-bold">MATCHING</span>
                        </div>
                        <p className="text-[10px] text-gray-300">The seller John Miller must match this code or scan your QR code before releasing the package.</p>
                        
                        <div className="flex items-center justify-between pt-1">
                          <div className="text-left">
                            <span className="text-[9px] text-gray-400 block font-mono">Handoff Pin Code:</span>
                            <span className="text-sm font-black text-white font-mono tracking-wider">{verificationCode}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowQrModal(true)}
                            className="bg-[#ff5c3e] hover:bg-orange-600 font-extrabold text-[10px] px-3 py-1.5 rounded-lg text-white flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[12px]">qr_code_2</span>
                            Show QR Code
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="bg-white/5 p-2 rounded-xl border border-white/5 mt-2 space-y-1 text-[11px]">
                      <p className="text-[9px] uppercase tracking-wider font-extrabold text-white/50 font-mono">Reserve Load payload:</p>
                      <p className="font-semibold text-white/90 leading-tight">{job.items}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Drop details */}
                <div className={`p-4 rounded-2xl border transition-all ${transitStage === 'approaching' || transitStage === 'arrived' ? 'bg-[#271810] border-[#f97316]' : 'bg-[#271810]/40 border-white/5 opacity-70'}`}>
                  <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-2.5">
                    <span className="text-[9px] font-bold uppercase text-orange-500 font-mono tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">local_shipping</span>
                      Stage 2: Buyer Destination
                    </span>
                    <span className="text-[9px] text-orange-500 font-bold font-mono">
                      {transitStage === 'sourcing' ? 'PENDING' : transitStage === 'approaching' ? `${activeDistance} mi left` : 'ARRIVED'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-start">
                      <h4 className="font-extrabold text-white text-sm">{job.dropoffName}</h4>
                      <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded text-[8px] font-mono font-extrabold">PIN: {job.lockerPin}</span>
                    </div>
                    <p className="text-white/70 text-[11px] leading-tight font-medium">📍 {job.dropoffLoc}</p>
                    
                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 mt-1 text-[10.5px] text-white/80 space-y-1">
                      <p className="font-mono text-[8px] uppercase tracking-wider text-white/40">Secure Lockbox Instructions:</p>
                      <p>Settle with customer via cashier drop, scanning QR code matching, or physical escrow coin deposit directly.</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Recipient communication tool */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button 
                  type="button"
                  onClick={() => addToast(`📞 Voice Mask Direct Link Dialing ${job.dropoffName}...`)}
                  className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-xs font-bold text-white flex items-center justify-center gap-1.5 border border-white/5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">call</span>
                  Mask Call
                </button>
                <button 
                  type="button"
                  onClick={() => addToast(`💬 Encrypted Instant Text SMS transmitted to ${job.dropoffName}.`)}
                  className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-xs font-bold text-white flex items-center justify-center gap-1.5 border border-white/5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">chat</span>
                  Text Messenger
                </button>
              </div>

            </div>

            {/* Dynamic Footer Action triggers based on stage */}
            <div className="pt-4 border-t border-white/10">
              {transitStage === 'sourcing' && (
                <button
                  type="button"
                  onClick={handleCropsCollected}
                  className="w-full bg-[#f97316] hover:bg-orange-600 active:scale-95 text-white font-extrabold py-4 rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  Crops Harvested - Confirm Cargo Load
                </button>
              )}

              {transitStage === 'approaching' && (
                <button
                  type="button"
                  onClick={handleArrivedAtLocker}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold py-4 rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">near_me</span>
                  Mark Location Arrived
                </button>
              )}

              {transitStage === 'arrived' && (
                <div className="space-y-3">
                  <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider text-center">Choose Delivery Confirmation Method</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleFinalizeDelivery}
                      className="bg-[#ff5c3e] hover:bg-[#ff5c3e]/90 active:scale-95 text-white font-extrabold py-4 rounded-2xl text-xs transition-all shadow-md flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[22px]">lock_open</span>
                      Locker Drop
                      <span className="text-[9px] font-normal opacity-70">PIN: {job.lockerPin}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTypedReleasePin('');
                        setShowQrModal(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold py-4 rounded-2xl text-xs transition-all shadow-md flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[22px]">qr_code_scanner</span>
                      Scan Customer QR
                      <span className="text-[9px] font-normal opacity-70">Direct Handoff</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      ) : (
        /* Settlement screen summary - shows details of earnings */
        <div className="flex-grow flex items-center justify-center p-6 bg-[#1c110a] text-center">
          <div className="max-w-md w-full bg-[#271810] border border-white/10 rounded-[32px] p-6 md:p-8 space-y-6 shadow-2xl animate-fade-in">
            <div className="w-16 h-16 bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[32px] block animate-bounce">check</span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-serif font-black tracking-wide text-white uppercase">Delivery Dispatched & Settled</h3>
              <p className="text-xs text-white/70 max-w-xs mx-auto leading-relaxed">
                Thank you! Crop parcel verified at lockbox node. Cash receipt and token rewards matching finalized.
              </p>
            </div>

            {/* Financial Ledger Details */}
            <div className="bg-[#1c110a] p-4.5 rounded-2xl border border-white/5 text-left text-xs space-y-3 font-mono">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-white/50 border-b border-white/5 pb-2">
                <span>Description</span>
                <span>Amount Earned</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">Base Delivery Fee:</span>
                <span className="text-white font-bold">{formatPrice(job.basePay, currency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-emerald-400">Green Tech Bonus:</span>
                <span className="text-emerald-400 font-bold">+{formatPrice(job.bonusPay, currency)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-white/5 pt-2 text-sm">
                <span className="text-white font-extrabold font-sans">Total payout earned:</span>
                <span className="text-[#eab308] font-black">{formatPrice(job.basePay + job.bonusPay, currency)}</span>
              </div>
            </div>

            {/* Total distance completed stats */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-white/5 p-3 rounded-xl text-center font-bold">
              <div>
                <span className="text-[9px] uppercase text-white/50 block font-mono">Transit Miles</span>
                <p className="text-white mt-1">{(job.pickupDist + job.dropoffDist).toFixed(1)} mi</p>
              </div>
              <div>
                <span className="text-[9px] uppercase text-white/50 block font-mono">Carbon Prevented</span>
                <p className="text-emerald-400 mt-1">{((job.pickupDist + job.dropoffDist) * 1.84).toFixed(1)} kg</p>
              </div>
            </div>

            <div>
              <button 
                type="button"
                onClick={exitSettlementView}
                className="w-full bg-[#ff5c3e] hover:bg-[#ff5c3e]/90 text-white font-extrabold py-3 rounded-2xl text-xs transition-all shadow-sm cursor-pointer"
              >
                Back to Dashboard Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MATCHING CODE QR MODAL SYSTEM DETECT */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in text-center">
          <div className="bg-[#271810] border-2 border-emerald-600/30 text-white rounded-3xl p-6 md:p-8 max-w-sm w-full space-y-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              ✕
            </button>

            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase text-emerald-400 tracking-widest font-mono">AUTOGEN HANDOVER CODE</h4>
              <p className="text-[11px] text-gray-300"> alex river (ID: #ZVG-902)</p>
            </div>

            {/* Simulated Dot-Matrix QR Codes Grid block */}
            <div className="bg-white p-4 rounded-2xl w-48 h-48 mx-auto border-4 border-emerald-600 flex flex-col justify-between relative shadow-inner overflow-hidden">
              <div className="flex justify-between w-full">
                <div className="w-8 h-8 border-4 border-[#271810]"></div>
                <div className="w-8 h-8 border-4 border-[#271810]"></div>
              </div>
              
              {/* Matrix blocks lines mock */}
              <div className="flex flex-col gap-1 w-full p-2 py-3">
                <div className="flex justify-between gap-1">
                  <div className="w-full h-1 bg-[#271810]"></div>
                  <div className="w-2 h-1 bg-[#271810]"></div>
                  <div className="w-4 h-1 bg-[#271810]"></div>
                </div>
                <div className="flex justify-between gap-1">
                  <div className="w-1 h-2 bg-[#271810]"></div>
                  <div className="w-full h-2 bg-[#271810]"></div>
                </div>
                <div className="flex justify-[#271810] gap-1.5 font-bold font-mono text-[9px] text-center text-[#271810]">
                  <span>{verificationCode}</span>
                </div>
                <div className="flex justify-between gap-1">
                  <div className="w-4 h-1.5 bg-[#271810]"></div>
                  <div className="w-full h-1.5 bg-[#271810]"></div>
                </div>
              </div>

              <div className="flex justify-between w-full">
                <div className="w-8 h-8 border-4 border-[#271810]"></div>
                <div className="w-2 h-2 bg-[#271810]"></div>
              </div>
            </div>

            <div className="space-y-3 font-mono text-[11px]">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] text-gray-400 block uppercase">Manual Passcode fallback:</span>
                <p className="text-sm font-black text-white">{transitStage === 'arrived' ? 'ZVG-CONFIRM-902' : verificationCode}</p>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[9px] text-gray-400 block font-bold">
                  {transitStage === 'arrived' ? 'Enter Customer Confirmation Code:' : 'Courier Bypass PIN input:'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={transitStage === 'arrived' ? 'E.g. ZVG-CONFIRM-902' : 'E.g. 7749'}
                    value={typedReleasePin}
                    onChange={(e) => setTypedReleasePin(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded px-2.5 py-1 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500" 
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const pin = typedReleasePin.toUpperCase().trim();
                      if (transitStage === 'arrived') {
                        // Customer confirmation flow
                        if (pin.includes('CONFIRM') || pin.includes('902')) {
                          setShowQrModal(false);
                          handleFinalizeDelivery();
                          addToast("✅ CUSTOMER QR VERIFIED: Package delivered successfully!");
                        } else {
                          addToast("❌ Invalid code. Ask the customer to show their QR or provide code: ZVG-CONFIRM-902");
                        }
                      } else {
                        // Farmer handover flow
                        if (pin === '7749' || pin.includes('7749')) {
                          setShowQrModal(false);
                          handleCropsCollected();
                        } else {
                          addToast("❌ Code mismatch. Try typed release PIN: '7749' or scan from seller.");
                        }
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1 rounded text-[10px]"
                  >
                    {transitStage === 'arrived' ? 'Verify' : 'Apply PIN'}
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-orange-200 leading-normal">
                {transitStage === 'arrived' 
                  ? `Ask ${job.dropoffName} to show their confirmation QR code or provide their verification code.`
                  : 'Present this matrix configuration to Farmer John Miller for zero-contact optical handoff verification.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
