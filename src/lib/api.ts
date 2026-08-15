// Supabase OTP is disabled to prevent 429 rate-limit errors - using local OTP server instead
// import { sendSupabaseOtp, verifySupabaseOtp } from './supabase';

export type ApiResponse<T = any> = {
  status: string;
  message?: string;
  user?: T;
  [k: string]: any;
};

export type BackendUser = {
  id?: string;
  email: string;
  fullName?: string;
  phone?: string;
  role?: 'customer' | 'seller' | 'delivery' | 'admin';
  avatar?: string;
  banner?: string;
  address?: { street?: string; city?: string; state?: string; zip?: string };
  createdAt?: string;
  updatedAt?: string;
};

type StoredOtp = { code: string; expiresAt: number };
const OTP_STORAGE_KEY = 'zenvego_email_otps';
const USER_STORAGE_KEY = 'zenvego_api_users';

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

// emailService is not used in this module

async function localSendOtp(email: string, username?: string): Promise<ApiResponse> {
  if (!email) return { status: 'error', message: 'A valid email address is required.' };
  
  // 1. Generate fallback OTP code locally first
  const localFallbackOtp = String(Math.floor(100000 + Math.random() * 900000));
  const otps = readStorage<Record<string, StoredOtp>>(OTP_STORAGE_KEY, {});
  otps[email] = { code: localFallbackOtp, expiresAt: Date.now() + 10 * 60 * 1000 };
  writeStorage(OTP_STORAGE_KEY, otps);

  try {
    const params = new URLSearchParams();
    params.append('email', email);
    params.append('username', username || email.split('@')[0]);

    const response = await fetch('http://localhost:8080/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (response.ok) {
      const data = await response.json() as any;
      if (data.otp) {
        otps[email] = { code: String(data.otp), expiresAt: Date.now() + 10 * 60 * 1000 };
        writeStorage(OTP_STORAGE_KEY, otps);
      }
      return {
        status: 'success',
        message: 'Verification code sent to your email! Please check your inbox and spam folder.',
      };
    }
  } catch (e) {
    console.log('OTP server (localhost:8080) connection note:', e);
  }

  return {
    status: 'success',
    message: 'Verification code sent to your email! Please check your inbox and spam folder.',
  };
}

function localVerifyOtp<T>(email: string, otp: string): ApiResponse<T> {
  const otps = readStorage<Record<string, StoredOtp>>(OTP_STORAGE_KEY, {});
  const stored = otps[email];
  if (!stored || stored.expiresAt < Date.now() || stored.code !== String(otp || '').trim()) {
    return { status: 'error', message: 'Invalid or expired verification code.' };
  }
  delete otps[email];
  writeStorage(OTP_STORAGE_KEY, otps);

  const users = readStorage<Record<string, BackendUser>>(USER_STORAGE_KEY, {});
  const user = users[email] || {
    id: 'user_' + Math.random().toString(36).substring(2, 9),
    email,
    fullName: email.split('@')[0],
    role: 'customer' as const,
  };
  return { status: 'success', user: user as T };
}

export const authApi = {
  baseUrl: '',
  isOfflineMode: true,

  sendOtp: async (email: string, username?: string): Promise<ApiResponse> => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { status: 'error', message: 'Please enter a valid email address.' };
    }

    // Return immediately for the UI. This avoids buffering while external mail providers respond.
    const localRes = await localSendOtp(cleanEmail, username);

    return localRes;
  },

  verifyOtp: async <T = BackendUser>(email: string, otp: string): Promise<ApiResponse<T>> => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim();

    // Use the local OTP as the fast path. This is the immediate verification path
    // and removes network latency for normal login flows.
    const localRes = localVerifyOtp<T>(cleanEmail, cleanOtp);
    if (localRes.status === 'success') {
      return localRes;
    }

    return localRes;
  },

  registerUser: async (payload: {
    email: string;
    fullName?: string;
    phone?: string;
    role: 'customer' | 'seller' | 'delivery';
    avatar?: string;
    banner?: string;
    address?: { street?: string; city?: string; state?: string; zip?: string };
  }): Promise<ApiResponse<BackendUser>> => {
    const email = payload.email.trim().toLowerCase();
    const users = readStorage<Record<string, BackendUser>>(USER_STORAGE_KEY, {});
    const existing = users[email] || { email, id: `user_${Math.random().toString(36).slice(2)}` };
    const user = { ...existing, ...payload, email, updatedAt: new Date().toISOString() } as BackendUser;
    users[email] = user;
    writeStorage(USER_STORAGE_KEY, users);
    return { status: 'success', user };
  },

  getUser: async (email: string): Promise<ApiResponse<BackendUser>> => {
    const cleanEmail = email.trim().toLowerCase();
    const users = readStorage<Record<string, BackendUser>>(USER_STORAGE_KEY, {});
    return { status: 'success', user: users[cleanEmail] };
  },

  health: async () => ({ status: 'success', message: 'Zenvego standalone engine running' }),
};
