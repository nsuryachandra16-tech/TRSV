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
import compression from 'compression';
import jwt from 'jsonwebtoken';

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
import notificationsRouter from './routes/notifications.js';
import joinRouter from './routes/join.js';

dotenv.config();

// Startup Environment Validation
const REQUIRED_ENVS = ['DATABASE_URL', 'JWT_SECRET'];
REQUIRED_ENVS.forEach(env => {
  if (!process.env[env]) {
    console.error(`🚨 FATAL: Missing required environment variable: ${env}`);
    process.exit(1);
  }
});

const app = express();
const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = [
  ALLOWED_ORIGIN,
  'http://localhost',
  'capacitor://localhost'
];

const corsOriginHandler = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost:')) {
    return callback(null, true);
  }
  return callback(null, false); // Fail safely, but let CORS middleware handle it
};

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: corsOriginHandler,
    methods: ['GET', 'POST']
  }
});

// Enable JSON parsers and compression
app.use(compression());
app.use(cors({ origin: corsOriginHandler }));
app.use(express.json({ limit: '10kb' })); // Mitigate payload attacks
app.disable('x-powered-by');

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
        "blob:",
        "https://*.supabase.co"
      ],
      connectSrc: [
        "'self'", 
        "ws:",
        "wss:",
        "https://*.supabase.co"
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
app.use('/api/notifications', notificationsRouter);
app.use('/api/join-trsv', joinRouter);

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbCheck = await pool.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      service: 'TRSV Governance Core Node',
      database: 'connected',
      timestamp: dbCheck.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'degraded',
      service: 'TRSV Governance Core Node',
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
  // Prevent serving index.html for missing static files with extensions (e.g. .css, .js)
  if (path.extname(req.path)) {
    return res.status(404).send('Not Found');
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 [Server Error]:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred on governance node.',
    error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message
  });
});

// Configure Socket.io Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // { uid, email, role, name }
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid or expired token'));
  }
});

const messageRateLimits = new Map();

// Configure Socket.io real-time event routing
io.on('connection', (socket) => {
  console.log(`🔌 [Socket.io] Telemetry node linked (Auth: ${socket.user.uid}): ${socket.id}`);

  // 1. Join Chat Room
  socket.on('join_channel', (channel_id) => {
    socket.join(channel_id);
    console.log(`👥 [Socket.io] Socket ${socket.id} joined channel: ${channel_id}`);
  });

  // 2. Broadcast Message
  socket.on('send_message', async (data) => {
    const { channel_id, sender_id, message_text } = data;
    
    // Strict sender_id validation (prevents spoofing)
    if (sender_id !== socket.user.uid) {
      console.warn(`⚠️ [Socket.io] Spoofing attempt by socket ${socket.id} (Claimed: ${sender_id}, Actual: ${socket.user.uid})`);
      return;
    }

    // Rate Limiting: max 10 messages per 10 seconds per socket
    const now = Date.now();
    const limitWindow = 10000;
    const rateData = messageRateLimits.get(socket.id) || { count: 0, firstMsgTime: now };
    
    if (now - rateData.firstMsgTime > limitWindow) {
      rateData.count = 1;
      rateData.firstMsgTime = now;
    } else {
      rateData.count++;
      if (rateData.count > 10) {
        socket.emit('rate_limit_error', { message: 'Message rate limit exceeded. Please wait.' });
        return;
      }
    }
    messageRateLimits.set(socket.id, rateData);

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

  // 3. Edit Message Telemetry
  socket.on('edit_message', async (data) => {
    const { id, channel_id, message_text } = data;
    try {
      const result = await pool.query(
        `UPDATE chat_messages 
         SET message_text = $1, is_edited = TRUE 
         WHERE id = $2 
         RETURNING id, channel_id, message_text, is_edited, created_at`,
        [message_text, id]
      );

      if (result.rows.length > 0) {
        io.to(channel_id).emit('message_edited', result.rows[0]);
      }
    } catch (err) {
      console.error('🚨 [Socket.io Message Edit Error]:', err.message);
    }
  });

  // 4. Typing Telemetry
  socket.on('typing_start', (data) => {
    socket.to(data.channel_id).emit('typing_start', data);
  });

  socket.on('typing_stop', (data) => {
    socket.to(data.channel_id).emit('typing_stop', data);
  });

  socket.on('disconnect', () => {
    messageRateLimits.delete(socket.id);
    console.log(`🔌 [Socket.io] Telemetry node unlinked: ${socket.id}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SERVER START + STARTUP SCHEMA SYNC
// Each migration step is independently try/catched — no single failure
// blocks the remaining steps. Every multi-statement DDL is split into
// separate pool.query() calls to avoid Neon/Supabase rejection of
// semicolon-separated multi-statement strings.
// ─────────────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, async () => {
  console.log(`🚀 [Server] TRSV Phase 4 Governance backend live on http://localhost:${PORT}`);

  // STEP 1: Fix role CHECK constraint FIRST — must run before any role-dependent seeds
  try {
    await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
    await pool.query(`
      ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('student', 'secretary', 'general_secretary', 'vice_president', 'president', 'state_president', 'supreme_admin', 'dev'))
    `);
    console.log('🔹 [Database] Users role constraint updated (dev + state_president allowed).');
  } catch (roleErr) {
    console.warn('⚠️ [Database] Role constraint update skipped (likely already correct):', roleErr.message);
  }

  // STEP 2: Password recovery columns & Performance Indexes
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp VARCHAR(6)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_expires_at TIMESTAMP`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_complaints_student_id ON complaints(student_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_complaints_constituency_id ON complaints(constituency_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_complaints_college_id ON complaints(college_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_complaint_timeline_complaint_id ON complaint_timeline(complaint_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id)`);
    console.log('🔹 [Database] Users password recovery and performance indexes synchronized.');
  } catch (err) {
    console.error('🚨 [Database] Failed to sync password recovery or indexes:', err.message);
  }

  // STEP 3: Chat messages table (separate queries — no multi-statement)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        channel_id VARCHAR(100) NOT NULL,
        sender_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        message_text TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON chat_messages(channel_id)`);
    console.log('🔹 [Database] Chat messages schema synchronized.');
  } catch (chatDbErr) {
    console.error('🚨 [Database] Failed to sync chat messages schema:', chatDbErr.message);
  }

  // STEP 4: Seed Master Developer account - Removed for production security

  // STEP 5: Ensure "Upcoming Area" constituency exists
  try {
    await pool.query(`
      INSERT INTO constituencies (constituency_name, district, status)
      VALUES ('Upcoming Area', 'Statewide', 'active')
      ON CONFLICT (constituency_name) DO NOTHING
    `);
    console.log('🔹 [Database] Upcoming Area constituency synchronized.');
  } catch (upcomingErr) {
    console.error('🚨 [Database] Failed to ensure Upcoming Area constituency:', upcomingErr.message);
  }

  // STEP 6: Parent-child constituency hierarchy setup
  try {
    await pool.query(`
      ALTER TABLE constituencies 
      ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES constituencies(id) ON DELETE CASCADE
    `);
    let ghRes = await pool.query("SELECT id FROM constituencies WHERE constituency_name = 'Greater Hyderabad'");
    let ghId;
    if (ghRes.rows.length > 0) {
      ghId = ghRes.rows[0].id;
      const oldHydRes = await pool.query("SELECT id FROM constituencies WHERE constituency_name = 'Hyderabad (Parliament)'");
      if (oldHydRes.rows.length > 0) {
        const oldId = oldHydRes.rows[0].id;
        await pool.query("UPDATE users SET constituency_id = $1 WHERE constituency_id = $2", [ghId, oldId]);
        await pool.query("UPDATE colleges SET constituency_id = $1 WHERE constituency_id = $2", [ghId, oldId]);
        await pool.query("UPDATE complaints SET constituency_id = $1 WHERE constituency_id = $2", [ghId, oldId]);
        await pool.query("DELETE FROM constituencies WHERE id = $1", [oldId]);
      }
    } else {
      await pool.query(`UPDATE constituencies SET constituency_name = 'Greater Hyderabad' WHERE constituency_name = 'Hyderabad (Parliament)'`);
      ghRes = await pool.query("SELECT id FROM constituencies WHERE constituency_name = 'Greater Hyderabad'");
      if (ghRes.rows.length > 0) ghId = ghRes.rows[0].id;
    }
    if (ghId) {
      await pool.query(`
        UPDATE constituencies SET parent_id = $1 
        WHERE district = 'Hyderabad' AND id != $1 AND parent_id IS NULL
      `, [ghId]);
    }
    console.log('🔹 [Database] Constituency hierarchy synchronized.');
  } catch (conErr) {
    console.error('🚨 [Database] Failed to sync constituency hierarchy:', conErr.message);
  }

  // STEP 7: Complaint details columns on complaints (each column separate to avoid multi-statement rejection)
  try {
    await pool.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complainant_name VARCHAR(255)`);
    await pool.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complainant_mobile VARCHAR(20)`);
    await pool.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS college_school_address TEXT`);
    console.log('🔹 [Database] Complaints form columns synchronized.');
  } catch (colErr) {
    console.error('🚨 [Database] Failed to sync complaint columns:', colErr.message);
  }

  // STEP 8: Announcements image_url column
  try {
    await pool.query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_url TEXT`);
    console.log('🔹 [Database] Announcements image_url column synchronized.');
  } catch (imgErr) {
    console.error('🚨 [Database] Failed to sync announcements image_url column:', imgErr.message);
  }

  // STEP 9: Clean up old leaders
  try {
    // 1. Delete Pranith and Omkar
    await pool.query("DELETE FROM users WHERE email IN ('pranith@trsv.gov.in', 'omkar@trsv.gov.in')");
    console.log('🔹 [Database] Old leaders synchronized.');
  } catch (syncErr) {
    console.error('🚨 [Database] Failed to sync old leaders:', syncErr.message);
  }

  // STEP 10: Rename member_identities column tsrv_member_id to trsv_member_id if exists
  try {
    await pool.query(`
      DO $$ 
      BEGIN 
        IF EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name='member_identities' AND column_name='tsrv_member_id'
        ) THEN 
          ALTER TABLE member_identities RENAME COLUMN tsrv_member_id TO trsv_member_id;
        END IF;
      END $$;
    `);
    console.log('🔹 [Database] Digital ID member identifier column synchronized to trsv_member_id.');
  } catch (colErr) {
    console.error('🚨 [Database] Failed to rename identity column:', colErr.message);
  }


  // Background auto-escalation scheduler
  setTimeout(() => {
    runAutoEscalationJob().catch(err => console.error('Initial cron job error:', err.message));
  }, 10000);
  setInterval(() => {
    runAutoEscalationJob().catch(err => console.error('Cron job error:', err.message));
  }, 4 * 60 * 60 * 1000);
});

// Graceful Shutdown Handler
const gracefulShutdown = () => {
  console.log('🛑 [Server] Received shutdown signal. Draining pool and closing Socket.io...');
  io.close(() => {
    pool.end(() => {
      console.log('✅ [Server] Connections closed. Shutting down.');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
