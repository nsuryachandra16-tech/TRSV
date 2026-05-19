import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Import config and routes
import pool from './config/db.js';
import authRouter from './routes/auth.js';
import constituencyRouter from './routes/constituencies.js';
import collegeRouter from './routes/colleges.js';
import complaintRouter from './routes/complaints.js';
import announcementRouter from './routes/announcements.js';
import dashboardRouter from './routes/dashboards.js';
import analyticsRouter from './routes/analytics.js';
import transparencyRouter from './routes/transparency.js';
import emergencyRouter from './routes/emergency.js';
import realtimeRouter from './routes/realtime.js';
import searchRouter from './routes/search.js';
import telemetryRouter from './routes/telemetry.js';
import automationRouter, { runAutoEscalationJob } from './routes/automation.js';
import identityRouter from './routes/identity.js';
import chatRouter from './routes/chat.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Enable JSON parsers
app.use(cors());
app.use(express.json({ limit: '10kb' })); // Mitigate payload attacks

// Enterprise Security Hardening with Leaflet CSP Whitelist Exceptions
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com"],
      imgSrc: [
        "'self'", 
        "data:", 
        "https://unpkg.com", 
        "https://*.tile.openstreetmap.org", 
        "https://tile.openstreetmap.org", 
        "https://api.qrserver.com",
        "https://*.supabase.co",
        "https://*.googleusercontent.com",
        "https://firebasestorage.googleapis.com",
        "https://*.unsplash.com"
      ],
      connectSrc: [
        "'self'", 
        "ws:",
        "wss:",
        "https://*.tile.openstreetmap.org", 
        "https://tile.openstreetmap.org",
        "https://unpkg.com",
        "https://*.supabase.co",
        "https://*.googleapis.com",
        "https://*.firebaseio.com"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "data:"],
      upgradeInsecureRequests: []
    }
  }
}));
app.use(xss());

// Advanced DDOS & Brute-Force Protection Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 reqs per 15 min
  message: { success: false, message: 'Strict DDOS protection active. Too many requests. Please wait 15 minutes.' }
});
app.use('/api', apiLimiter);

// Request logging middleware for telemetry auditing
app.use((req, res, next) => {
  console.log(`📡 [API Call] ${req.method} ${req.url}`);
  next();
});

// Register API Sub-Modules
app.use('/api/auth', authRouter);
app.use('/api/constituencies', constituencyRouter);
app.use('/api/colleges', collegeRouter);
app.use('/api/complaints', complaintRouter);
app.use('/api/announcements', announcementRouter);
app.use('/api/dashboards', dashboardRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/transparency', transparencyRouter);
app.use('/api/emergency', emergencyRouter);
app.use('/api/realtime', realtimeRouter);
app.use('/api/search', searchRouter);
app.use('/api/telemetry', telemetryRouter);
app.use('/api/automation', automationRouter);
app.use('/api/identity', identityRouter);
app.use('/api/chat', chatRouter);

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbCheck = await pool.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      service: 'TSRV Governance Core Node',
      database: 'connected',
      timestamp: dbCheck.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'degraded',
      service: 'TSRV Governance Core Node',
      database: 'disconnected',
      error: error.message
    });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static assets in production
app.use(express.static(path.join(__dirname, '../dist')));

// Fallback all non-API paths to index.html for client-side routing
app.get('*', (req, res) => {
  if (req.url.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API route not found.' });
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 [Server Error]:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred on governance node.',
    error: err.message
  });
});

// Configure Socket.io real-time event routing
io.on('connection', (socket) => {
  console.log(`🔌 [Socket.io] New telemetry node linked: ${socket.id}`);

  // 1. Join Chat Room
  socket.on('join_channel', (channel_id) => {
    socket.join(channel_id);
    console.log(`👥 [Socket.io] Socket ${socket.id} joined channel: ${channel_id}`);
  });

  // 2. Broadcast Message
  socket.on('send_message', async (data) => {
    const { channel_id, sender_id, message_text } = data;
    try {
      // Persist to Postgres
      const result = await pool.query(
        `INSERT INTO chat_messages (channel_id, sender_id, message_text)
         VALUES ($1, $2, $3)
         RETURNING id, created_at`,
        [channel_id, sender_id, message_text]
      );

      // Fetch sender details to attach role & name badges
      const userResult = await pool.query(
        `SELECT full_name as sender_name, role as sender_role FROM users WHERE id = $1`,
        [sender_id]
      );

      const senderName = userResult.rows[0]?.sender_name || 'Anonymous';
      const senderRole = userResult.rows[0]?.sender_role || 'user';

      const fullMessage = {
        id: result.rows[0].id,
        channel_id,
        sender_id,
        message_text,
        created_at: result.rows[0].created_at,
        sender_name: senderName,
        sender_role: senderRole
      };

      // Broadcast to the channel room
      io.to(channel_id).emit('new_message', fullMessage);
    } catch (err) {
      console.error('🚨 [Socket.io Message Save Error]:', err.message);
    }
  });

  // 3. Typing Telemetry
  socket.on('typing_start', (data) => {
    socket.to(data.channel_id).emit('typing_start', data);
  });

  socket.on('typing_stop', (data) => {
    socket.to(data.channel_id).emit('typing_stop', data);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 [Socket.io] Telemetry node unlinked: ${socket.id}`);
  });
});

// Listen on designated port
httpServer.listen(PORT, async () => {
  console.log(`🚀 [Server] TSRV Phase 4 Governance backend live on http://localhost:${PORT}`);
  
  // Ensure that users table has reset_otp and reset_otp_expires_at columns to make forgot-password recovery survive server cold starts!
  pool.query(`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS reset_otp VARCHAR(6),
    ADD COLUMN IF NOT EXISTS reset_otp_expires_at TIMESTAMP;
  `).then(async () => {
    console.log('🔹 [Database] Users password recovery schema synchronized successfully.');

    // Initialize real-time chat messages schema
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id SERIAL PRIMARY KEY,
          channel_id VARCHAR(100) NOT NULL,
          sender_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          message_text TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON chat_messages(channel_id);
      `);
      console.log('🔹 [Database] Chat messages schema and indexes synchronized successfully.');
    } catch (chatDbErr) {
      console.error('🚨 [Database] Failed to build chat messages schema:', chatDbErr.message);
    }
    
    // Seed Master Developer Suryachandra's Master Dev account
    try {
      const cryptoModule = await import('crypto');
      const crypto = cryptoModule.default || cryptoModule;
      
      const devEmail = 'nimmagaddasurya4@gmail.com';
      const devPass = 'surya_dev';
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(devPass, salt, 1000, 64, 'sha512').toString('hex');
      const devHash = `${salt}:${hash}`;

      await pool.query(`
        INSERT INTO users (id, full_name, email, password_hash, role, verified)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO UPDATE 
        SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, verified = EXCLUDED.verified
      `, ['MASTER_DEV_UID', 'Suryachandra (Developer)', devEmail, devHash, 'dev', true]);
      
      console.log('👑 [Database] Master Dev credentials synchronized and secured successfully.');

      // Send onboarding invite mail to Master Developer to confirm SMTP integration!
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
            auth: { user: smtpUser, pass: smtpPass },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
            tls: { rejectUnauthorized: false }
          });

          await transporter.sendMail({
            from: `"TSRV Security Grid" <${process.env.SMTP_SENDER || smtpUser}>`,
            to: devEmail,
            subject: `[TSRV SECURITY GRID] Master Developer Account Calibrated`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 25px;">
                  <h2 style="color: #06b6d4; margin: 0; font-size: 22px; font-weight: 800;">TSRV Security Grid</h2>
                  <span style="font-size: 10px; font-weight: bold; color: #64748b; letter-spacing: 1.5px; text-transform: uppercase;">Telangana Rakshana Sena Vidyarthi</span>
                </div>
                <p style="font-size: 15px; color: #1e293b; line-height: 1.6; font-weight: bold;">Hey Suryachandra,</p>
                <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                  Your Master Developer access credentials have been seeded, synchronized, and calibrated on the production Neon database.
                </p>
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: left;">
                  <div style="margin-bottom: 12px;">
                    <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px;">Assigned Role</span>
                    <strong style="font-size: 15px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">MASTER DEVELOPER</strong>
                  </div>
                  <div style="margin-bottom: 12px;">
                    <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px;">Authorized Email Portal</span>
                    <strong style="font-size: 14px; color: #0f172a;">${devEmail}</strong>
                  </div>
                  <div>
                    <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px;">Global Access Coordinates</span>
                    <strong style="font-size: 14px; color: #0f172a;">All constituencies & tickets (Master Clearance)</strong>
                  </div>
                </div>
                
                <p style="font-size: 13px; color: #ef4444; line-height: 1.6; font-weight: 650; margin-top: 20px; border-left: 3px solid #ef4444; padding-left: 10px;">
                  DEVELOPER SECURITY REQUIREMENT: You are now an active guardian of the student safety ecosystem. Always protect student complaints and coordinates with absolute confidentiality and state honors.
                </p>
                <div style="border-top: 1px solid #f1f5f9; margin-top: 30px; padding-top: 15px; text-align: center;">
                  <span style="font-size: 10px; color: #94a3b8;">TSRV Statewide Student Protection Ecosystem © 2026</span>
                </div>
              </div>
            `
          });
          console.log(`✉️ [Database Seed] Developer welcome email successfully dispatched to: ${devEmail}`);
        } catch (mailErr) {
          console.error('🚨 [Database Seed] Failed to dispatch developer welcome email:', mailErr.message);
        }
      } else {
        console.warn('⚠️ [Database Seed] SMTP credentials unconfigured on host environment. Skipping developer welcome email dispatch.');
      }
    } catch (devErr) {
      console.error('🚨 [Database] Failed to seed master dev credentials:', devErr.message);
    }
  }).catch((err) => {
    console.error('🚨 [Database] Failed to alter users schema for forgot-password:', err.message);
  });

  // Launch the background automation scheduler (runs auto-escalation check every 4 hours)
  setTimeout(() => {
    runAutoEscalationJob().catch(err => console.error('Initial cron job error:', err.message));
  }, 10000); // Trigger first check 10 seconds after server start
  
  setInterval(() => {
    runAutoEscalationJob().catch(err => console.error('Cron job error:', err.message));
  }, 4 * 60 * 60 * 1000);
});
