import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.OTP_PORT || process.env.PORT || 8080;

// Store OTPs in memory: email -> { code, expiresAt }
const otpStore = new Map();

// Enable CORS for frontend requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Support both JSON and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Nodemailer Transporter
const emailUser = process.env.EMAIL_FROM || process.env.VITE_BREVO_SENDER || 'vishwabaddam@gmail.com';
const emailPass = process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD || '';

let transporter = null;

if (emailUser && emailPass) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
  console.log(`✉️ Nodemailer initialized with Gmail account: ${emailUser}`);
} else {
  console.log(`⚠️ Email credentials not fully set (EMAIL_FROM & EMAIL_PASSWORD in .env).`);
  console.log(`ℹ️ OTP Server will run in simulation + log mode.`);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'success', message: 'Zenvego OTP Server is healthy', port: PORT });
});

// Send OTP Endpoint
app.post('/send-otp', async (req, res) => {
  const email = (req.body.email || req.query.email || '').toString().trim().toLowerCase();
  const username = (req.body.username || req.query.username || email.split('@')[0]).toString().trim();

  if (!email || !email.includes('@')) {
    return res.status(400).json({ status: 'error', message: 'A valid email address is required.' });
  }

  // Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStore.set(email, { code: otpCode, expiresAt });

  console.log(`\n==================================================`);
  console.log(`🔐 OTP Generated for [${email}]: ${otpCode}`);
  console.log(`==================================================\n`);

  let emailSent = false;

  if (transporter) {
    try {
      const mailOptions = {
        from: `"Zenvego Ecosystem" <${emailUser}>`,
        to: email,
        subject: `Your Zenvego Login OTP Code: ${otpCode}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; rounded-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #0d5c46; font-size: 24px; margin: 0;">🌱 Zenvego Market</h1>
              <p style="color: #7a5743; font-size: 14px; margin-top: 4px;">Neighborhood Secure Access Gateway</p>
            </div>
            <p style="font-size: 15px; color: #333333;">Hello <strong>${username}</strong>,</p>
            <p style="font-size: 14px; color: #555555; line-height: 1.5;">
              Use the following 6-digit verification code to authenticate your session:
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0d5c46; background: #f0fdf4; padding: 12px 24px; border-radius: 12px; border: 1px dashed #158a69; display: inline-block;">
                ${otpCode}
              </span>
            </div>
            <p style="font-size: 12px; color: #888888; text-align: center;">
              This code will expire in 10 minutes. If you did not request this code, please ignore this email.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      emailSent = true;
      console.log(`✅ Email successfully sent to ${email} via SMTP!`);
    } catch (err) {
      console.error(`❌ Error sending email via SMTP:`, err.message);
    }
  }

  return res.json({
    status: 'success',
    otp: otpCode,
    emailSent,
    message: emailSent
      ? `Verification code sent to ${email}.`
      : `Verification code generated for ${email}. Check console/toast.`,
  });
});

// Verify OTP Endpoint
app.post('/verify-otp', (req, res) => {
  const email = (req.body.email || req.query.email || '').toString().trim().toLowerCase();
  const inputOtp = (req.body.otp || req.query.otp || '').toString().trim();

  if (!email || !inputOtp) {
    return res.status(400).json({ status: 'error', message: 'Email and OTP code are required.' });
  }

  const storedData = otpStore.get(email);

  if (!storedData) {
    return res.status(400).json({ status: 'error', message: 'No OTP found for this email. Please request a new one.' });
  }

  if (Date.now() > storedData.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ status: 'error', message: 'OTP has expired. Please request a new code.' });
  }

  if (storedData.code !== inputOtp) {
    return res.status(400).json({ status: 'error', message: 'Invalid OTP code. Please try again.' });
  }

  // Verification successful
  otpStore.delete(email);

  const user = {
    id: 'user_' + Math.random().toString(36).substring(2, 9),
    email,
    fullName: email.split('@')[0],
    role: 'customer',
  };

  return res.json({
    status: 'success',
    message: 'OTP verified successfully.',
    user,
  });
});

const server = app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 ZENVEGO OTP SERVER RUNNING ON PORT ${PORT}`);
  console.log(`👉 http://localhost:${PORT}/health`);
  console.log(`==================================================\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!`);
    console.error(`   The OTP server is probably already running.`);
    console.error(`   To kill it, run: npx kill-port ${PORT}`);
    console.error(`   Then try: npm run server\n`);
    process.exit(0);
  } else {
    throw err;
  }
});
