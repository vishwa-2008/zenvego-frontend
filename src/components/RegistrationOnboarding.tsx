import React, { useState, useEffect } from 'react';
import { ViewState, LoggedInUser } from '../types';
import { handleImageError } from '../utils/imageFallback';
import { authApi } from '../lib/api';

interface RegistrationOnboardingProps {
  setView: (view: ViewState) => void;
  sessionUser: LoggedInUser | null;
  setSessionUser: (user: LoggedInUser | null) => void;
  addToast: (msg: string) => void;
  measurementSystem: 'US' | 'IND';
}

export default function RegistrationOnboarding({
  setView,
  sessionUser,
  setSessionUser,
  addToast,
  measurementSystem,
}: RegistrationOnboardingProps) {
  // Master Onboarding Step state: 'choose-role' | 'form-delivery' | 'form-customer' | 'form-seller'
  const [stage, setStage] = useState<'choose-role' | 'delivery' | 'customer' | 'seller'>('choose-role');

  useEffect(() => {
    if (sessionUser?.role) {
      setStage(sessionUser.role);
    }
  }, [sessionUser]);

  const [submitting, setSubmitting] = useState(false);

  const isEmailAuth = sessionUser?.authMethod === 'email' || sessionUser?.authMethod === 'sandbox';

  // --- 1. DELIVERY PARTNER STATE ---
  const [deliveryData, setDeliveryData] = useState({
    fullName: sessionUser?.name || '',
    dob: '1998-05-15',
    address: '12, Greenfield Bypass Road, Block C, Bengaluru',
    phone: '',
    email: isEmailAuth ? sessionUser?.emailOrPhone || '' : '',
    fatherName: 'Robert Benson',
    gender: 'Male',
    // Legal Doc numbers & uploads
    aadhaarNumber: '4452 8892 1039',
    aadhaarFile: 'aadhaar_proof_front.jpg',
    panNumber: 'ABCDE1234F',
    panFile: 'pan_card_doc.jpg',
    drivingLicenseNumber: 'KA-51-20210009238',
    licenseFile: 'license_val.jpg',
    vehicleRcNumber: 'KA-51-EQ-9924',
    rcFile: 'rc_certificate.jpg',
    insurancePolicyNumber: 'INS-992388-GI',
    insuranceFile: 'insurance_policy.jpg',
    selfieFile: 'selfie_with_id.jpg',
    // Vehicle Transit & Work Details
    vehicleType: 'Electric Bike',
    // Bank Payment Info
    bankName: 'HDFC Bank Limited',
    accountHolderName: sessionUser?.name || '',
    bankAccountNumber: '50100238841292',
    ifscCode: 'HDFC0000512'
  });

  // --- 2. CUSTOMER STATE ---
  const [customerData, setCustomerData] = useState({
    fullName: sessionUser?.name || '',
    email: isEmailAuth ? sessionUser?.emailOrPhone || '' : 'sarah.jenkins@gmail.com',
    phone: '',
    latitude: '12.9716',
    longitude: '77.5946',
    gpsMappedStore: 'Zenvego DarkStore #41 (Indiranagar Urban Hub)',
    // Presets Multi-Addresses List (Minimum 2+ slots)
    addresses: [
      { id: 'addr-home', label: 'Home Address 🏠', houseNo: 'Flat 402, Alpine Crest Apt', landmark: 'Opposite Oakwood Supermarket', street: 'Koramangala 4th Block', selected: true },
      { id: 'addr-work', label: 'Office/Work Address 🏢', houseNo: 'Tower B, TechPark Floor 11', landmark: 'Next to Central Cafeteria', street: 'Outer Ring Road, Marathahalli', selected: false },
      { id: 'addr-alt', label: 'Alternate Community Block 📦', houseNo: 'Locker Box A-12', landmark: 'Metro Subway Gate A Locker Node', street: 'Indiranagar Metro Complex', selected: false }
    ]
  });

  // Edit address drawer/modal helper inside Customer onboarding
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [editAddressData, setEditAddressData] = useState({ houseNo: '', landmark: '', street: '' });

  // --- 3. SELLER STATE ---
  const [sellerData, setSellerData] = useState({
    fullName: sessionUser?.name || 'John Miller',
    email: isEmailAuth ? sessionUser?.emailOrPhone || '' : 'john.miller@sunnyhills.org',
    phone: '',
    website: 'https://sunnyhills.org',
    // Business profile
    farmName: 'Sunny Hills Organic Crops',
    primaryCategory: 'Organic Vegetables & Herbs',
    businessDescription: 'Third-generation regenerative farm prioritizing chemical-free soil microbial health.',
    // Legal Docs
    aadhaarNo: '5561 2289 9904',
    panNo: 'AFGPM9012L',
    aadhaarFile: 'seller_aadhaar.pdf',
    panFile: 'seller_pan.pdf'
  });

  // Dynamically populate fields and handle auto-verification based on login method
  useEffect(() => {
    if (sessionUser) {
      setDeliveryData(prev => ({
        ...prev,
        fullName: sessionUser.name || prev.fullName,
        email: isEmailAuth ? sessionUser.emailOrPhone : prev.email,
      }));
      
      setCustomerData(prev => ({
        ...prev,
        fullName: sessionUser.name || prev.fullName,
        email: isEmailAuth ? sessionUser.emailOrPhone : prev.email,
      }));
      
      setSellerData(prev => ({
        ...prev,
        fullName: sessionUser.name || prev.fullName,
        email: isEmailAuth ? sessionUser.emailOrPhone : prev.email,
      }));
    }
  }, [sessionUser, isEmailAuth]);

  // Simulated GPS Location tracking
  const simulateGpsLocation = () => {
    addToast("🛰️ Pinging Global Navigation Satellite Network...");
    setTimeout(() => {
      // Coordinates of a major city store base
      setCustomerData(prev => ({
        ...prev,
        latitude: "12.9716° N",
        longitude: "77.5946° E",
        gpsMappedStore: "Zenvego DarkStore #18 (Central Boulevard Node)"
      }));
      addToast("📍 LOCATION ACQUIRED: Successfully mapped to Delhi/Bengaluru Area Store hub (DarkStore #18 with 400+ stores active).");
    }, 1000);
  };

  // Handle Multi-addresses selection triggers
  const toggleSelectAddress = (id: string) => {
    setCustomerData(prev => ({
      ...prev,
      addresses: prev.addresses.map(addr => ({
        ...addr,
        selected: addr.id === id
      }))
    }));
    // Cache addresses in localStorage
    const selected = customerData.addresses.find(a => a.id === id);
    if (selected) {
      localStorage.setItem('zenvego_customer_fixed_addresses', JSON.stringify(customerData.addresses));
      addToast(`🏠 Primary address set: ${selected.label}`);
    }
  };

  const handleEditAddrStart = (addr: any) => {
    setEditingAddressId(addr.id);
    setEditAddressData({
      houseNo: addr.houseNo,
      landmark: addr.landmark,
      street: addr.street
    });
  };

  const handleSaveAddr = () => {
    setCustomerData(prev => ({
      ...prev,
      addresses: prev.addresses.map(addr => {
        if (addr.id === editingAddressId) {
          return {
            ...addr,
            houseNo: editAddressData.houseNo,
            landmark: editAddressData.landmark,
            street: editAddressData.street
          };
        }
        return addr;
      })
    }));
    addToast("📝 Address details updated successfully!");
    setEditingAddressId(null);
  };

  // Submit and finalize session
  const saveRoleOnboarding = (roleInput: 'delivery' | 'customer' | 'seller') => {
    setSubmitting(true);

    let finalName = '';
    let finalPhone = '';
    let finalEmail = sessionUser?.email || '';
    let addressObj: { street?: string; city?: string; state?: string; zip?: string } | undefined = undefined;

    if (roleInput === 'delivery') {
      finalName = deliveryData.fullName;
      finalPhone = deliveryData.phone;
      finalEmail = deliveryData.email || finalEmail;
      const addrLines = deliveryData.address?.split(',').map(s => s.trim()).filter(Boolean) || [];
      if (addrLines.length > 0) {
        addressObj = {
          street: addrLines.slice(0, 2).join(', '),
          city: addrLines[addrLines.length - 1],
        };
      }
      localStorage.setItem('zenvego_delivery_partner_info', JSON.stringify(deliveryData));
    } else if (roleInput === 'customer') {
      finalName = customerData.fullName;
      finalPhone = customerData.phone;
      finalEmail = customerData.email || finalEmail;
      const selectedAddr = customerData.addresses.find(a => a.selected);
      if (selectedAddr) {
        addressObj = {
          street: [selectedAddr.houseNo, selectedAddr.landmark, selectedAddr.street].filter(Boolean).join(', '),
        };
      }
      localStorage.setItem('zenvego_customer_fixed_addresses', JSON.stringify(customerData.addresses));
      localStorage.setItem('zenvego_customer_info', JSON.stringify(customerData));
    } else if (roleInput === 'seller') {
      finalName = sellerData.fullName;
      finalPhone = sellerData.phone;
      finalEmail = sellerData.email || finalEmail;
      localStorage.setItem('zenvego_seller_info', JSON.stringify(sellerData));
    }

    const doSave = async () => {
      try {
        if (finalEmail) {
          const roleForBackend: 'customer' | 'seller' | 'delivery' = roleInput;
          await authApi.registerUser({
            email: finalEmail,
            fullName: finalName || undefined,
            phone: finalPhone || undefined,
            role: roleForBackend,
            address: addressObj,
          });
        }
      } catch (e: any) {
        console.warn('registerUser API call failed:', e);
      }

      if (sessionUser) {
        const updatedUser: LoggedInUser = {
          ...sessionUser,
          name: finalName || sessionUser.name,
          email: finalEmail || sessionUser.email,
          emailOrPhone: finalEmail || sessionUser.emailOrPhone,
          phone: finalPhone || sessionUser.phone,
          role: roleInput,
          address: addressObj || sessionUser.address,
        };
        setSessionUser(updatedUser);
        localStorage.setItem('zenvego_session_user', JSON.stringify(updatedUser));
      }

      setSubmitting(false);
      addToast(`✨ ACCOUNT ACTIVATED: Welcome to Zenvego Ecosystem as a ${roleInput.toUpperCase()}!`);
      
      if (roleInput === 'customer') {
        setView('buyer-marketplace');
      } else if (roleInput === 'seller') {
        setView('farmer-dashboard');
      } else if (roleInput === 'delivery') {
        setView('delivery-dashboard');
      }
    };

    setTimeout(() => { doSave(); }, 800);
  };

  return (
    <div id="onboarding-viewport" className="min-h-screen bg-[#fafdfb] flex flex-col font-sans select-none relative pb-10">
      
      {/* Decorative background vectors */}
      <div className="absolute top-4 left-4 w-20 h-20 border-t-2 border-l-2 border-emerald-600/10 rounded-tl-3xl pointer-events-none"></div>
      <div className="absolute top-4 right-4 w-20 h-20 border-t-2 border-r-2 border-emerald-600/10 rounded-tr-3xl pointer-events-none"></div>

      {/* Top logo header */}
      <header id="onboarding-header" className="w-full flex items-center justify-between p-6 max-w-5xl mx-auto border-b border-emerald-600/10">
        <div id="logo-branding-container" className="flex items-center gap-2 cursor-pointer" onClick={() => setView('market-home')}>
          <span id="logo-icon-span" className="material-symbols-outlined text-emerald-600 text-[28px] fill-icon">spa</span>
          <div>
            <span className="text-lg font-black tracking-widest text-[#271810]">ZENVEGO</span>
            <span className="text-[9px] uppercase tracking-wider text-emerald-700 font-bold block leading-none">Hyperlocal Agrarian Grid</span>
          </div>
        </div>

        <button 
          id="btn-back-home"
          onClick={() => setView('market-home')}
          className="text-xs bg-emerald-600/5 text-emerald-800 hover:bg-emerald-600/10 px-4 py-2 rounded-xl font-bold transition-all"
        >
          Back Home
        </button>
      </header>

      {/* Primary body container */}
      <div className="max-w-5xl w-full mx-auto px-4 md:px-6 mt-8 flex-grow flex items-center justify-center">
        
        {stage === 'choose-role' && (
          <div className="w-full max-w-xl text-center space-y-8 animate-fade-in">
            <div className="space-y-3">
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-500/20">
                Segmented Enrollment Hub
              </span>
              <h2 className="text-3xl font-serif font-black text-[#271810]">Choose Your Onboarding Platform</h2>
              <p className="text-xs text-[#271810]/75 max-w-md mx-auto leading-relaxed">
                We maintain separate regulatory and payment compliance workflows for our three dedicated member roles. Select your path below to trigger the correct portal.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              
              {/* Card 1: Delivery Partner */}
              <button
                type="button"
                onClick={() => setStage('delivery')}
                className="bg-white border-2 border-[#eddcd4] hover:border-emerald-600 p-6 rounded-3xl text-left space-y-4 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[24px]">local_shipping</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#271810]">Delivery Partner</h4>
                    <p className="text-[10px] text-gray-500 leading-relaxed mt-1">
                      Register with driving license, Aadhaar documents, and bank payout credentials to start earning.
                    </p>
                  </div>
                </div>
                <div className="pt-2 w-full flex items-center justify-between text-xs text-emerald-600 font-bold border-t border-gray-100 mt-4">
                  <span>Open Portal</span>
                  <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
              </button>

              {/* Card 2: Customer */}
              <button
                type="button"
                onClick={() => setStage('customer')}
                className="bg-white border-2 border-[#eddcd4] hover:border-emerald-600 p-6 rounded-3xl text-left space-y-4 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[24px]">shopping_basket</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#271810]">Customer / Buyer</h4>
                    <p className="text-[10px] text-gray-500 leading-relaxed mt-1">
                      Onboard with GPS location mapping to active dark stores, local address presets, and direct contact.
                    </p>
                  </div>
                </div>
                <div className="pt-2 w-full flex items-center justify-between text-xs text-emerald-600 font-bold border-t border-gray-100 mt-4">
                  <span>Open Portal</span>
                  <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
              </button>

              {/* Card 3: Seller */}
              <button
                type="button"
                onClick={() => setStage('seller')}
                className="bg-white border-2 border-[#eddcd4] hover:border-teal-600 p-6 rounded-3xl text-left space-y-4 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[24px]">storefront</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#271810]">Farmers/Growers</h4>
                    <p className="text-[10px] text-gray-500 leading-relaxed mt-1">
                      Register your organic farm credentials, crop categories, and tax/ID papers to host listings.
                    </p>
                  </div>
                </div>
                <div className="pt-2 w-full flex items-center justify-between text-xs text-teal-700 font-bold border-t border-gray-100 mt-4">
                  <span>Open Portal</span>
                  <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
              </button>

            </div>
          </div>
        )}

        {/* ==================== SCREEN 1: DELIVERY PARTNER REGISTRATION FORM ==================== */}
        {stage === 'delivery' && (
          <div className="w-full bg-white rounded-3xl border border-emerald-650/10 shadow-2xl p-6 md:p-10 space-y-8 animate-fade-in">
            <div className="flex justify-between items-start border-b border-[#eddcd4]/35 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                  <span className="text-[10px] font-black uppercase tracking-wider font-mono">ROLE: DIRECT ENROUTE COURIER</span>
                </div>
                <h3 className="text-xl font-serif font-black text-[#271810]">Delivery Partner Onboarding Desk</h3>
                <p className="text-xs text-gray-500">Provide legal identification, vehicle transit configs, and bank statements for payout settlement.</p>
              </div>
              <button 
                onClick={() => setStage('choose-role')}
                className="text-xs text-outline font-bold hover:text-emerald-600 bg-gray-50 px-3 py-1.5 rounded-xl transition-all"
              >
                Switch Role
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              
              {/* Left Form: Personal & Financial Fields */}
              <div className="md:col-span-7 space-y-6">
                
                {/* Personal Information Block */}
                <div className="space-y-4">
                  <h4 className="text-xs uppercase font-extrabold text-emerald-750 border-b border-gray-100 pb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">account_box</span>
                    1. Personal Information (as per ID)
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Full Name</label>
                      <input 
                        type="text" 
                        value={deliveryData.fullName}
                        onChange={(e) => setDeliveryData({...deliveryData, fullName: e.target.value})}
                        className="w-full bg-[#fcfdfc] border border-gray-200 text-xs py-2 px-3 rounded-lg focus:outline-none focus:border-emerald-600" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Date of Birth</label>
                      <input 
                        type="date" 
                        value={deliveryData.dob}
                        onChange={(e) => setDeliveryData({...deliveryData, dob: e.target.value})}
                        className="w-full bg-[#fcfdfc] border border-gray-200 text-xs py-2 px-3 rounded-lg focus:outline-none focus:border-emerald-600" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Father's Name</label>
                      <input 
                        type="text" 
                        value={deliveryData.fatherName}
                        onChange={(e) => setDeliveryData({...deliveryData, fatherName: e.target.value})}
                        className="w-full bg-[#fcfdfc] border border-gray-200 text-xs py-2 px-3 rounded-lg focus:outline-none focus:border-emerald-600" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Gender</label>
                      <select 
                        value={deliveryData.gender}
                        onChange={(e) => setDeliveryData({...deliveryData, gender: e.target.value})}
                        className="w-full bg-[#fcfdfc] border border-gray-200 text-xs py-2 px-3 rounded-lg focus:outline-none focus:border-emerald-600"
                      >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Mobile Number (Profile Contact)</label>
                      <input 
                        type="text" 
                        value={deliveryData.phone}
                        onChange={(e) => setDeliveryData({...deliveryData, phone: e.target.value})}
                        className="w-full bg-[#fcfdfc] border border-gray-200 text-xs py-2 px-3 rounded-lg focus:outline-none focus:border-emerald-600" 
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase font-bold text-gray-500">Email ID</label>
                        {isEmailAuth && (
                          <span className="text-[9px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">verified</span>
                            Verified via Email
                          </span>
                        )}
                      </div>
                      <input 
                        type="email" 
                        placeholder="rider.benson@gmail.com"
                        value={deliveryData.email}
                        disabled={isEmailAuth}
                        onChange={(e) => setDeliveryData({...deliveryData, email: e.target.value})}
                        className="w-full bg-[#fcfdfc] border border-gray-200 text-xs py-2 px-3 rounded-lg focus:outline-none focus:border-emerald-600 disabled:opacity-70 disabled:bg-gray-50" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-500">Current Residential Address</label>
                    <textarea 
                      rows={2}
                      value={deliveryData.address}
                      onChange={(e) => setDeliveryData({...deliveryData, address: e.target.value})}
                      className="w-full bg-[#fcfdfc] border border-gray-200 text-xs py-2 px-3 rounded-lg focus:outline-none focus:border-emerald-600" 
                    />
                  </div>
                </div>

                {/* Work & Vehicle details */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs uppercase font-extrabold text-[#271810] border-b border-gray-100 pb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">motorcycle</span>
                    2. Vehicle & Work Specifications
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Vehicle Type</label>
                      <select 
                        value={deliveryData.vehicleType}
                        onChange={(e) => setDeliveryData({...deliveryData, vehicleType: e.target.value})}
                        className="w-full bg-[#fffcfb] border border-gray-200 py-2 px-3 rounded-lg"
                      >
                        <option>Electric Bike</option>
                        <option>Hub-Motor Scooter</option>
                        <option>Eco Bicycle</option>
                        <option>Commercial Motorcycle</option>
                      </select>
                    </div>
                    <div className="flex flex-col justify-end pb-2">
                      <p className="text-[10px] text-gray-500 italic">E-Bikes and Bicycles qualify for Zero Sourcing commissions.</p>
                    </div>
                  </div>
                </div>

                {/* Financial Bank Account Details */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs uppercase font-extrabold text-emerald-700 border-b border-gray-100 pb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">account_balance</span>
                    3. Payment & Financial Verification
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Bank Name</label>
                      <input 
                        type="text" 
                        value={deliveryData.bankName}
                        onChange={(e) => setDeliveryData({...deliveryData, bankName: e.target.value})}
                        className="w-full bg-[#fcfdfc] border border-gray-200 text-xs py-2 px-3 rounded-lg focus:outline-none focus:border-emerald-600" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">IFSC Code</label>
                      <input 
                        type="text" 
                        value={deliveryData.ifscCode}
                        onChange={(e) => setDeliveryData({...deliveryData, ifscCode: e.target.value})}
                        className="w-full bg-[#fcfdfc] border border-gray-200 text-xs py-2 px-3 rounded-lg focus:outline-none focus:border-emerald-600" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Account Holder Name</label>
                      <input 
                        type="text" 
                        value={deliveryData.accountHolderName}
                        onChange={(e) => setDeliveryData({...deliveryData, accountHolderName: e.target.value})}
                        className="w-full bg-[#fcfdfc] border border-gray-200 text-xs py-2 px-3 rounded-lg focus:outline-none focus:border-emerald-600" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Bank Account Number</label>
                      <input 
                        type="text" 
                        value={deliveryData.bankAccountNumber}
                        onChange={(e) => setDeliveryData({...deliveryData, bankAccountNumber: e.target.value})}
                        className="w-full bg-[#fcfdfc] border border-gray-200 text-xs py-2 px-3 rounded-lg focus:outline-none focus:border-emerald-600" 
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Right panel: Legal Documents upload simulation desk */}
              <div className="md:col-span-5 bg-[#f4fbf7] border border-emerald-600/15 p-6 rounded-3xl space-y-6">
                <div className="space-y-1">
                  <h4 className="text-xs uppercase font-extrabold text-[#271810]">Required Compliance Uploads</h4>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase leading-none">Photographic and credential proof verification</p>
                </div>

                <div className="space-y-4 text-xs">
                  
                  {/* Selfie Upload */}
                  <div className="p-3 bg-white border border-gray-200 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600">add_a_photo</span>
                      <div>
                        <span className="font-bold block text-[11px]">Passport Selfie Photo</span>
                        <span className="text-[9px] text-emerald-600 font-bold block">✓ {deliveryData.selfieFile}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => addToast("📷 Snapshot captured via device webcam!")} className="text-[10px] bg-gray-150 border font-bold px-2.5 py-1 rounded-lg">Retake</button>
                  </div>

                  {/* DL Photo Upload */}
                  <div className="p-3 bg-white border border-gray-200 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600">badge</span>
                      <div>
                        <span className="font-bold block text-[11px]">Driving License (DL) File</span>
                        <span className="text-[9px] text-emerald-600 font-bold block">✓ {deliveryData.licenseFile}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => addToast("🗎 Legal driving license scan attached")} className="text-[10px] bg-gray-150 border font-bold px-2.5 py-1 rounded-lg">Browse</button>
                  </div>

                  {/* Details input of documents */}
                  <div className="space-y-3.5 bg-white p-4 rounded-2xl border border-gray-100">
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-gray-400">Aadhaar Card Number (ID Proof)</label>
                      <input 
                        type="text" 
                        value={deliveryData.aadhaarNumber} 
                        onChange={(e) => setDeliveryData({...deliveryData, aadhaarNumber: e.target.value})}
                        className="w-full bg-[#fcfdfc] border border-gray-200 font-mono text-[10px] py-1 px-2.5 rounded focus:outline-none focus:border-emerald-600" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase font-bold text-gray-400">PAN Card Number</label>
                        <input 
                          type="text" 
                          value={deliveryData.panNumber} 
                          onChange={(e) => setDeliveryData({...deliveryData, panNumber: e.target.value})}
                          className="w-full bg-[#fcfdfc] border border-gray-200 font-mono text-[10px] py-1 px-2.5 rounded focus:outline-none focus:border-emerald-600" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase font-bold text-gray-400">Driving License ID</label>
                        <input 
                          type="text" 
                          value={deliveryData.drivingLicenseNumber} 
                          onChange={(e) => setDeliveryData({...deliveryData, drivingLicenseNumber: e.target.value})}
                          className="w-full bg-[#fcfdfc] border border-gray-200 font-mono text-[10px] py-1 px-2.5 rounded focus:outline-none focus:border-emerald-600" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100 mt-2">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-gray-400">Vehicle RC ID</label>
                        <input 
                          type="text" 
                          value={deliveryData.vehicleRcNumber} 
                          onChange={(e) => setDeliveryData({...deliveryData, vehicleRcNumber: e.target.value})}
                          className="w-full bg-[#fcfdfc] border border-gray-200 font-mono text-[10px] py-1 px-2.5 rounded focus:outline-none focus:border-emerald-600" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-gray-400">Insurance Policy</label>
                        <input 
                          type="text" 
                          value={deliveryData.insurancePolicyNumber} 
                          onChange={(e) => setDeliveryData({...deliveryData, insurancePolicyNumber: e.target.value})}
                          className="w-full bg-[#fcfdfc] border border-gray-200 font-mono text-[10px] py-1 px-2.5 rounded focus:outline-none focus:border-emerald-600" 
                        />
                      </div>
                    </div>
                  </div>

                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-[10px] text-emerald-800 leading-relaxed">
                  <strong>⚠️ Policy Compliance:</strong> I certify that vehicle RC {deliveryData.vehicleRcNumber} is fully insured and my valid driving license is clean under standard motor safety laws.
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!deliveryData.fullName || !deliveryData.phone) {
                      addToast("⚠️ Please specify your main personal name and contact number first.");
                      return;
                    }
                    saveRoleOnboarding('delivery');
                  }}
                  disabled={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
                      Registering Ledger Records...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                      Onboard Registered Courier Account
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ==================== SCREEN 2: CUSTOMER REGISTRATION FORM ==================== */}
        {stage === 'customer' && (
          <div className="w-full bg-white rounded-3xl border border-[#eddcd4] shadow-2xl p-6 md:p-10 space-y-8 animate-fade-in">
            <div className="flex justify-between items-start border-b border-[#eddcd4]/35 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                  <span className="text-[10px] font-black uppercase tracking-wider font-mono">ROLE: DECENTRALIZED CUSTOMER / BUYER</span>
                </div>
                <h3 className="text-xl font-serif font-black text-[#271810]">Customer Enrollment Desk</h3>
                <p className="text-xs text-gray-500">Provide direct communication metrics and map alternative fixed address presets for automatic dropoff lockers.</p>
              </div>
              <button 
                onClick={() => setStage('choose-role')}
                className="text-xs text-outline font-bold hover:text-emerald-600 bg-gray-50 px-3 py-1.5 rounded-xl transition-all"
              >
                Switch Role
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              
              {/* Left Side: Contact Details & Hyperlocal Store Locators */}
              <div className="md:col-span-6 space-y-6">
                <div className="space-y-4">
                  <h4 className="text-xs uppercase font-extrabold text-emerald-800 border-b border-gray-100 pb-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">phone_iphone</span>
                    1. Direct Identity Contact (Frictionless)
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Your Full Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Sarah Jenkins"
                        value={customerData.fullName}
                        onChange={(e) => setCustomerData({...customerData, fullName: e.target.value})}
                        className="w-full bg-[#fcfdfc] border border-gray-200 text-xs py-2 px-3 rounded-lg focus:outline-none focus:border-emerald-600" 
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase font-bold text-gray-500">Billing Email ID (For Invoice)</label>
                        {isEmailAuth && (
                          <span className="text-[9px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">verified</span>
                            Verified via Email
                          </span>
                        )}
                      </div>
                      <input 
                        type="email" 
                        value={customerData.email}
                        disabled={isEmailAuth}
                        onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                        className="w-full bg-[#fcfdfc] border border-gray-200 text-xs py-2 px-3 rounded-lg focus:outline-none focus:border-emerald-600 disabled:opacity-70 disabled:bg-gray-50" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500 block">Mobile Number (Profile Contact)</label>
                    <input 
                      type="text" 
                      value={customerData.phone}
                      onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                      className="w-full bg-[#fcfdfc] border border-gray-200 text-xs py-2 px-3 rounded-lg focus:outline-none focus:border-emerald-600" 
                    />
                  </div>
                </div>

                {/* Hyperlocal Store Locator */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs uppercase font-extrabold text-emerald-800 border-b border-gray-100 pb-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">my_location</span>
                    2. Hyperlocal Navigation Mapped Dark Stores
                  </h4>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200/60 space-y-3.5 text-xs">
                    <p className="text-gray-600 leading-normal text-[11px]">
                      Our ecosystem utilizes dark store hubs across <strong>15+ metropolitan cities</strong> with <strong>400+ active physical pickup structures</strong>. Tap below to map your coordinate nodes.
                    </p>

                    <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400 block font-mono">Location Coordinates</span>
                        <p className="font-bold text-[#271810]">
                          Lat: <span className="text-emerald-700 font-mono">{customerData.latitude}</span> • Lng: <span className="text-emerald-700 font-mono">{customerData.longitude}</span>
                        </p>
                      </div>
                      
                      <button
                        type="button"
                        onClick={simulateGpsLocation}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold py-2 px-3 rounded-xl flex items-center gap-1 transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">gps_fixed</span>
                        Track GPS
                      </button>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">Nearest Serving Local Center</span>
                      <p className="font-bold text-emerald-800 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-emerald-600">apartment</span>
                        {customerData.gpsMappedStore}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Side: Primary and Alternative Fixed Address Presets */}
              <div className="md:col-span-6 bg-[#fcfdfc] border border-emerald-600/10 p-6 rounded-3xl space-y-6">
                <div className="space-y-1">
                  <h4 className="text-xs uppercase font-extrabold text-emerald-800 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    3. Fixed Alternate Addresses Presets (2+ Slots)
                  </h4>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase leading-none">Select your default Drop-off locations for faster booking placement</p>
                </div>

                <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                  {customerData.addresses.map((addr) => (
                    <div 
                      key={addr.id} 
                      className={`p-3.5 rounded-2xl border transition-all space-y-2 cursor-pointer ${addr.selected ? 'bg-[#eefcf4] border-emerald-600/40 shadow-sm' : 'bg-white border-gray-150 hover:bg-gray-50'}`}
                      onClick={() => toggleSelectAddress(addr.id)}
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-emerald-800 flex items-center gap-1 text-[11px]">
                          {addr.label}
                          {addr.selected && (
                            <span className="bg-emerald-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded">PRIMARY</span>
                          )}
                        </span>
                        
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAddrStart(addr);
                            }}
                            className="bg-transparent hover:text-emerald-700 text-outline p-1 rounded hover:bg-emerald-50 text-[11px]"
                          >
                            Edit
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] text-gray-600 space-y-0.5 font-normal leading-normal">
                        <p><strong className="text-gray-700">House/Flat Number:</strong> {addr.houseNo}</p>
                        <p><strong className="text-gray-700">Landmark Point:</strong> {addr.landmark}</p>
                        <p><strong className="text-gray-700">Street / Area Name:</strong> {addr.street}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Edit address form fields (Displayed only when edit button is toggled) */}
                {editingAddressId && (
                  <div className="bg-white border border-emerald-600/10 p-4 rounded-2xl space-y-3 text-xs animate-fade-in relative z-20">
                    <h5 className="font-extrabold text-[#271810] text-[11.5px] border-b border-gray-100 pb-1 flex justify-between items-center">
                      <span>Modify Address Coordinates</span>
                      <button type="button" onClick={() => setEditingAddressId(null)} className="text-gray-400">✕</button>
                    </h5>
                    
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-gray-400">House / Flat / Area Number</label>
                        <input 
                          type="text" 
                          value={editAddressData.houseNo}
                          onChange={(e) => setEditAddressData({...editAddressData, houseNo: e.target.value})}
                          className="w-full bg-[#fcfdfc] border border-gray-200 py-1.5 px-2.5 rounded text-xs focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-gray-400">Landmark Point</label>
                        <input 
                          type="text" 
                          value={editAddressData.landmark}
                          onChange={(e) => setEditAddressData({...editAddressData, landmark: e.target.value})}
                          className="w-full bg-[#fcfdfc] border border-gray-200 py-1.5 px-2.5 rounded text-xs focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-gray-400">Street Name & Area District</label>
                        <input 
                          type="text" 
                          value={editAddressData.street}
                          onChange={(e) => setEditAddressData({...editAddressData, street: e.target.value})}
                          className="w-full bg-[#fcfdfc] border border-gray-200 py-1.5 px-2.5 rounded text-xs focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveAddr}
                      className="w-full bg-emerald-600 text-white font-bold py-1.5 rounded-lg text-[10px]"
                    >
                      Apply Changes & Save
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!customerData.fullName || !customerData.phone) {
                      addToast("⚠️ Please enter your Full Name and Contact phone digits.");
                      return;
                    }
                    saveRoleOnboarding('customer');
                  }}
                  disabled={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
                      Registering Buyer Profile...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Save Address Presets & Go Marketplace Sourcing
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ==================== SCREEN 3: SELLER REGISTRATION FORM ==================== */}
        {stage === 'seller' && (
          <div className="w-full bg-white rounded-3xl border border-teal-600/15 shadow-2xl p-6 md:p-10 space-y-8 animate-fade-in">
            <div className="flex justify-between items-start border-b border-[#eddcd4]/35 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-teal-650">
                  <span className="material-symbols-outlined text-[18px]">storefront</span>
                  <span className="text-[10px] font-black uppercase tracking-wider font-mono">ROLE: DECENTRALIZED ORGANIC PRODUCER</span>
                </div>
                <h3 className="text-xl font-serif font-black text-[#271810]">Grower / Seller Enrollment Desk</h3>
                <p className="text-xs text-gray-500">List your certified farm holdings, register commercial crop codes, and submit basic identity paperwork to proceed.</p>
              </div>
              <button 
                onClick={() => setStage('choose-role')}
                className="text-xs text-outline font-bold hover:text-teal-655 bg-gray-50 px-3 py-1.5 rounded-xl transition-all"
              >
                Switch Role
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              
              {/* Left Column: Business & Contact Details */}
              <div className="md:col-span-7 space-y-6 text-xs">
                
                {/* Basic & Contact Information */}
                <div className="space-y-4">
                  <h4 className="text-xs uppercase font-extrabold text-teal-850 border-b border-gray-100 pb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">contacts</span>
                    1. Direct Identity & Contact Details
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Authorized Name</label>
                      <input 
                        type="text" 
                        value={sellerData.fullName}
                        onChange={(e) => setSellerData({...sellerData, fullName: e.target.value})}
                        className="w-full bg-[#fcfdfd] border border-gray-200 py-2 px-3 rounded-lg focus:outline-none focus:border-teal-600" 
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase font-bold text-gray-500">Billing Email Address</label>
                        {isEmailAuth && (
                          <span className="text-[9px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">verified</span>
                            Verified via Email
                          </span>
                        )}
                      </div>
                      <input 
                        type="email" 
                        value={sellerData.email}
                        disabled={isEmailAuth}
                        onChange={(e) => setSellerData({...sellerData, email: e.target.value})}
                        className="w-full bg-[#fcfdfd] border border-gray-200 py-2 px-3 rounded-lg focus:outline-none focus:border-teal-600 disabled:opacity-70 disabled:bg-gray-50" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Phone Number (Profile Contact)</label>
                      <input 
                        type="text" 
                        value={sellerData.phone}
                        onChange={(e) => setSellerData({...sellerData, phone: e.target.value})}
                        className="w-full bg-[#fcfdfd] border border-gray-200 py-2 px-3 rounded-lg focus:outline-none focus:border-teal-600" 
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Business URL / Website Link (Optional)</label>
                      <input 
                        type="url" 
                        placeholder="https://sunnyhillsorganic.com"
                        value={sellerData.website}
                        onChange={(e) => setSellerData({...sellerData, website: e.target.value})}
                        className="w-full bg-[#fcfdfd] border border-gray-200 py-2 px-3 rounded-lg focus:outline-none focus:border-teal-600" 
                      />
                    </div>
                  </div>
                </div>

                {/* Business profile details */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs uppercase font-extrabold text-teal-750 border-b border-gray-100 pb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">potted_plant</span>
                    2. Crop & Farm Business Profile
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Trading / Farm Brand Name</label>
                      <input 
                        type="text" 
                        value={sellerData.farmName}
                        onChange={(e) => setSellerData({...sellerData, farmName: e.target.value})}
                        className="w-full bg-[#fcfdfd] border border-gray-200 py-2 px-3 rounded-lg focus:outline-none focus:border-teal-600" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Primary Specialty Categories</label>
                      <input 
                        type="text" 
                        value={sellerData.primaryCategory}
                        onChange={(e) => setSellerData({...sellerData, primaryCategory: e.target.value})}
                        className="w-full bg-[#fcfdfd] border border-gray-200 py-2 px-3 rounded-lg focus:outline-none focus:border-teal-600" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-500">Detailed Sourcing Philosophy Banner</label>
                    <textarea 
                      rows={2}
                      value={sellerData.businessDescription}
                      onChange={(e) => setSellerData({...sellerData, businessDescription: e.target.value})}
                      className="w-full bg-[#fcfdfd] border border-gray-200 py-2 px-3 rounded-lg focus:outline-none focus:border-teal-600" 
                    />
                  </div>
                </div>

              </div>

              {/* Right Column: Seller Identity Verification Docs uploads */}
              <div className="md:col-span-5 bg-[#f4fbf7] border border-teal-600/15 p-6 rounded-3xl space-y-6">
                <div className="space-y-1">
                  <h4 className="text-xs uppercase font-extrabold text-teal-800 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">file_present</span>
                    3. Mandatory Legal Identification Details
                  </h4>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase leading-none">Aadhaar & PAN are required under commercial transaction guidelines</p>
                </div>

                <div className="space-y-4 text-xs">
                  
                  {/* Aadhaar File Upload block */}
                  <div className="p-3 bg-white border border-gray-200 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-teal-650">badge</span>
                      <div>
                        <span className="font-bold block text-[11px]">Representative Aadhaar Card</span>
                        <span className="text-[9px] text-emerald-600 font-bold block">✓ {sellerData.aadhaarFile}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => addToast("🗎 Aadhaar document verify file locked.")} className="text-[10px] bg-gray-150 border font-bold px-2.5 py-1 rounded-lg">Update</button>
                  </div>

                  {/* PAN File upload block */}
                  <div className="p-3 bg-white border border-gray-200 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-teal-655">description</span>
                      <div>
                        <span className="font-bold block text-[11px]">Commercial PAN Document</span>
                        <span className="text-[9px] text-emerald-600 font-bold block">✓ {sellerData.panFile}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => addToast("🗎 Permanent Account Number file saved.")} className="text-[10px] bg-gray-150 border font-bold px-2.5 py-1 rounded-lg">Update</button>
                  </div>

                  {/* Value Input */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400">Aadhaar Card Id Number</label>
                      <input 
                        type="text" 
                        value={sellerData.aadhaarNo}
                        onChange={(e) => setSellerData({...sellerData, aadhaarNo: e.target.value})}
                        className="w-full bg-[#fcfcfd] border border-gray-200 text-xs font-mono py-1.5 px-2 rounded focus:outline-none focus:border-teal-600" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400">Government Private PAN Id Number</label>
                      <input 
                        type="text" 
                        value={sellerData.panNo}
                        onChange={(e) => setSellerData({...sellerData, panNo: e.target.value})}
                        className="w-full bg-[#fcfcfd] border border-gray-200 text-xs font-mono py-1.5 px-2 rounded focus:outline-none focus:border-teal-600" 
                      />
                    </div>
                  </div>

                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-[10px] text-emerald-800 leading-normal">
                  <strong>🌿 General Organic Compact:</strong> I authorize that Sunny Hills Organic sells 100% locally-harvested organic and pesticide-free foods satisfying regional agricultural guidelines.
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!sellerData.fullName || !sellerData.phone) {
                      addToast("⚠️ Please enter Representative Authorized Name and Phone number.");
                      return;
                    }
                    saveRoleOnboarding('seller');
                  }}
                  disabled={submitting}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-extrabold py-3.5 rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
                      Activating Listing Keys...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      Onboard Registered Seller License
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
