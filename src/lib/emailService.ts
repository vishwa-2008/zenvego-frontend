// Zenvego Direct Real Email Service - Using Local OTP Bot
export async function sendRealEmailOtp(email: string, otp: string, userName?: string): Promise<boolean> {
  try {
    const params = new URLSearchParams();
    params.append('email', email);
    params.append('username', userName || email.split('@')[0]);

    const res = await fetch('http://localhost:8080/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log('✅ OTP email sent successfully to:', email);
      return true;
    } else {
      const errorData = await res.json().catch(() => ({}));
      console.warn('⚠️ OTP Server rejected email:', errorData);
      return false;
    }
  } catch (e) {
    console.warn('⚠️ OTP Server connection failed:', e);
    return false;
  }
}
