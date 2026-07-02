import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "./src/lib/db.js";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "civicfix-secret-key-123";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, "public/uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Multer config
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + "-" + file.originalname);
    },
  });
  const upload = multer({ storage });

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      console.warn("Authentication failed: No token provided");
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      console.warn("Authentication failed: Invalid token", err);
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // --- API Routes ---

  // Auth
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name, role } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = db.prepare(
        "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)"
      ).run(email, hashedPassword, name, role || "user");
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, role: user.role, name: user.name, points: user.points } });
  });

  app.get("/api/auth/me", authenticate, (req: any, res) => {
    const user: any = db.prepare("SELECT id, email, name, role, points FROM users WHERE id = ?").get(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  // Reports
  app.get("/api/reports/public", (req, res) => {
    const reports = db.prepare(`
      SELECT r.*, u.name as reporter_name 
      FROM reports r 
      JOIN users u ON r.user_id = u.id 
      ORDER BY r.created_at DESC
    `).all();
    res.json(reports);
  });

  app.post("/api/reports", authenticate, upload.single("image"), async (req: any, res) => {
    const { title, description, latitude, longitude, category, priority } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    try {
      const result = db.prepare(
        "INSERT INTO reports (user_id, title, description, image_url, latitude, longitude, category, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(req.user.id, title, description, imageUrl, latitude, longitude, category || "General", priority || "medium");
      
      // Award points for reporting
      db.prepare("UPDATE users SET points = points + 10 WHERE id = ?").run(req.user.id);
      
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/reports/:id/vote", authenticate, (req: any, res) => {
    try {
      db.prepare("INSERT INTO votes (user_id, report_id) VALUES (?, ?)").run(req.user.id, req.params.id);
      db.prepare("UPDATE reports SET upvotes = upvotes + 1 WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: "Already voted or invalid report" });
    }
  });

  app.get("/api/reports/:id/comments", (req, res) => {
    const comments = db.prepare(`
      SELECT c.*, u.name as user_name 
      FROM comments c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.report_id = ? 
      ORDER BY c.created_at ASC
    `).all(req.params.id);
    res.json(comments);
  });

  app.post("/api/reports/:id/comments", authenticate, (req: any, res) => {
    const { content } = req.body;
    try {
      db.prepare("INSERT INTO comments (report_id, user_id, content) VALUES (?, ?, ?)")
        .run(req.params.id, req.user.id, content);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/rewards", (req, res) => {
    const rewards = db.prepare("SELECT * FROM rewards").all();
    res.json(rewards);
  });

  app.post("/api/rewards/:id/claim", authenticate, (req: any, res) => {
    const reward: any = db.prepare("SELECT * FROM rewards WHERE id = ?").get(req.params.id);
    const user: any = db.prepare("SELECT points FROM users WHERE id = ?").get(req.user.id);

    if (!reward || !user) return res.status(404).json({ error: "Not found" });
    if (user.points < reward.cost) return res.status(400).json({ error: "Insufficient points" });

    db.prepare("UPDATE users SET points = points - ? WHERE id = ?").run(reward.cost, req.user.id);
    db.prepare("INSERT INTO user_rewards (user_id, reward_id) VALUES (?, ?)").run(req.user.id, req.params.id);
    
    res.json({ success: true });
  });

  app.get("/api/analytics", (req, res) => {
    const stats = {
      total_reports: db.prepare("SELECT COUNT(*) as count FROM reports").get(),
      resolved_reports: db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'resolved'").get(),
      category_stats: db.prepare("SELECT category, COUNT(*) as count FROM reports GROUP BY category").all(),
      recent_activity: db.prepare("SELECT created_at, status FROM reports ORDER BY created_at DESC LIMIT 30").all()
    };
    res.json(stats);
  });

  app.get("/api/leaderboard", (req, res) => {
    const leaderboard = db.prepare(`
      SELECT name, points, 
      (SELECT COUNT(*) FROM reports WHERE user_id = users.id AND status = 'resolved') as resolved_count
      FROM users 
      WHERE role = 'user'
      ORDER BY points DESC 
      LIMIT 10
    `).all();
    res.json(leaderboard);
  });

  app.get("/api/reports", authenticate, (req: any, res) => {
    let reports;
    if (req.user.role === "admin") {
      reports = db.prepare(`
        SELECT r.*, u.name as reporter_name 
        FROM reports r 
        JOIN users u ON r.user_id = u.id 
        ORDER BY r.created_at DESC
      `).all();
    } else {
      reports = db.prepare("SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
    }
    res.json(reports);
  });

  app.patch("/api/reports/:id", authenticate, upload.single("resolution_image"), (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const { status } = req.body;
    const resolutionImageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    const report: any = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });

    if (resolutionImageUrl) {
      db.prepare("UPDATE reports SET status = ?, resolution_image_url = ? WHERE id = ?").run(status, resolutionImageUrl, req.params.id);
    } else {
      db.prepare("UPDATE reports SET status = ? WHERE id = ?").run(status, req.params.id);
    }
    
    // Award points if resolved
    if (status === "resolved" && report.status !== "resolved") {
      db.prepare("UPDATE users SET points = points + 50 WHERE id = ?").run(report.user_id);
    }
    
    res.json({ success: true });
  });

  // Teams
  app.get("/api/teams", authenticate, (req: any, res) => {
    const teams = db.prepare("SELECT * FROM teams").all();
    res.json(teams);
  });

  app.post("/api/assignments", authenticate, (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const { report_id, team_id } = req.body;
    db.prepare("INSERT INTO assignments (report_id, team_id) VALUES (?, ?)").run(report_id, team_id);
    db.prepare("UPDATE reports SET status = 'in-progress' WHERE id = ?").run(report_id);
    res.json({ success: true });
  });

  // Serve static uploads
  app.use("/uploads", express.static(uploadsDir));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
