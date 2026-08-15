import React, { useState, useEffect } from 'react';
import { ViewState, LoggedInUser } from '../types';
import { Currency, formatPrice } from '../utils/currency';
import CurrencySelector from './CurrencySelector';
import { handleImageError } from '../utils/imageFallback';
import { subscribeToOrders, seedDefaultOrders, LiveOrder } from '../utils/orderBus';

interface DeliveryDashboardProps {
  setView: (view: ViewState) => void;
  addToast: (msg: string) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  sessionUser?: LoggedInUser | null;
  handleLogout?: () => void;
  measurementSystem: 'US' | 'IND';
}

export interface DeliveryJob {
  id: string;
  farmName: string;
  farmerName: string;
  pickupLoc: string;
  pickupDist: number;
  dropoffName: string;
  dropoffLoc: string;
  dropoffDist: number;
  items: string;
  lockerPin: string;
  targetMins: number;
  basePay: number;
  bonusPay: number;
  status: string;
}

export default function DeliveryDashboard({ 
  setView, 
  addToast, 
  currency, 
  setCurrency,
  sessionUser,
  handleLogout,
  measurementSystem
}: DeliveryDashboardProps) {
  const [deliveryJobs, setDeliveryJobs] = useState<DeliveryJob[]>([]);
  // Duty states
  const [isOnDuty, setIsOnDuty] = useState<boolean>(() => {
    const cached = localStorage.getItem('zenvego_delivery_onduty');
    return cached === null ? true : cached === 'true';
  });

  const handleDutyToggle = () => {
    const nextState = !isOnDuty;
    setIsOnDuty(nextState);
    localStorage.setItem('zenvego_delivery_onduty', String(nextState));
    if (nextState) {
      addToast("🟢 ON DUTY: Connected to Local Harvest grid node. Receiving order dispatches.");
    } else {
      addToast("🔴 OFF DUTY: Disconnected from active food chains. Stay safe!");
    }
  };

  // Cumulative persistent stats
  const [totalEarnings, setTotalEarnings] = useState<number>(() => {
    const cached = localStorage.getItem('zenvego_delivery_earnings');
    return cached ? parseFloat(cached) : 48.50;
  });
  
  const [completedDrops, setCompletedDrops] = useState<number>(() => {
    const cached = localStorage.getItem('zenvego_delivery_drops');
    return cached ? parseInt(cached) : 6;
  });

  const [distanceTraveled, setDistanceTraveled] = useState<number>(() => {
    const cached = localStorage.getItem('zenvego_delivery_distance');
    return cached ? parseFloat(cached) : 8.4;
  });

  // Track any completed orders to show messages
  useEffect(() => {
    const cachedEarnings = localStorage.getItem('zenvego_delivery_earnings');
    if (cachedEarnings) {
      setTotalEarnings(parseFloat(cachedEarnings));
    }
    const cachedDrops = localStorage.getItem('zenvego_delivery_drops');
    if (cachedDrops) {
      setCompletedDrops(parseInt(cachedDrops));
    }
    const cachedDistance = localStorage.getItem('zenvego_delivery_distance');
    if (cachedDistance) {
      setDistanceTraveled(parseFloat(cachedDistance));
    }
  }, []);

  // Load and subscribe to order updates
  useEffect(() => {
    seedDefaultOrders();
    const unsubscribe = subscribeToOrders((liveOrders) => {
      const mapped = liveOrders.map((o) => {
        const defaultJob = [
          {
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
          },
          {
            id: "ZVG-811",
            farmName: "Windmill Sourdough Bakery",
            farmerName: "Bake Master David",
            pickupLoc: "Bakery Kitchen Brick Oven, Block B",
            pickupDist: 1.2,
            dropoffName: "Oliver Grant",
            dropoffLoc: "Block B Rooftop Lockers, Suite 9",
            dropoffDist: 1.8,
            items: "1 Box (Crusty Artisan Rye Sourdough Loaf - Warm Baked)",
            lockerPin: "#1181",
            targetMins: 12,
            basePay: 7.20,
            bonusPay: 1.80,
            status: "Warm & ready to collect"
          },
          {
            id: "ZVG-642",
            farmName: "Wildflower Honey Farm",
            farmerName: "Robert Beekeeper",
            pickupLoc: "Forest Canopy Apiary Hive Section D",
            pickupDist: 2.4,
            dropoffName: "Aria Thorne",
            dropoffLoc: "Subspace Cluster Locker, Row C #05",
            dropoffDist: 3.1,
            items: "1 Jar (Wildflower Pure Raw Comb Honey)",
            lockerPin: "#6221",
            targetMins: 25,
            basePay: 14.20,
            bonusPay: 3.80,
            status: "Enroute to locker hub"
          }
        ].find(j => j.id === o.id || j.id === o.id.replace('TXN-', 'ZVG-'));

        if (defaultJob) {
          return {
            ...defaultJob,
            status: o.status === 'pending' ? 'Ready for collection' : o.status === 'dispatched' ? 'Enroute to locker hub' : 'Completed'
          };
        }

        // Generate dynamic delivery job from new order
        const num = o.id.replace('TXN-', '');
        return {
          id: `ZVG-${num}`,
          farmName: "Sunny Hills Organic",
          farmerName: "John Miller",
          pickupLoc: "Sunny Hills Orchard, Field Gate A",
          pickupDist: 0.8,
          dropoffName: o.consumer,
          dropoffLoc: "Block A Central Lockers, Apt 12",
          dropoffDist: 1.5,
          items: `${o.qty} x ${o.item}`,
          lockerPin: `#${num}0`,
          targetMins: 15,
          basePay: parseFloat((o.payout * 0.65).toFixed(2)),
          bonusPay: parseFloat((o.payout * 0.15).toFixed(2)),
          status: o.status === 'pending' ? 'Ready for collection' : o.status === 'dispatched' ? 'Enroute to locker hub' : 'Completed'
        };
      });
      setDeliveryJobs(mapped.filter(j => j.status !== 'Completed'));
    });
    return unsubscribe;
  }, []);

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>('ZVG-902');

  const handleSelectJob = (job: DeliveryJob) => {
    localStorage.setItem('zenvego_active_delivery_job', JSON.stringify(job));
    addToast(`Selected Delivery assignment ${job.id} for processing.`);
  };

  const startJobDispatch = (job: DeliveryJob) => {
    localStorage.setItem('zenvego_active_delivery_job', JSON.stringify(job));
    setIsNavOpen(true);
    addToast(`Initializing Zenvego Vocal Route Optimizer for ${job.id}...`);
    setTimeout(() => {
      setIsNavOpen(false);
      setView('delivery-route');
    }, 1200);
  };

  return (
    <div id="delivery-dash-container" className="min-h-screen bg-[#fffcf9] flex flex-col font-sans text-[#271810]">
      
      {/* Header bar */}
      <header className="bg-white border-b border-[#eddcd4]/60 py-3.5 px-4 md:px-8 sticky top-0 z-40 shadow-xs flex items-center justify-between">
        <div id="brand-header-delivery" className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('delivery-account')}>
          <div className="relative">
            <img 
              src={sessionUser?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuCfMWpyldO-8cnwsG7JzSrsxx9DrG4McUUom3CqMpQJVpj1v6I6TLZMadueF362Qs8Cjf7SfKJ3E4zmfFXEWy9Djbz4BUZUn2tkAKCrpYU2V4CwCLmff7VgNXZIGt_Mrh6YE_bXQ8CYgn1R_3lX8X2QuLDCkU1GQgz_N3aS83HjvoCw34wBwsuwL9vFEC4uRDKdE60KqoobRFrYkPPeUDlbc5pYHTVkjSN0SGDx0YGsUNofl4_CUVDD4k7gGQlZ-p3iHJnoeulHb1zf"} 
              alt={sessionUser?.name || "Alex River"} 
              referrerPolicy="no-referrer"
              onError={(e) => handleImageError(e, 'avatar')}
              className="w-10 h-10 rounded-full border-2 border-[#0f5238] object-cover logo-breathing-highlight group-hover:opacity-75 transition-opacity" 
            />
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[14px]">person</span>
            </div>
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-[#271810]">
              {sessionUser ? sessionUser.name : "Alex River"} / Courier Workspace
            </h1>
            <p className="text-[10px] text-outline uppercase font-bold tracking-wider flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-[#0f5238] rounded-full"></span>
              Verified Green courier node 
            </p>
          </div>
        </div>

        {/* Global actions and currency pref */}
        <div className="flex items-center gap-3">
          <CurrencySelector currency={currency} setCurrency={setCurrency} />
          
          {/* Active / Off duty Slider toggle */}
          <div className="flex items-center gap-2 bg-[#fdfaf5] px-3.5 py-1.5 rounded-full border border-[#eddcd4]/60 shadow-inner">
            <span className={`w-1.5 h-1.5 rounded-full ${isOnDuty ? 'bg-[#0f5238] animate-ping' : 'bg-stone-400'}`}></span>
            <span className="text-[10px] uppercase font-black tracking-wider text-stone-600">{isOnDuty ? 'On duty' : 'Off duty'}</span>
            <button 
              type="button"
              onClick={handleDutyToggle}
              className={`w-9 h-5 rounded-full transition-all relative p-0.5 cursor-pointer flex items-center ${isOnDuty ? 'bg-[#0f5238]' : 'bg-stone-300'}`}
            >
              <span className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transition-all transform duration-300 ${isOnDuty ? 'translate-x-4' : 'translate-x-0'}`}></span>
            </button>
          </div>
          
          <button 
            type="button"
            onClick={() => {
              if (handleLogout) {
                handleLogout();
              }
              setView('market-home');
            }} 
            className="text-xs font-bold text-[#7a5743] hover:text-[#271810] px-2.5 py-1.5 rounded-lg hover:bg-stone-100 transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Grid content */}
      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Persistent Summary Stats Widget Header */}
        <div className="bg-white rounded-3xl border border-[#eddcd4]/50 p-6 shadow-sm flex flex-col md:flex-row justify-between gap-6">
          <div className="my-auto space-y-1">
            <h2 className="text-lg font-serif font-black text-[#0f5238] uppercase tracking-[0.05em]">Rider Session Ledger</h2>
            <p className="text-xs text-outline font-semibold max-w-xs leading-relaxed">Cumulative ecological transit indicators verified under cryptographic protocol.</p>
          </div>
          
          {/* Stats Boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-[#fdfaf5] to-white border border-[#eddcd4]/50 text-center">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-outline block">Session Earnings</span>
              <p className="text-xl font-black text-[#0f5238] font-mono mt-1">{formatPrice(totalEarnings, currency)}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-[#fdfaf5] to-white border border-[#eddcd4]/50 text-center">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-outline block">Completed Drops</span>
              <p className="text-xl font-black text-[#0f5238] font-mono mt-1">{completedDrops} drops</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-[#fdfaf5] to-white border border-[#eddcd4]/50 text-center">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-outline block">Green Transit Miles</span>
              <p className="text-xl font-black text-[#0f5238] font-mono mt-1">{distanceTraveled.toFixed(1)} miles</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-[#fdfaf5] to-white border border-[#eddcd4]/50 text-center">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-outline block">Direct Air CO₂ Saved</span>
              <p className="text-xl font-black text-emerald-600 font-mono mt-1">{(distanceTraveled * 1.84).toFixed(1)} kg</p>
            </div>
          </div>
        </div>

        {isOnDuty ? (
          <>
            {/* Split row map preview + task listings */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Courier dispatch schedule listings */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-extrabold text-[#271810] text-sm flex items-center gap-1.5 uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[#0f5238] animate-bounce">dashboard_customize</span>
                    Live Sourcing Request Feed ({deliveryJobs.length})
                  </h3>
                  <div className="flex items-center gap-1 text-[10px] bg-emerald-50 text-[#0f5238] border border-emerald-200 font-bold px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                    Ready To Settle
                  </div>
                </div>

                <div className="space-y-4">
                  {deliveryJobs.map((job) => {
                    const totalPay = job.basePay + job.bonusPay;
                    const totalDist = job.pickupDist + job.dropoffDist;
                    return (
                      <div 
                        key={job.id} 
                        onClick={() => setSelectedJobId(job.id)}
                        className={`bg-white rounded-[24px] p-5 border transition-all cursor-pointer relative group-hover:scale-[1.01] ${selectedJobId === job.id ? 'border-[#0f5238] ring-1 ring-[#0f5238] shadow-sm' : 'border-[#eddcd4]/60 hover:border-stone-400'}`}
                      >
                        {/* Upper payout block */}
                        <div className="flex justify-between items-start border-b border-stone-100 pb-3 mb-4">
                          <div>
                            <span className="text-[9px] uppercase font-mono tracking-widest bg-stone-100 text-stone-600 px-2.5 py-1 rounded-md font-bold">
                              Route #{job.id}
                            </span>
                            <h4 className="text-xs font-bold text-outline uppercase tracking-wider mt-1.5 block">Harvester Source Payload</h4>
                            <p className="text-[#271810] text-xs font-semibold leading-relaxed max-w-md mt-1">{job.items}</p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[9px] uppercase text-outline block font-extrabold">Active Payout</span>
                            <p className="text-base font-black text-[#0f5238] font-mono leading-none mt-0.5">{formatPrice(totalPay, currency)}</p>
                            <span className="text-[8px] font-bold text-stone-500 block mt-0.5">({formatPrice(job.basePay, currency)} base + {formatPrice(job.bonusPay, currency)} green tech bonus)</span>
                          </div>
                        </div>

                        {/* Middle detailed timeline list */}
                        <div className="grid grid-cols-2 gap-4 text-xs bg-[#fdfaf5]/70 p-3.5 rounded-2xl border border-[#eddcd4]/20 mb-4">
                          {/* Pick Up */}
                          <div className="space-y-1 border-r border-[#eddcd4]/30 pr-2">
                            <span className="text-[9px] font-black uppercase text-emerald-700 font-mono flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">location_on</span>
                              1. Farm Pickup ({job.pickupDist} mi)
                            </span>
                            <p className="font-bold text-[#271810] shrink-0 leading-tight">{job.farmName}</p>
                            <p className="text-[10px] text-stone-500 leading-tight block">{job.pickupLoc}</p>
                            <p className="text-[9px] text-[#7a5743] hover:underline cursor-pointer italic mt-0.5">Proprietor: {job.farmerName}</p>
                          </div>

                          {/* Drop Off */}
                          <div className="space-y-1 pl-2">
                            <span className="text-[9px] font-black uppercase text-orange-600 font-mono flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">local_shipping</span>
                              2. Dropoff Locker ({job.dropoffDist} mi)
                            </span>
                            <p className="font-bold text-[#271810] shrink-0 leading-tight">{job.dropoffName}</p>
                            <p className="text-[10px] text-stone-500 leading-tight block">{job.dropoffLoc}</p>
                            <p className="text-[9px] bg-orange-50 border border-orange-200 text-orange-700 px-1.5 py-0.5 rounded w-fit mt-1 text-[8px] font-mono font-bold">Locker code PIN: {job.lockerPin}</p>
                          </div>
                        </div>

                        {/* Bottom specifications bar */}
                        <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-stone-100">
                          <div className="flex gap-4 items-center text-[10px] text-stone-500 font-mono">
                            <span className="flex items-center gap-1 font-bold">
                              <span className="material-symbols-outlined text-[14px] text-stone-400">route</span>
                              Total Distance: <strong className="text-[#271810]">{totalDist.toFixed(1)} miles</strong>
                            </span>
                            <span className="flex items-center gap-1 font-bold">
                              <span className="material-symbols-outlined text-[14px] text-stone-400">timer</span>
                              Timer Target: <strong className="text-[#271810]">{job.targetMins} min target max</strong>
                            </span>
                          </div>

                          <div className="flex gap-2 items-center shrink-0 mt-2 sm:mt-0">
                            {selectedJobId === job.id && (
                              <button 
                                type="button"
                                onClick={() => startJobDispatch(job)}
                                className="bg-[#0f5238] hover:bg-[#0c402c] active:scale-95 text-white px-4 py-2 rounded-xl text-[11px] font-black shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[14px]">flash_on</span>
                                Accept & Navigate
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Mini Interactive Map & Navigation Hub */}
              <div className="lg:col-span-5 bg-white rounded-3xl border border-[#eddcd4]/50 p-6 space-y-5 shadow-sm sticky top-24">
                <div>
                  <h4 className="font-extrabold text-[#271810] text-sm uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#0f5238]">explore</span>
                    Dynamic Routing Hub
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">Vocal paths optimize neighborhood lockers to skip fuel chains.</p>
                </div>

                {/* Simulated route map block using interactive graphics to look highly "proper" */}
                <div className="h-64 relative rounded-[20px] overflow-hidden border border-[#eddcd4]/60 bg-[#1c110a] group shadow-inner">
                  <img 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDI23NpKZSHM8y5HR4kz_UBJ6p1LyHznp50Azsy6DF0zhB_wjR_utiQu0klxzkCqbcyB1G6VtssEHJ687TXXCq1LqZ6gVi1GbB5w60gTSoeNPoHTIOM-psLFNCJ1E8WRkyGIyoJ3ExpiCYj616oP5ySHIQOO0WhnzZ6BU0EZTdQqtKGbXa1dxn3DXLTEH07bwaqh06OK81VMOY4V6MGMuKnjxQ8PBMtimZEyTvNd1t7rmKJVYOUqE6fz7RewTghDdCBkhJvDmbEnkBy" 
                    alt="Proper Map Layout" 
                    referrerPolicy="no-referrer"
                    onError={(e) => handleImageError(e, 'hero')}
                    className="w-full h-full object-cover grayscale brightness-90 contrast-110 saturate-150"
                  />
                  
                  {/* Dynamic map path overlapping lines using styled SVG to overlay beautifully */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <path 
                      d="M 60 180 Q 140 80 180 120 T 320 60" 
                      fill="none" 
                      stroke="#0f5238" 
                      strokeWidth="4" 
                      strokeDasharray="6 4" 
                      className="animate-pulse" 
                    />
                    <circle cx="60" cy="180" r="7" fill="#0f5238" stroke="white" strokeWidth="2" />
                    <circle cx="320" cy="60" r="7" fill="#e65100" stroke="white" strokeWidth="2" />
                  </svg>

                  {/* Active Pin 1: Farm */}
                  <div className="absolute bottom-12 left-10 flex flex-col items-center">
                    <span className="material-symbols-outlined text-[#0f5238] fill-icon text-[24px]">location_on</span>
                    <span className="bg-white/90 backdrop-blur-xs text-[#0f5238] border border-[#eddcd4] px-1.5 py-0.5 rounded text-[8px] font-mono font-extrabold shadow-sm">
                      FARM HARVEST
                    </span>
                  </div>

                  {/* Active Pin 2: Locker Drop */}
                  <div className="absolute top-10 right-14 flex flex-col items-center animate-bounce">
                    <span className="material-symbols-outlined text-orange-600 fill-icon text-[24px]">local_shipping</span>
                    <span className="bg-[#271810]/95 text-white border border-white/10 px-1.5 py-0.5 rounded text-[8px] font-mono font-extrabold shadow-sm">
                      LOCKER DROP
                    </span>
                  </div>

                  {/* Distance specs marker */}
                  <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs p-2 rounded-xl text-[8px] font-mono text-[#271810] border border-[#eddcd4]/50 shadow-sm leading-tight space-y-0.5">
                    <p className="font-extrabold uppercase tracking-wider text-stone-500">Selected Path:</p>
                    <p className="font-bold">Dist: <span className="text-[#0f5238]">2.2 miles</span></p>
                    <p className="font-bold">ETA: <span className="text-[#0f5238]">15 min timetable</span></p>
                  </div>
                </div>

                {isNavOpen ? (
                  <div className="bg-[#f0f7f4] text-[#0f5238] p-4 rounded-2xl border border-[#0f5238]/20 text-center space-y-2 animate-pulse">
                    <span className="material-symbols-outlined text-[32px] block animate-bounce">spatial_audio_off</span>
                    <p className="font-bold text-xs italic">"Routing active... Voice path optimizer loaded. Standby for vocal drops updates."</p>
                    <p className="text-[10px] text-[#271810]/70 font-mono font-semibold">Decentralized Satellite GPS Synced</p>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={() => {
                      const selectedJob = deliveryJobs.find(j => j.id === selectedJobId) || deliveryJobs[0];
                      startJobDispatch(selectedJob);
                    }}
                    className="w-full bg-[#0f5238] hover:bg-[#0c402c] active:scale-95 text-white font-black py-3.5 rounded-2xl text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">navigation</span>
                    Transmit Active Voice Navigation Routing
                  </button>
                )}
              </div>

            </div>
          </>
        ) : (
          /* Offline Mode Screen - Highly visual, clean, no orders allowed */
          <div className="text-center py-24 bg-white rounded-[40px] border border-[#eddcd4]/60 max-w-xl mx-auto space-y-5 shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-radial-gradient from-[#fdfaf5]/20 to-transparent pointer-events-none"></div>
            
            <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[36px] text-stone-400">gps_off</span>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-serif font-black text-[#271810] uppercase tracking-wide">Rider Offline</h3>
              <p className="text-xs text-[#271810]/70 max-w-sm mx-auto leading-relaxed">
                Your locator beacon is currently disabled. Toggle the <strong>ON DUTY</strong> switch above to register your active node and receive immediate community delivery schedules.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 text-[10px] font-bold text-[#7a5743] bg-[#fdfaf5] border border-[#eddcd4]/45 px-3 py-1.5 rounded-full font-mono">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping"></span>
              ECOSYSTEM DISPATCHERS STANDBY
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
