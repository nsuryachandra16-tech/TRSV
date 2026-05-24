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
import notificationsRouter from './routes/notifications.js';
import joinRouter from './routes/join.js';

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
        "blob:",
        "https:",
        "http:",
        "*"
      ],
      connectSrc: [
        "'self'", 
        "ws:",
        "wss:",
        "https:",
        "http:",
        "*"
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
  console.log(`🚀 [Server] TSRV Phase 4 Governance backend live on http://localhost:${PORT}`);

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

  // STEP 2: Password recovery columns
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp VARCHAR(6)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_expires_at TIMESTAMP`);
    console.log('🔹 [Database] Users password recovery schema synchronized.');
  } catch (err) {
    console.error('🚨 [Database] Failed to sync password recovery columns:', err.message);
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

  // STEP 4: Seed Master Developer account (role constraint must be fixed first — STEP 1)
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
    console.log('👑 [Database] Master Dev credentials synchronized.');
  } catch (devErr) {
    console.error('🚨 [Database] Failed to seed master dev credentials:', devErr.message);
  }

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

  // STEP 9: Clean up old leaders and sync Ch. Karthik Yadav
  try {
    const ghRes = await pool.query("SELECT id FROM constituencies WHERE constituency_name = 'Greater Hyderabad'");
    const ghId = ghRes.rows.length > 0 ? ghRes.rows[0].id : null;

    // 1. Delete Pranith and Omkar
    await pool.query("DELETE FROM users WHERE email IN ('pranith@tsrv.gov.in', 'omkar@tsrv.gov.in')");

    // 2. Upsert Ch. Karthik Yadav as digital_operations_president
    if (ghId) {
      const cryptoModule = await import('crypto');
      const crypto = cryptoModule.default || cryptoModule;
      const pass = 'karthik_secret';
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(pass, salt, 1000, 64, 'sha512').toString('hex');
      const karthikHash = `${salt}:${hash}`;

      await pool.query(`
        INSERT INTO users (id, full_name, email, role, phone, profile_image, verified, password_hash, constituency_id)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8)
        ON CONFLICT (email) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role,
          phone = EXCLUDED.phone,
          constituency_id = EXCLUDED.constituency_id
      `, ['gh-gs-karthik', 'Ch. Karthik Yadav', 'karthikyadavtjsf@gmail.com', 'digital_operations_president', '8142443684', '/karthikyadav.jpg', karthikHash, ghId]);
    }
    console.log('🔹 [Database] Ch. Karthik Yadav & Old leaders synchronized.');
  } catch (syncErr) {
    console.error('🚨 [Database] Failed to sync Ch. Karthik Yadav & old leaders:', syncErr.message);
  }


  // Background auto-escalation scheduler
  setTimeout(() => {
    runAutoEscalationJob().catch(err => console.error('Initial cron job error:', err.message));
  }, 10000);
  setInterval(() => {
    runAutoEscalationJob().catch(err => console.error('Cron job error:', err.message));
  }, 4 * 60 * 60 * 1000);
});
