import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import { handleLiveWebSocket, generateDebriefServer, chatInterviewFallback } from "./server/geminiService";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("MongoDB connection error:", err));
} else {
  console.warn("MONGODB_URI not found in environment variables. Database features will not work.");
}

// Models
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  displayName: String,
  photoURL: String,
  createdAt: { type: Date, default: Date.now }
});

const SessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  config: Object,
  transcript: Array,
  debrief: Object,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);
const Session = mongoose.model("Session", SessionSchema);

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// API Routes
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, displayName });
    await user.save();
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user._id, email: user.email, displayName: user.displayName } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user._id, email: user.email, displayName: user.displayName, photoURL: user.photoURL } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/sessions", authenticate, async (req: any, res) => {
  try {
    const sessions = await Session.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/sessions", authenticate, async (req: any, res) => {
  try {
    const session = new Session({ ...req.body, userId: req.user.id });
    await session.save();
    res.json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/sessions/:id", authenticate, async (req: any, res) => {
  try {
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    res.json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// AI Endpoints
app.post("/api/debrief", async (req, res) => {
  try {
    const { transcript, sessionInfo, isRegeneration } = req.body;
    if (!transcript || !Array.isArray(transcript)) {
      return res.status(400).json({ error: "Transcript is required" });
    }
    const debrief = await generateDebriefServer(transcript, sessionInfo, isRegeneration);
    res.json(debrief);
  } catch (err: any) {
    console.error("Debrief endpoint error:", err);
    res.status(500).json({ error: err?.message || "Failed to generate debrief" });
  }
});

app.post("/api/interview/chat", async (req, res) => {
  try {
    const { message, history, config } = req.body;
    const reply = await chatInterviewFallback(message, history, config);
    res.json({ reply });
  } catch (err: any) {
    console.error("Interview chat fallback error:", err);
    res.status(500).json({ error: err?.message || "Failed to generate interview response" });
  }
});

// Vite middleware for development
async function startServer() {
  // Initialize WebSocket server for Live API
  const wss = new WebSocketServer({ server, path: "/api/live-ws" });
  wss.on("connection", (ws) => {
    console.log("[LiveAPI] Client connected to live-ws");
    handleLiveWebSocket(ws);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
