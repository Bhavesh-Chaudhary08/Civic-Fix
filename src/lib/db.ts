import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || 'civicfix.db';
const dbDir = path.dirname(dbPath);
if (dbDir && dbDir !== '.' && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('user', 'admin')) NOT NULL DEFAULT 'user',
    name TEXT NOT NULL,
    points INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    priority TEXT CHECK(priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    image_url TEXT,
    resolution_image_url TEXT,
    latitude REAL,
    longitude REAL,
    status TEXT CHECK(status IN ('pending', 'in-progress', 'resolved')) DEFAULT 'pending',
    upvotes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    report_id INTEGER NOT NULL,
    UNIQUE(user_id, report_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (report_id) REFERENCES reports(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    cost INTEGER NOT NULL,
    image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS user_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    reward_id INTEGER NOT NULL,
    claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reward_id) REFERENCES rewards(id)
  );

  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialty TEXT
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id),
    FOREIGN KEY (team_id) REFERENCES teams(id)
  );
`);

// Migration: Add new columns if they don't exist
const migrations = [
  "ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0",
  "ALTER TABLE reports ADD COLUMN category TEXT",
  "ALTER TABLE reports ADD COLUMN priority TEXT DEFAULT 'medium'",
  "ALTER TABLE reports ADD COLUMN upvotes INTEGER DEFAULT 0",
  "ALTER TABLE reports ADD COLUMN resolution_image_url TEXT"
];

migrations.forEach(sql => {
  try {
    db.exec(sql);
  } catch (e) {
    // Column already exists or other error
  }
});

// Seed initial admin if not exists
const adminExists = db.prepare('SELECT * FROM users WHERE role = ?').get('admin');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(
    'admin@civicfix.com',
    hashedPassword,
    'System Admin',
    'admin'
  );
}

// Seed teams if none exist
const teamsCount: any = db.prepare('SELECT COUNT(*) as count FROM teams').get();
if (teamsCount.count === 0) {
  const seedTeams = [
    { name: 'Road Maintenance Alpha', specialty: 'Potholes & Pavement' },
    { name: 'Electrical Response Team', specialty: 'Street Lights & Wiring' },
    { name: 'Sanitation Squad', specialty: 'Waste & Illegal Dumping' },
    { name: 'Greenery Care', specialty: 'Trees & Parks' },
  ];
  const insertTeam = db.prepare('INSERT INTO teams (name, specialty) VALUES (?, ?)');
  seedTeams.forEach(team => insertTeam.run(team.name, team.specialty));
}

// Seed rewards
const rewardsCount: any = db.prepare('SELECT COUNT(*) as count FROM rewards').get();
if (rewardsCount.count === 0) {
  const seedRewards = [
    { title: 'Free 1-Hour Parking', description: 'Valid at any city-owned parking lot.', cost: 500 },
    { title: 'Coffee Shop Discount', description: '15% off at participating local cafes.', cost: 200 },
    { title: 'Community Hero Badge', description: 'A special badge for your profile.', cost: 100 },
    { title: 'Park Entry Pass', description: 'Free entry to City National Park for a day.', cost: 400 },
  ];
  const insertReward = db.prepare('INSERT INTO rewards (title, description, cost) VALUES (?, ?, ?)');
  seedRewards.forEach(reward => insertReward.run(reward.title, reward.description, reward.cost));
}

export default db;
