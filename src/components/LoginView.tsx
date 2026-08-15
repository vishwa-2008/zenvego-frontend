import React, { useState, useEffect } from 'react';
import { ViewState, LoggedInUser } from '../types';
import { handleImageError } from '../utils/imageFallback';
import { speechService } from '../utils/speech';
import { authApi, BackendUser } from '../lib/api';

interface LoginViewProps {
  setView: (view: ViewState) => void;
  addToast: (msg: string) => void;
  preselectedRole: 'customer' | 'seller' | 'delivery' | null;
  setPreselectedRole: (role: 'customer' | 'seller' | 'delivery' | null) => void;
  onLoginSuccess: (user: LoggedInUser) => void;
}

export default function LoginView({
  setView,
  addToast,
  preselectedRole,
  setPreselectedRole,
  onLoginSuccess
}: LoginViewProps) {
  const [selectedRole, setSelectedRole] = useState<'customer' | 'seller' | 'delivery'>(() => {
    if (preselectedRole === 'customer') return 'customer';
    if (preselectedRole === 'seller') return 'seller';
    if (preselectedRole === 'delivery') return 'delivery';
    return 'customer';
  });

  useEffect(() => {
    if (preselectedRole) {
      setSelectedRole(preselectedRole);
    }
  }, [preselectedRole]);

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const [isVerifying, setIsVerifying] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [enteredEmailOtp, setEnteredEmailOtp] = useState('');
  const [emailOtpCountdown, setEmailOtpCountdown] = useState(0);

  useEffect(() => {
    if (emailOtpCountdown > 0) {
      const timer = setTimeout(() => setEmailOtpCountdown(emailOtpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailOtpCountdown]);

  const finalizeAuthentication = (name: string, identifier: string, method: LoggedInUser['authMethod'], backendUser?: BackendUser) => {
    setIsVerifying(false);

    const fallbackAvatar = selectedRole === 'customer'
      ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150'
      : selectedRole === 'seller'
        ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuDoAL8ofMRyL8kK_sYXBp_4J5XwePZQ_K1_9StG4EkZdaYa9qxrtabVpwVkHWzfWg74YTz3ckjzbmsxnK0g7N57RVGNRxSwjLbgcrRUORPa-F9ev2RJAGll9ppZfPmCRTfQX9YWhyapxPnIZrWy6QcEXlEM70Fz8RfF9pfTjirT1urJ7-p8nC8WRmswBLMypTur2EmDoonUeyCHUDRGRUYKZ3oNzHPuqwIfadVdEr-5QnPca_F8mDfT5wYs2UVqEesaGf-2GjxHEdsq'
        : 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfMWpyldO-8cnwsG7JzSrsxx9DrG4McUUom3CqMpQJVpj1v6I6TLZMadueF362Qs8Cjf7SfKJ3E4zmfFXEWy9Djbz4BUZUn2tkAKCrpYU2V4CwCLmff7VgNXZIGt_Mrh6YE_bXQ8CYgn1R_3lX8X2QuLDCkU1GQgz_N3aS83HjvoCw34wBwsuwL9vFEC4uRDKdE60KqoobRFrYkPPeUDlbc5pYHTVkjSN0SGDx0YGsUNofl4_CUVDD4k7gGQlZ-p3iHJnoeulHb1zf';

    const emailStr = (backendUser?.email || identifier || 'community@zenvego.org').trim().toLowerCase();
    const fullName = backendUser?.fullName || name || emailStr.split('@')[0] || 'Zenvego Neighbor';

    const authenticatedUser: LoggedInUser = {
      id: backendUser?.id || 'user_' + Math.random().toString(36).substr(2, 9),
      name: fullName,
      email: emailStr,
      emailOrPhone: emailStr,
      phone: backendUser?.phone,
      role: (backendUser?.role as LoggedInUser['role']) || selectedRole,
      authMethod: method,
      avatar: backendUser?.avatar || fallbackAvatar,
      banner: backendUser?.banner,
      address: backendUser?.address,
      createdAt: backendUser?.createdAt,
      updatedAt: backendUser?.updatedAt,
    };
    onLoginSuccess(authenticatedUser);
  };

  const handleSendEmailOtp = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      addToast("⚠️ Please enter a valid neighborhood email address.");
      return;
    }

    setIsVerifying(true);
    setProgressMsg("Connecting to SMTP email broadcast server...");

    try {
      const res = await authApi.sendOtp(cleanEmail, displayName.trim() || undefined);
      if (res.status === 'success') {
        addToast("✅ Verification code sent! Please check your email inbox and spam folder.");
        setEmailOtpSent(true);
        setEmailOtpCountdown(60);
        setEnteredEmailOtp('');
      } else {
        addToast(`❌ ${res.message || "Failed to send OTP email"}`);
      }
    } catch (err: any) {
      addToast("❌ Failed to send email. Please try again.");
      console.warn("sendOtp error:", err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      addToast("⚠️ Email address required.");
      return;
    }
    if (!enteredEmailOtp.trim() || enteredEmailOtp.length !== 6) {
      addToast("⚠️ Please enter a valid 6-digit code.");
      return;
    }

    setIsVerifying(true);
    setProgressMsg("Verifying secure OTP code...");

    try {
      const res = await authApi.verifyOtp(cleanEmail, enteredEmailOtp.trim());
      if (res.status === 'success') {
        addToast("✅ Verification successful!");
        const backendUser: BackendUser | undefined = res.user;
        const nameToUse = displayName.trim() || backendUser?.fullName || cleanEmail.split('@')[0];
        finalizeAuthentication(nameToUse, cleanEmail, 'email', backendUser);
      } else {
        addToast(`❌ ${res.message || "Invalid or expired OTP"}`);
      }
    } catch (err: any) {
      addToast("❌ Verification failed. Please try again.");
      console.warn("verifyOtp error:", err);
    } finally {
      setIsVerifying(false);
    }
  };

  const loginAsDemoSandbox = (who: 'sarah' | 'miller' | 'river') => {
    if (who === 'sarah') {
      setSelectedRole('customer');
      finalizeAuthentication('Sarah Jenkins', 'sarah.jenkins@gmail.com', 'email', {
        email: 'sarah.jenkins@gmail.com',
        fullName: 'Sarah Jenkins',
        role: 'customer',
        phone: undefined,
      });
    } else if (who === 'miller') {
      setSelectedRole('seller');
      finalizeAuthentication('John Miller', 'windmill.sourdough@gmail.com', 'email', {
        email: 'windmill.sourdough@gmail.com',
        fullName: 'John Miller',
        role: 'seller',
      });
    } else if (who === 'river') {
      setSelectedRole('delivery');
      finalizeAuthentication('Alex River', 'alex.courier@zenvego.org', 'email', {
        email: 'alex.courier@zenvego.org',
        fullName: 'Alex River',
        role: 'delivery',
      });
    }
  };

  const handleVoiceBiometrics = () => {
    addToast("Voice biometric not available in Email-Only build. Use Email OTP above.");
  };
  const handlePasskeyVerification = () => {
    addToast("Passkey not available in Email-Only build. Use Email OTP above.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d5c46] via-[#158a69] to-[#ff5c3e] flex items-center justify-center py-10 px-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-32 -right-24 w-[28rem] h-[28rem] bg-secondary/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-[#ff5c3e]/20 rounded-full blur-3xl"></div>
      </div>

      <button
        type="button"
        onClick={() => { setPreselectedRole(null); setView('market-home'); }}
        className="fixed top-5 left-5 z-[9999] bg-[#271810]/85 backdrop-blur-md text-white text-[11px] font-bold rounded-full px-4 py-2 shadow-xl border border-white/10 cursor-pointer hover:bg-[#271810] transition-all flex items-center gap-1.5"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Back to Marketplace
      </button>

      <div className="relative w-full max-w-2xl">
        <div className="bg-white/95 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white/60 p-6 sm:p-8 space-y-6 animate-fade-in">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0d5c46] to-[#158a69] px-5 py-2 rounded-full shadow-lg">
              <span className="text-2xl">🌱</span>
              <span className="text-white text-xs font-black tracking-widest uppercase">Zenvego Ecosystem</span>
            </div>
            <h1 className="text-[#271810] text-2xl sm:text-3xl font-black font-serif pt-2 tracking-tight">
              Neighborhood Secure Access Gateway
            </h1>
            <p className="text-[11px] sm:text-xs text-on-surface-variant max-w-lg mx-auto">
              Password-free security handshake. We'll email you a time-limited 6-digit secure code to validate your identity.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-[#7a5743] uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">person</span>
              Step 1: Select Ecosystem Role
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('customer');
                  addToast("Role Preference designated: Neighborhood Customer");
                }}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between h-24 cursor-pointer ${
                  selectedRole === 'customer'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm'
                    : 'border-surface-container bg-white hover:border-surface-container-highest hover:bg-[#fffdfd]'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className={`material-symbols-outlined ${selectedRole === 'customer' ? 'text-primary' : 'text-[#7a5743]'} text-[22px]`}>
                    shopping_basket
                  </span>
                  {selectedRole === 'customer' && (
                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                  )}
                </div>
                <div className="space-y-px">
                  <p className="font-bold text-xs text-[#271810]">Customer</p>
                  <p className="text-[9px] text-[#7a5743] leading-none">Buy Organic harvests</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('seller');
                  addToast("Role Preference designated: Seller & Harvester");
                }}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between h-24 cursor-pointer ${
                  selectedRole === 'seller'
                    ? 'border-[#a24000] bg-[#a24000]/5 ring-1 ring-[#a24000]/20 shadow-sm'
                    : 'border-surface-container bg-white hover:border-surface-container-highest hover:bg-[#fffdfd]'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className={`material-symbols-outlined ${selectedRole === 'seller' ? 'text-[#a24000]' : 'text-[#7a5743]'} text-[22px]`}>
                    agriculture
                  </span>
                  {selectedRole === 'seller' && (
                    <span className="w-2 h-2 bg-[#a24000] rounded-full"></span>
                  )}
                </div>
                <div className="space-y-px">
                  <p className="font-bold text-xs text-[#271810]">Seller / Farmer</p>
                  <p className="text-[9px] text-[#7a5743] leading-none">Distribute local crops</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('delivery');
                  addToast("Role Preference designated: Delivery Courier Partner");
                }}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between h-24 cursor-pointer ${
                  selectedRole === 'delivery'
                    ? 'border-secondary bg-secondary/5 ring-1 ring-secondary/20 shadow-sm'
                    : 'border-surface-container bg-white hover:border-surface-container-highest hover:bg-[#fffdfd]'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className={`material-symbols-outlined ${selectedRole === 'delivery' ? 'text-secondary' : 'text-[#7a5743]'} text-[22px]`}>
                    local_shipping
                  </span>
                  {selectedRole === 'delivery' && (
                    <span className="w-2 h-2 bg-secondary rounded-full"></span>
                  )}
                </div>
                <div className="space-y-px">
                  <p className="font-bold text-xs text-[#271810]">Courier Partner</p>
                  <p className="text-[9px] text-[#7a5743] leading-none">Transport neighbor drops</p>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-[10px] font-extrabold text-[#7a5743] uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">key</span>
              Step 2: Verify via Email OTP
            </label>

            <div className="space-y-4 pt-1 animate-fade-in">
              <p className="text-xs text-on-surface-variant leading-normal">
                Enter your email address. We will send a 6-digit one-time verification code. Codes expire after 10 minutes.
              </p>

              {!emailOtpSent ? (
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase block">Full Display Name <span className="text-outline/70">(Optional — personalizes your email)</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Sarah Jenkins"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-white border border-surface-container px-3.5 py-2.5 rounded-xl text-xs text-[#271810] focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase block">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. sarah.jenkins@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white border border-surface-container px-3.5 py-2.5 rounded-xl text-xs text-[#271810] focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <label className="flex items-center gap-1.5 text-outline cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded accent-primary"
                      />
                      Remember this device
                    </label>
                    <span className="text-outline/70 text-[10px]">No passwords required</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendEmailOtp}
                    className="w-full bg-primary hover:bg-primary-container text-white text-xs font-extrabold py-3.5 px-4 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">mail</span>
                    Send 6-Digit Email OTP Code
                  </button>
                </div>
              ) : (
                <form onSubmit={handleVerifyEmailOtp} className="space-y-3.5 bg-white p-4 rounded-2xl border border-surface-container">
                  <div className="flex justify-between items-center pb-2 border-b border-surface-container text-[#a24000] text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                      Email OTP Code Sent
                    </span>
                    <button
                      type="button"
                      onClick={() => { setEmailOtpSent(false); }}
                      className="text-primary hover:underline font-bold text-[11px]"
                    >
                      Change Email
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase block">Full Display Name</label>
                    <input
                      type="text"
                      placeholder="Your display name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-surface-container px-3.5 py-2.5 rounded-xl text-xs text-[#271810] focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase block">6-Digit Email Verification Pin</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter the 6-digit code"
                      value={enteredEmailOtp}
                      onChange={(e) => setEnteredEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full text-center tracking-[4px] font-mono font-bold text-base bg-surface-container-lowest border border-surface-container px-3 py-2.5 rounded-xl focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-outline pt-1">
                    <span>Expires in {emailOtpCountdown > 0 ? `${emailOtpCountdown}s` : 'Expired'}</span>
                    <button
                      type="button"
                      onClick={handleSendEmailOtp}
                      className="text-primary hover:underline font-bold"
                      disabled={emailOtpCountdown > 0}
                    >
                      Resend Code
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary-container text-white text-xs font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">verified_user</span>
                    Verify Code & Unlock Portal
                  </button>
                </form>
              )}
            </div>

            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-surface-container-high"></div>
              <span className="flex-shrink mx-4 text-[9px] font-extrabold text-outline uppercase tracking-wider">
                Explore Demo Portals
              </span>
              <div className="flex-grow border-t border-surface-container-high"></div>
            </div>

            <div className="bg-[#fff9f6] border border-[#a24000]/10 p-4 rounded-2xl space-y-3">
              <div className="space-y-0.5 text-center sm:text-left">
                <span className="text-[10px] font-bold text-[#a24000] uppercase tracking-wider block">Sandbox Quickstart links</span>
                <p className="text-[10px] text-outline">Bypass authentication directly into the corresponding layout spaces.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => loginAsDemoSandbox('sarah')}
                  className="p-2 border border-surface-container hover:border-primary bg-white text-[#271810] rounded-xl flex items-center gap-1.5 justify-center font-bold cursor-pointer transition-all hover:bg-primary/5"
                >
                  <span className="material-symbols-outlined text-primary text-[16px] leading-none">person</span>
                  Sarah (Customer)
                </button>
                <button
                  type="button"
                  onClick={() => loginAsDemoSandbox('miller')}
                  className="p-2 border border-surface-container hover:border-[#a24000] bg-white text-[#271810] rounded-xl flex items-center gap-1.5 justify-center font-bold cursor-pointer transition-all hover:bg-[#a24000]/5"
                >
                  <span className="material-symbols-outlined text-[#a24000] text-[16px] leading-none">agriculture</span>
                  John (Farmer)
                </button>
                <button
                  type="button"
                  onClick={() => loginAsDemoSandbox('river')}
                  className="p-2 border border-surface-container hover:border-secondary bg-white text-[#271810] rounded-xl flex items-center gap-1.5 justify-center font-bold cursor-pointer transition-all hover:bg-secondary/5"
                >
                  <span className="material-symbols-outlined text-secondary text-[16px] leading-none">local_shipping</span>
                  Alex (Courier)
                </button>
              </div>
            </div>

            <div className="text-center pt-2">
              <p className="text-xs text-outline leading-relaxed">
                By entering the platform, you approve Zenvego's <span className="font-bold underline text-primary cursor-pointer">Community Charter</span> and <span className="font-bold underline text-primary cursor-pointer">Ecosystem Agreement</span>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {isVerifying && (
        <div className="fixed inset-0 bg-[#271810]/75 backdrop-blur-md z-[99999] flex flex-col items-center justify-center text-white space-y-6">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-solid border-primary border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[32px] fill-icon font-bold">lock_open</span>
            </div>
          </div>

          <div className="space-y-1 text-center">
            <h3 className="text-lg font-black tracking-tight text-white font-sans">Ecosystem Authorization Gate</h3>
            <p className="text-xs text-secondary font-mono animate-pulse">{progressMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
}
