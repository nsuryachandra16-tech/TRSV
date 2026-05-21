-- TSRV Phase 2 Neon PostgreSQL Relational Database Schema

-- 1. Constituencies Table
CREATE TABLE IF NOT EXISTS constituencies (
    id SERIAL PRIMARY KEY,
    constituency_name VARCHAR(255) NOT NULL UNIQUE,
    district VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Colleges Table
CREATE TABLE IF NOT EXISTS colleges (
    id SERIAL PRIMARY KEY,
    college_name VARCHAR(255) NOT NULL UNIQUE,
    constituency_id INT REFERENCES constituencies(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY, -- Firebase Auth UID
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'secretary', 'general_secretary', 'vice_president', 'president', 'supreme_admin')),
    constituency_id INT REFERENCES constituencies(id) ON DELETE SET NULL,
    college_id INT REFERENCES colleges(id) ON DELETE SET NULL,
    phone VARCHAR(20),
    profile_image TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    urgency VARCHAR(50) DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) DEFAULT 'Audit Phase',
    student_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    constituency_id INT REFERENCES constituencies(id) ON DELETE SET NULL,
    college_id INT REFERENCES colleges(id) ON DELETE SET NULL,
    attachment_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Complaint Status Timeline Updates
CREATE TABLE IF NOT EXISTS complaint_updates (
    id SERIAL PRIMARY KEY,
    complaint_id INT REFERENCES complaints(id) ON DELETE CASCADE,
    updater_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    status_from VARCHAR(50) NOT NULL,
    status_to VARCHAR(50) NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    author_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_audience VARCHAR(100) DEFAULT 'all',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Activity Logs Audit
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Join Requests Table
CREATE TABLE IF NOT EXISTS join_requests (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    college_name VARCHAR(255) NOT NULL,
    constituency_id INT REFERENCES constituencies(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

