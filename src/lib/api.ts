const configuredBaseUrl = typeof import.meta.env !== 'undefined'
  ? import.meta.env.VITE_API_BASE_URL?.trim()
  : undefined;

// This is a frontend-only project. Do not call an assumed local server: it
// causes connection-refused errors unless a backend is explicitly configured.
const BASE_URL = configuredBaseUrl || '';
const isOfflineMode = !BASE_URL;
const OTP_STORAGE_KEY = 'zenvego_email_otps';
const USER_STORAGE_KEY = 'zenvego_api_users';

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

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function offlineRequest<T>(path: string, opts: RequestInit): ApiResponse<T> {
  const body = opts.body ? JSON.parse(String(opts.body)) : {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const users = readStorage<Record<string, BackendUser>>(USER_STORAGE_KEY, {});

  if (path === '/health') return { status: 'success', message: 'Offline mode active' };

  if (path === '/send-otp') {
    if (!email) return { status: 'error', message: 'A valid email address is required.' };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const otps = readStorage<Record<string, StoredOtp>>(OTP_STORAGE_KEY, {});
    otps[email] = { code, expiresAt: Date.now() + 10 * 60 * 1000 };
    writeStorage(OTP_STORAGE_KEY, otps);
    return { status: 'success', message: `Offline demo code: ${code}. Configure VITE_API_BASE_URL to send real email.` };
  }

  if (path === '/verify-otp') {
    const otps = readStorage<Record<string, StoredOtp>>(OTP_STORAGE_KEY, {});
    const otp = otps[email];
    if (!otp || otp.expiresAt < Date.now() || otp.code !== String(body.otp || '').trim()) {
      return { status: 'error', message: 'Invalid or expired verification code.' };
    }
    delete otps[email];
    writeStorage(OTP_STORAGE_KEY, otps);
    return { status: 'success', user: (users[email] || { email }) as T };
  }

  if (path === '/register-user') {
    if (!email) return { status: 'error', message: 'A valid email address is required.' };
    const existing = users[email] || { email, id: `user_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}` };
    const user = { ...existing, ...body, email, updatedAt: new Date().toISOString() } as BackendUser;
    users[email] = user;
    writeStorage(USER_STORAGE_KEY, users);
    return { status: 'success', user: user as T };
  }

  if (path.startsWith('/user')) {
    const requestedEmail = new URLSearchParams(path.split('?')[1] || '').get('email')?.trim().toLowerCase();
    return { status: 'success', user: (requestedEmail ? users[requestedEmail] : undefined) as T };
  }

  return { status: 'error', message: 'Unsupported offline API request.' };
}

async function request<T = any>(
  path: string,
  opts: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    if (isOfflineMode) return offlineRequest<T>(path, opts);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((opts.headers as Record<string, string>) || {}),
    };
    const res = await fetch(`${BASE_URL}${path}`, {
      ...opts,
      headers,
    });
    if (!res.ok && res.status >= 500) {
      return {
        status: 'error',
        message: `Server error (${res.status})`,
      };
    }
    const data = await res.json();
    return data as ApiResponse<T>;
  } catch (err: any) {
    return {
      status: 'error',
      message: err?.message || 'Network error connecting to backend',
    };
  }
}

export const authApi = {
  baseUrl: BASE_URL,
  isOfflineMode,

  sendOtp: (email: string, username?: string) =>
    request('/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email, username }),
    }),

  verifyOtp: (email: string, otp: string) =>
    request<BackendUser>('/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),

  registerUser: (payload: {
    email: string;
    fullName?: string;
    phone?: string;
    role: 'customer' | 'seller' | 'delivery';
    avatar?: string;
    banner?: string;
    address?: { street?: string; city?: string; state?: string; zip?: string };
  }) =>
    request<BackendUser>('/register-user', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getUser: (email: string) =>
    request<BackendUser>(`/user?email=${encodeURIComponent(email)}`),

  health: () => request('/health'),
};
