import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (
  (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : undefined) ||
  'https://ejpbgbzdfsobmimojljc.supabase.co'
).trim();

const supabaseAnonKey = (
  (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_ANON_KEY : undefined) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcGJnYnpkZnNvYm1pbW9qbGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MzEwNDAsImV4cCI6MjAyNTQzMjAwMH0.dummy'
).trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function sendSupabaseOtp(email: string) {
  try {
    const timeoutPromise = new Promise<{ status: string; message: string }>((resolve) =>
      setTimeout(() => resolve({ status: 'timeout', message: 'Fast fallback' }), 1200)
    );

    const apiPromise = (async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });
      if (error) {
        return { status: 'error', message: error.message };
      }
      return { status: 'success', message: 'Verification email sent via Supabase Auth!' };
    })();

    const result = await Promise.race([apiPromise, timeoutPromise]);
    if (result.status === 'timeout') {
      return { status: 'error', message: 'Supabase request timed out' };
    }
    return result;
  } catch (err: any) {
    return { status: 'error', message: err?.message || 'Supabase Auth request failed' };
  }
}

export async function verifySupabaseOtp(email: string, token: string) {
  try {
    const timeoutPromise = new Promise<{ status: string; user?: any; message?: string }>((resolve) =>
      setTimeout(() => resolve({ status: 'timeout', message: 'Fast fallback' }), 1200)
    );

    const apiPromise = (async () => {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) {
        return { status: 'error', message: error.message };
      }
      return {
        status: 'success',
        user: {
          id: data.user?.id,
          email: data.user?.email || email,
          fullName: data.user?.user_metadata?.full_name || email.split('@')[0],
          role: 'customer' as const,
        },
      };
    })();

    const result = await Promise.race([apiPromise, timeoutPromise]);
    if (result.status === 'timeout') {
      return { status: 'error', message: 'Supabase verification timed out' };
    }
    return result;
  } catch (err: any) {
    return { status: 'error', message: err?.message || 'Supabase OTP verification failed' };
  }
}
