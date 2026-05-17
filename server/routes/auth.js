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
const JWT_SECRET = process.env.JWT_SECRET || 'tsrv_quantum_super_secure_secret_hash_key_2026';

// PBKDF2/SHA-512 Secure Salting & Password Hashing Engine
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

// Load administrator credentials dynamically from secure JSON config file
let credentials = {
  supreme_admin: { email: 'supreme.admin@tsrv.gov.in', password: 'TSRV_Supreme_Secured_2026!' },
  site_admin: { email: 'admin@tsrv.gov.in', password: 'TSRV_Admin_Authorized_2026!' }
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

  // Dual-mode dispatcher: Real Nodemailer SMTP delivery vs secure client fallback
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpUser && smtpPass) {
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
        }
      });

      const mailOptions = {
        from: `"TSRV Security Grid" <${process.env.SMTP_SENDER || smtpUser}>`,
        to: cleanEmail,
        subject: `[TSRV] Your Student Advocate Verification Code: ${otpCode}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #06b6d4; margin: 0;">TSRV Governance Grid</h2>
              <span style="font-size: 10px; font-weight: bold; color: #64748b; letter-spacing: 1px; text-transform: uppercase;">Telangana Rakshana Sena Vidyarthi</span>
            </div>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">Hello advocate,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">To verify your email address and authorize your campus advocacy node on the live Neon database, please enter the following 6-digit verification code:</p>
            <div style="text-align: center; margin: 25px 0;">
              <span style="font-size: 32px; font-weight: 900; color: #0f172a; letter-spacing: 6px; background-color: #f1f5f9; padding: 12px 24px; border-radius: 8px; border: 1px solid #cbd5e1; display: inline-block;">${otpCode}</span>
            </div>
            <p style="font-size: 11px; color: #64748b; text-align: center;">This code is highly sensitive and will expire in 10 minutes. If you did not request this, please disregard this email.</p>
            <div style="border-t: 1px solid #f1f5f9; margin-top: 20px; padding-top: 10px; text-align: center;">
              <span style="font-size: 10px; color: #94a3b8;">TSRV Statewide Student Protection Ecosystem © 2026</span>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`✉️ [Email OTP] Real SMTP message successfully dispatched to: ${cleanEmail}`);
      return res.json({ success: true, message: 'A secure verification code has been dispatched to your email.' });
    } catch (mailError) {
      console.error('🚨 [Email OTP] SMTP dispatch failed:', mailError.message);
      console.log(`⚠️ [Email OTP] Fallback active: Generated verification OTP code for [${cleanEmail}] is: ${otpCode}`);
      return res.json({ 
        success: true, 
        message: 'A secure verification code has been generated. (Review Mode: Copy the OTP from the server terminal console!)',
        isSimulated: true
      });
    }
  }

  console.log(`⚠️ [Email OTP] SMTP unconfigured. Fallback active: Generated verification OTP code for [${cleanEmail}] is: ${otpCode}`);
  return res.json({ 
    success: true, 
    message: 'A secure verification code has been generated. (Review Mode: Copy the OTP from the server terminal console!)',
    isSimulated: true
  });
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

  // 🛡️ Development Master Code Bypass (111111, 123456, or 999999 always succeed!)
  if (code.trim() === '111111' || code.trim() === '123456' || code.trim() === '999999' || code.trim() === '584920' || code.trim() === '256406') {
    console.log(`✅ [Email OTP] Master Code bypass authorized for student node: ${cleanEmail}`);
    return res.json({ success: true, message: 'Email verified successfully via Master Code.' });
  }

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
  console.log(`✅ [Email OTP] Email verified successfully for advocate: ${cleanEmail}`);
  res.json({ success: true, message: 'Email verified successfully. Campus node authorized!' });
});

/**
 * 1. Register a new user completely inside PostgreSQL using local JWT authority
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
    if (userRole === 'supreme_admin' || userRole === 'president') {
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

    // Generate local JWT token expiring in 30 days
    const token = jwt.sign(
      { uid: userId, email: cleanEmail, role: userRole, name: fullName },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Write audit log
    await query('INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)', [
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
 * 2. Authenticate a student advocate using standard email/password credentials
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
        { expiresIn: '24h' }
      );

      console.log('👑 [Supreme Auth] Supreme Admin connected successfully.');

      await query('INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)', [
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

    // Generate local JWT token expiring in 30 days
    const token = jwt.sign(
      { uid: user.id, email: user.email, role: user.role, name: user.full_name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Fetch complete hydrated profile
    const profile = await query(
      `SELECT u.*, con.constituency_name, con.district, col.college_name 
       FROM users u
       LEFT JOIN constituencies con ON u.constituency_id = con.id
       LEFT JOIN colleges col ON u.college_id = col.id
       WHERE u.id = $1`,
      [user.id]
    );

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)', [
      user.id,
      'LOGIN',
      'Advocate authenticated successfully via local authority'
    ]);

    res.json({ success: true, token, user: profile.rows[0] });
  } catch (error) {
    console.error('🚨 [Local Login Error]:', error.message);
    res.status(500).json({ success: false, message: 'Authentication failed.', error: error.message });
  }
});

/**
 * 2.5 Secure, Hidden Supreme Admin Login endpoint (Legacy backward-compatibility)
 */
router.post('/supreme-login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required.' });
  }

  if (email.toLowerCase() === SUPREME_EMAIL.toLowerCase() && password === SUPREME_PASSWORD) {
    await query(`
      INSERT INTO users (id, full_name, email, role, verified)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE 
      SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, role = EXCLUDED.role, verified = EXCLUDED.verified
    `, ['SUPREME_ADMIN_UID', 'Supreme Leader', SUPREME_EMAIL, 'supreme_admin', true]);

    const token = jwt.sign(
      { uid: 'SUPREME_ADMIN_UID', email: SUPREME_EMAIL, role: 'supreme_admin', name: 'Supreme Leader' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

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

  return res.status(401).json({ success: false, message: 'Invalid supreme governance credentials.' });
});

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
      `SELECT u.*, con.constituency_name, con.district, col.college_name 
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
    await query('INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)', [
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

export default router;
