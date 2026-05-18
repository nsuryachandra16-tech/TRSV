import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const devEmail = 'nimmagaddasurya4@gmail.com';
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

console.log('Testing SMTP connection with:');
console.log('Host:', process.env.SMTP_HOST || 'smtp.gmail.com');
console.log('Port:', process.env.SMTP_PORT || '587');
console.log('User:', smtpUser);
console.log('Pass:', smtpPass ? '****' : 'MISSING');

if (!smtpUser || !smtpPass) {
  console.error('Error: SMTP credentials missing in .env!');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: { user: smtpUser, pass: smtpPass },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  tls: { rejectUnauthorized: false }
});

transporter.sendMail({
  from: `"TSRV Security Grid" <${process.env.SMTP_SENDER || smtpUser}>`,
  to: devEmail,
  subject: `[TSRV SECURITY GRID] Diagnostic Test Mail`,
  html: `<p>SMTP Verification Test Successful.</p>`
}).then(info => {
  console.log('✅ SMTP Mail Sent Successfully:', info.messageId);
}).catch(err => {
  console.error('🚨 SMTP Mail Failed:', err);
});
