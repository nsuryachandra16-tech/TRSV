import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { query } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('🚨 FATAL: JWT_SECRET is not configured. Auth module cannot operate.');
  process.exit(1);
}

// PBKDF2/SHA-512 Secure Salting & Password Hashing Engine
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  // Support both old (1000) and new (10000) iteration hashes
  let hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  if (hash !== originalHash) {
    hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  }
  return hash === originalHash;
}

// Load administrator credentials from environment (no hardcoded fallbacks)
let credentials = {
  supreme_admin: { 
    email: process.env.SUPREME_EMAIL || '', 
    password: process.env.SUPREME_PASSWORD || '' 
  }
};

try {
  const credPath = path.join(__dirname, '../config/admin_credentials.json');
  if (fs.existsSync(credPath)) {
    credentials = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
  }
} catch (err) {
  console.warn('⚠️ [Auth Config] Could not parse admin_credentials.json, using defaults.');
}

const SUPREME_EMAIL = credentials.supreme_admin.email;
const SUPREME_PASSWORD = credentials.supreme_admin.password;

// Global in-memory storage for transient Email OTPs
if (!global.emailOtps) {
  global.emailOtps = {};
}

/**
 * Endpoint to trigger and dispatch Email Verification OTP
 */
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  
  // Generate secure 6-digit OTP code
  const otpCode = (Math.floor(100000 + Math.random() * 900000)).toString();
  
  // Save OTP code in global session store (expires in 10 minutes)
  global.emailOtps[cleanEmail] = {
    code: otpCode,
    expiresAt: Date.now() + 10 * 60 * 1000
  };

  console.log(`🔑 [Email OTP] Generated code ${otpCode} for student node: ${cleanEmail}`);

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.error('🚨 [Email OTP] SMTP server credentials are missing in environmental configurations.');
    return res.status(500).json({ 
      success: false, 
      message: 'SMTP email server is currently unconfigured in the environment. Verification codes cannot be dispatched.' 
    });
  }

  try {
    const nodemailerModule = await import('nodemailer');
    const nodemailer = nodemailerModule.default || nodemailerModule;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      connectionTimeout: 10000, // 10 seconds timeout
      greetingTimeout: 10000,   // 10 seconds greeting timeout
      socketTimeout: 15000,     // 15 seconds socket timeout
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"TRSV Security Grid" <${process.env.SMTP_SENDER || smtpUser}>`,
      to: cleanEmail,
      subject: `[TRSV] Your Student Verification Code: ${otpCode}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #06b6d4; margin: 0;">TRSV Governance Grid</h2>
            <span style="font-size: 10px; font-weight: bold; color: #64748b; letter-spacing: 1px; text-transform: uppercase;">Telangana Rakshana Sena Vidyarthi</span>
          </div>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">Hello Student,</p>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">To verify your email address and authorize your campus advocacy node on the live Neon database, please enter the following 6-digit verification code:</p>
          <div style="text-align: center; margin: 25px 0;">
            <span style="font-size: 32px; font-weight: 900; color: #0f172a; letter-spacing: 6px; background-color: #f1f5f9; padding: 12px 24px; border-radius: 8px; border: 1px solid #cbd5e1; display: inline-block;">${otpCode}</span>
          </div>
          <p style="font-size: 11px; color: #64748b; text-align: center;">This code is highly sensitive and will expire in 10 minutes. If you did not request this, please disregard this email.</p>
          <div style="border-top: 1px solid #f1f5f9; margin-top: 20px; padding-top: 10px; text-align: center;">
            <span style="font-size: 10px; color: #94a3b8;">TRSV Statewide Student Protection Ecosystem © 2026</span>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✉️ [Email OTP] Real SMTP message successfully dispatched to: ${cleanEmail}`);
    return res.json({ success: true, message: 'A secure verification code has been dispatched to your email address.' });
  } catch (mailError) {
    console.error('🚨 [Email OTP] SMTP dispatch failed:', mailError.message);
    return res.status(500).json({ 
      success: false, 
      message: `Failed to dispatch verification email: ${mailError.message}. Please verify your SMTP server details.` 
    });
  }
});

/**
 * Endpoint to verify the student's Email OTP code
 */
router.post('/verify-otp', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ success: false, message: 'Email and verification code are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // OTP master code bypasses have been permanently removed for production security

  const record = global.emailOtps[cleanEmail];

  if (!record) {
    return res.status(400).json({ success: false, message: 'No verification request active for this email.' });
  }

  if (Date.now() > record.expiresAt) {
    delete global.emailOtps[cleanEmail];
    return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new OTP.' });
  }

  if (record.code !== code.trim()) {
    return res.status(400).json({ success: false, message: 'Invalid 6-digit verification code.' });
  }

  // Verification successful! Clean the store
  delete global.emailOtps[cleanEmail];
  console.log(`✅ [Email OTP] Email verified successfully for student: ${cleanEmail}`);
  res.json({ success: true, message: 'Email verified successfully. Campus node authorized!' });
});

/**
 * 1. Register a new user completely inside PostgreSQL
 */
router.post('/signup', async (req, res) => {
  const { fullName, email, password, phone, constituencyId, collegeId, collegeName, role, profileImage } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ success: false, message: 'Missing core identity parameters.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    // Audit check if user email already exists
    const checkEmail = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email address already exists.' });
    }

    // 1. Resolve collegeId if collegeName is provided dynamically
    let resolvedCollegeId = collegeId || null;

    if (!resolvedCollegeId && collegeName && constituencyId) {
      const trimmedName = collegeName.trim();
      const colCheck = await query(
        'SELECT id FROM colleges WHERE LOWER(college_name) = LOWER($1) AND constituency_id = $2',
        [trimmedName, parseInt(constituencyId)]
      );

      if (colCheck.rows.length > 0) {
        resolvedCollegeId = colCheck.rows[0].id;
      } else {
        // Create new academic node on the fly!
        const newCol = await query(
          'INSERT INTO colleges (college_name, constituency_id) VALUES ($1, $2) RETURNING id',
          [trimmedName, parseInt(constituencyId)]
        );
        resolvedCollegeId = newCol.rows[0].id;
      }
    }

    let userRole = role || 'student';
    // Students cannot register as supreme_admin or other administrative roles directly on signup
    if (userRole === 'supreme_admin' || userRole === 'president' || userRole === 'state_president') {
      userRole = 'student';
    }

    // Generate secure local unique ID and password hash
    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);

    // Insert new user record into Neon Postgres
    const insertResult = await query(
      `INSERT INTO users (id, full_name, email, password_hash, role, constituency_id, college_id, phone, profile_image, verified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [userId, fullName, cleanEmail, passwordHash, userRole, constituencyId || null, resolvedCollegeId, phone || null, profileImage || null, true]
    );

    // Generate JWT token with 7-day expiry
    const token = jwt.sign(
      { uid: userId, email: cleanEmail, role: userRole, name: fullName },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Write audit log
    await query('INSERT INTO realtime_activity_logs (user_id, activity_type, details) VALUES ($1, $2, $3)', [
      userId,
      'SIGNUP',
      `Student profile created and authenticated locally via JWT`
    ]);

    res.status(201).json({ success: true, message: 'Identity registered and verified successfully.', token, user: insertResult.rows[0] });
  } catch (error) {
    console.error('🚨 [Local Signup Error]:', error.message);
    res.status(500).json({ success: false, message: 'Database registration failed.', error: error.message });
  }
});

/**
 * 2. Authenticate a student using standard email/password credentials
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Try supreme administrative authentication dynamically first
    if (cleanEmail === SUPREME_EMAIL.toLowerCase() && password === SUPREME_PASSWORD) {
      await query(`
        INSERT INTO users (id, full_name, email, role, verified)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE 
        SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, role = EXCLUDED.role, verified = EXCLUDED.verified
      `, ['SUPREME_ADMIN_UID', 'Supreme Leader', SUPREME_EMAIL, 'supreme_admin', true]);

      const token = jwt.sign(
        { uid: 'SUPREME_ADMIN_UID', email: SUPREME_EMAIL, role: 'supreme_admin', name: 'Supreme Leader' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log('👑 [Supreme Auth] Supreme Admin connected successfully.');

      await query('INSERT INTO realtime_activity_logs (user_id, activity_type, details) VALUES ($1, $2, $3)', [
        'SUPREME_ADMIN_UID',
        'SUPREME_LOGIN',
        'Supreme Admin terminal session synchronized'
      ]);

      return res.json({
        success: true,
        token,
        user: {
          id: 'SUPREME_ADMIN_UID',
          full_name: 'Supreme Leader',
          email: SUPREME_EMAIL,
          role: 'supreme_admin',
          verified: true,
          constituency_name: 'Statewide Headquarters',
          college_name: 'Central Control Command'
        }
      });
    }

    // 2. Query standard student profile from PostgreSQL
    const userQuery = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
    if (userQuery.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'No registered user found with this email address.' });
    }

    const user = userQuery.rows[0];

    // Verify hashed password
    if (!user.password_hash) {
      return res.status(401).json({ success: false, message: 'This account does not have local credentials configured.' });
    }

    const isPasswordCorrect = verifyPassword(password, user.password_hash);
    if (!isPasswordCorrect) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Generate JWT token with 7-day expiry
    const token = jwt.sign(
      { uid: user.id, email: user.email, role: user.role, name: user.full_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Fetch complete hydrated profile
    const profile = await query(
      `SELECT u.*, con.constituency_name, con.district, con.parent_id as constituency_parent_id, col.college_name 
       FROM users u
       LEFT JOIN constituencies con ON u.constituency_id = con.id
       LEFT JOIN colleges col ON u.college_id = col.id
       WHERE u.id = $1`,
      [user.id]
    );

    await query('INSERT INTO realtime_activity_logs (user_id, activity_type, details) VALUES ($1, $2, $3)', [
      user.id,
      'LOGIN',
      'Student authenticated successfully via local authority'
    ]);

    res.json({ success: true, token, user: profile.rows[0] });
  } catch (error) {
    console.error('🚨 [Local Login Error]:', error.message);
    res.status(500).json({ success: false, message: 'Authentication failed.', error: error.message });
  }
});

// /supreme-login endpoint has been permanently removed for production security

/**
 * 3. Verify Active Client Token and return fully hydrated profile
 */
router.get('/profile', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No authorization header provided.' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedUser = jwt.verify(token, JWT_SECRET);

    // Retrieve user and join location names from PostgreSQL
    const profile = await query(
      `SELECT u.*, con.constituency_name, con.district, con.parent_id as constituency_parent_id, col.college_name 
       FROM users u
       LEFT JOIN constituencies con ON u.constituency_id = con.id
       LEFT JOIN colleges col ON u.college_id = col.id
       WHERE u.id = $1`,
      [decodedUser.uid]
    );

    if (profile.rows.length === 0) {
      return res.json({ success: false, code: 'PROFILE_NOT_FOUND', message: 'User profile not found in database.' });
    }

    res.json({ success: true, user: profile.rows[0] });
  } catch (error) {
    console.error('🚨 [Auth Profile Error]:', error.message);
    res.status(401).json({ success: false, message: 'Authentication session expired or invalid.', error: error.message });
  }
});

/**
 * 3.5 Silent Token Refresh — issues a fresh 7d JWT for any valid (non-expired) existing token
 * Called by the client proactively when the token is close to expiry or on every app startup
 */
router.post('/refresh', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No authorization header provided.' });
  }

  const oldToken = authHeader.split('Bearer ')[1];

  try {
    const decoded = jwt.verify(oldToken, JWT_SECRET);

    // Issue a brand-new 7-day token with same claims
    const newToken = jwt.sign(
      { uid: decoded.uid, email: decoded.email, role: decoded.role, name: decoded.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`🔄 [Auth Refresh] Token refreshed for uid: ${decoded.uid}`);
    return res.json({ success: true, token: newToken });
  } catch (error) {
    // Token is already expired or invalid — cannot refresh, must re-login
    console.warn(`⚠️ [Auth Refresh] Refresh failed: ${error.message}`);
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
});

/**
 * 4. Dynamically update the student's college campus and constituency coordinates inside the dashboard
 */
router.post('/update-college', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Unauthorized session.' });
  }
  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedUser = jwt.verify(token, JWT_SECRET);
    const { collegeName, constituencyId } = req.body;

    if (!collegeName || !constituencyId) {
      return res.status(400).json({ success: false, message: 'College name and constituency mapping are required.' });
    }

    // Resolve or create collegeId
    let resolvedCollegeId = null;
    const trimmedName = collegeName.trim();
    const colCheck = await query(
      'SELECT id FROM colleges WHERE LOWER(college_name) = LOWER($1) AND constituency_id = $2',
      [trimmedName, parseInt(constituencyId)]
    );

    if (colCheck.rows.length > 0) {
      resolvedCollegeId = colCheck.rows[0].id;
    } else {
      // Create new academic node on the fly!
      const newCol = await query(
        'INSERT INTO colleges (college_name, constituency_id) VALUES ($1, $2) RETURNING id',
        [trimmedName, parseInt(constituencyId)]
      );
      resolvedCollegeId = newCol.rows[0].id;
    }

    // Update user
    await query(
      `UPDATE users 
       SET college_id = $1, constituency_id = $2, updated_at = NOW() 
       WHERE id = $3`,
      [resolvedCollegeId, parseInt(constituencyId), decodedUser.uid]
    );

    // Fetch refreshed complete profile
    const profile = await query(
      `SELECT u.*, con.constituency_name, con.district, col.college_name 
       FROM users u
       LEFT JOIN constituencies con ON u.constituency_id = con.id
       LEFT JOIN colleges col ON u.college_id = col.id
       WHERE u.id = $1`,
      [decodedUser.uid]
    );

    // Write audit log
    await query('INSERT INTO realtime_activity_logs (user_id, activity_type, details) VALUES ($1, $2, $3)', [
      decodedUser.uid,
      'PROFILE_MAP_UPDATE',
      `Campus pinned dynamically: ${trimmedName} bound to constituency #${constituencyId}`
    ]);

    res.json({ success: true, message: 'Campus geo-coordinates saved successfully!', user: profile.rows[0] });
  } catch (error) {
    console.error('🚨 [Update College Error]:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update campus coordinates.', error: error.message });
  }
});

/**
 * Endpoint to trigger student password recovery OTP
 */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // 1. Check if email corresponds to an administrative role or is the supreme email
  if (cleanEmail === SUPREME_EMAIL.toLowerCase() || cleanEmail === 'admin@trsv.gov.in' || cleanEmail === 'admin@trsv.gov.in') {
    return res.status(400).json({
      success: false,
      message: 'For safety purposes, admin credentials cannot be changed. Please contact Developer Suryachandra.'
    });
  }

  try {
    // Check if the user exists and is a student
    const checkUser = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No registered account found with this email address.' });
    }

    const user = checkUser.rows[0];
    if (user.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'For safety purposes, admin credentials cannot be changed. Please contact Developer Suryachandra.'
      });
    }

    // Generate secure 6-digit Reset OTP
    const otpCode = (Math.floor(100000 + Math.random() * 900000)).toString();

    // Store OTP in database directly to survive server restarts/sleeps!
    await query(
      `UPDATE users 
       SET reset_otp = $1, reset_otp_expires_at = NOW() + INTERVAL '15 minutes' 
       WHERE LOWER(email) = LOWER($2)`,
      [otpCode, cleanEmail]
    );

    console.log(`🔑 [Password Reset OTP] Generated code ${otpCode} and stored in DB for student: ${cleanEmail}`);

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      console.error('🚨 [Password Reset OTP] SMTP server credentials missing.');
      return res.status(500).json({
        success: false,
        message: 'SMTP email server is currently unconfigured in the environment. Verification codes cannot be dispatched.'
      });
    }

    const nodemailerModule = await import('nodemailer');
    const nodemailer = nodemailerModule.default || nodemailerModule;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"TRSV Security Grid" <${process.env.SMTP_SENDER || smtpUser}>`,
      to: cleanEmail,
      subject: `[TRSV] Your Password Reset OTP Code: ${otpCode}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #e11d48; margin: 0;">TRSV Password Recovery</h2>
            <span style="font-size: 10px; font-weight: bold; color: #64748b; letter-spacing: 1px; text-transform: uppercase;">Telangana Rakshana Sena Vidyarthi</span>
          </div>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">Hello Student,</p>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">A password reset request was initialized for your campus node. To complete your recovery and set a new password, please enter the following 6-digit verification code in the recovery portal:</p>
          <div style="text-align: center; margin: 25px 0;">
            <span style="font-size: 32px; font-weight: 900; color: #e11d48; letter-spacing: 6px; background-color: #f1f5f9; padding: 12px 24px; border-radius: 8px; border: 1px solid #cbd5e1; display: inline-block;">${otpCode}</span>
          </div>
          <p style="font-size: 11px; color: #64748b; text-align: center;">This code is highly sensitive and will expire in 15 minutes. If you did not request this, please disregard this email or contact developer: Suryachandra.</p>
          <div style="border-top: 1px solid #f1f5f9; margin-top: 20px; padding-top: 10px; text-align: center;">
            <span style="font-size: 10px; color: #94a3b8;">TRSV Statewide Student Protection Ecosystem © 2026</span>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✉️ [Password Reset OTP] SMTP reset message successfully dispatched to: ${cleanEmail}`);
    return res.json({ success: true, message: 'A secure password recovery verification code has been dispatched to your email address.' });
  } catch (error) {
    console.error('🚨 [Password Reset OTP Error]:', error.message);
    res.status(500).json({ success: false, message: 'Failed to dispatch recovery email: ' + error.message });
  }
});

/**
 * Endpoint to verify OTP and reset student password
 */
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ success: false, message: 'Missing parameters. Email, OTP code, and new password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    // Check if the user exists, matches role, and has the stored reset_otp
    const userQuery = await query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND role = $2',
      [cleanEmail, 'student']
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student account not found or unauthorized.' });
    }

    const user = userQuery.rows[0];

    if (!user.reset_otp || user.reset_otp !== code.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid 6-digit recovery code.' });
    }

    if (new Date() > new Date(user.reset_otp_expires_at)) {
      // Clear expired OTP
      await query(
        'UPDATE users SET reset_otp = NULL, reset_otp_expires_at = NULL WHERE id = $1',
        [user.id]
      );
      return res.status(400).json({ success: false, message: 'Recovery verification code has expired. Please request a new code.' });
    }

    // Generate new secure password hash
    const passwordHash = hashPassword(newPassword);

    // Update password and clear reset fields in Neon PostgreSQL database
    await query(
      `UPDATE users 
       SET password_hash = $1, reset_otp = NULL, reset_otp_expires_at = NULL, updated_at = NOW() 
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    // Write audit log
    await query('INSERT INTO realtime_activity_logs (user_id, activity_type, details) VALUES ($1, $2, $3)', [
      user.id,
      'PASSWORD_RESET',
      'Student account access credentials updated and reset successfully via DB-backed OTP'
    ]);

    console.log(`✅ [Password Reset Success] Password reset successfully for student: ${cleanEmail}`);
    res.json({ success: true, message: 'Your password has been successfully reset! You can now log in with your new password.' });
  } catch (error) {
    console.error('🚨 [Password Reset Error]:', error.message);
    res.status(500).json({ success: false, message: 'Database query failed.', error: error.message });
  }
});

export default router;
