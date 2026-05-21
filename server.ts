import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Setup persistent local JSON database
const DB_FILE = path.join(process.cwd(), "database.json");

interface UserSettings {
  defaultColor: string;
  defaultBrushSize: number;
  canvasBg: "white" | "grid" | "sepia" | "dark";
  fontFamily: "Inter" | "Space Grotesk" | "JetBrains Mono" | "Playfair Display";
  chatBubbleStyle: "modern" | "classic" | "neumorphic";
}

interface AppUser {
  uid: string;
  displayName: string;
  pin: string;
  photoURL: string;
  settings: UserSettings;
}

interface RoomData {
  id: string;
  hostId: string;
  participantId?: string;
  status: "waiting" | "active" | "closed";
  createdAt: string;
}

interface StrokeData {
  id: string;
  roomId: string;
  userId: string;
  points: number[];
  color: string;
  brushSize: number;
  tool: "pen" | "eraser";
  createdAt: string;
}

interface MessageData {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

interface DatabaseSchema {
  users: { [uid: string]: AppUser };
  rooms: { [roomId: string]: RoomData };
  strokes: { [roomId: string]: StrokeData[] };
  messages: { [roomId: string]: MessageData[] };
}

// Initial Database Structure
let db: DatabaseSchema = {
  users: {},
  rooms: {},
  strokes: {},
  messages: {},
};

// Safe DB loading
if (fs.existsSync(DB_FILE)) {
  try {
    const rawData = fs.readFileSync(DB_FILE, "utf-8");
    db = JSON.parse(rawData);
  } catch (err) {
    console.error("Could not parse database, starting fresh:", err);
  }
}

// Save DB utility
function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Could not write to local database:", err);
  }
}

// API Routes
app.use(express.json());

// 1. Authenticate / Login User (If username does not exist, registers them automatically)
app.post("/api/auth/login", (req, res) => {
  const { displayName, pin } = req.body;
  if (!displayName || !pin) {
    return res.status(400).json({ error: "Nickname va PIN majburiy!" });
  }

  const cleanName = displayName.trim();
  const cleanPin = pin.trim();

  // Find user with same name
  let existingUser = Object.values(db.users).find(
    (u) => u.displayName.toLowerCase() === cleanName.toLowerCase()
  );

  if (existingUser) {
    if (existingUser.pin !== cleanPin) {
      return res.status(403).json({ error: "Xato PIN! Iltimos boshqa ism tanlang yoki to'g'ri PIN kiriting!" });
    }
    return res.json({ user: existingUser });
  }

  // Create new persistent user account (auto-register)
  const uid = "usr_" + Math.random().toString(36).substring(2, 9);
  const avatarSeed = cleanName + Math.floor(Math.random() * 1000);
  const newUser: AppUser = {
    uid,
    displayName: cleanName,
    pin: cleanPin,
    photoURL: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${avatarSeed}`,
    settings: {
      defaultColor: "#ef4444",
      defaultBrushSize: 6,
      canvasBg: "white",
      fontFamily: "Inter",
      chatBubbleStyle: "modern",
    },
  };

  db.users[uid] = newUser;
  saveDB();

  res.json({ user: newUser });
});

// Update settings endpoint (preserves all settings)
app.post("/api/auth/settings", (req, res) => {
  const { uid, settings } = req.body;
  if (!uid || !settings) {
    return res.status(400).json({ error: "UID va Sozlamalar kerak!" });
  }

  const user = db.users[uid];
  if (!user) {
    return res.status(440).json({ error: "Foydalanuvchi topilmadi!" });
  }

  user.settings = { ...user.settings, ...settings };
  db.users[uid] = user;
  saveDB();

  res.json({ success: true, settings: user.settings });
});

// Create Room
app.post("/api/rooms/create", (req, res) => {
  const { hostId } = req.body;
  if (!hostId || !db.users[hostId]) {
    return res.status(400).json({ error: "Noto'g'ri hostId!" });
  }

  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const newRoom: RoomData = {
    id: roomId,
    hostId,
    status: "waiting",
    createdAt: new Date().toISOString(),
  };

  db.rooms[roomId] = newRoom;
  db.strokes[roomId] = [];
  db.messages[roomId] = [];
  saveDB();

  res.json({ room: newRoom });
});

// Join Room
app.post("/api/rooms/join", (req, res) => {
  const { roomId, uid } = req.body;
  if (!roomId || !uid || !db.users[uid]) {
    return res.status(400).json({ error: "Sarlavhalar yoki xona ID xato" });
  }

  const cleanRoomId = roomId.trim().toUpperCase();
  const room = db.rooms[cleanRoomId];

  if (!room) {
    return res.status(404).json({ error: "Xona topilmadi! Tekshirib qayta urinib ko'ring." });
  }

  if (room.status === "closed") {
    return res.status(400).json({ error: "Bu xona allaqachon yopilgan!" });
  }

  if (room.hostId !== uid && room.participantId && room.participantId !== uid) {
    return res.status(403).json({ error: "Xona band! Faqat 2 kishi hamkorlik qilishi mumkin." });
  }

  if (room.hostId !== uid && !room.participantId) {
    room.participantId = uid;
    room.status = "active";
    db.rooms[cleanRoomId] = room;
    saveDB();
  }

  res.json({ room });
});

// Real-time synchronization hub polling (Returns strokes, room state, chat updates)
app.get("/api/rooms/:roomId/sync", (req, res) => {
  const { roomId } = req.params;
  const cleanRoomId = roomId.toUpperCase();

  const room = db.rooms[cleanRoomId];
  if (!room) {
    return res.status(404).json({ error: "Xona mavjud emas" });
  }

  const strokes = db.strokes[cleanRoomId] || [];
  const messages = db.messages[cleanRoomId] || [];

  res.json({
    room,
    strokes,
    messages,
  });
});

// Post Stroke
app.post("/api/rooms/:roomId/stroke", (req, res) => {
  const { roomId } = req.params;
  const { userId, stroke } = req.body;
  const cleanRoomId = roomId.toUpperCase();

  const room = db.rooms[cleanRoomId];
  if (!room) {
    return res.status(404).json({ error: "Xona topilmadi" });
  }

  const strokeId = "str_" + Math.random().toString(36).substring(2, 10);
  const newStroke: StrokeData = {
    ...stroke,
    id: strokeId,
    roomId: cleanRoomId,
    userId,
    createdAt: new Date().toISOString(),
  };

  if (!db.strokes[cleanRoomId]) {
    db.strokes[cleanRoomId] = [];
  }
  db.strokes[cleanRoomId].push(newStroke);
  saveDB();

  res.json({ success: true, stroke: newStroke });
});

// Post Message (Real-time Chat)
app.post("/api/rooms/:roomId/message", (req, res) => {
  const { roomId } = req.params;
  const { userId, userName, text } = req.body;
  const cleanRoomId = roomId.toUpperCase();

  const room = db.rooms[cleanRoomId];
  if (!room) {
    return res.status(404).json({ error: "Xona topilmadi" });
  }

  const msgId = "msg_" + Math.random().toString(36).substring(2, 10);
  const newMessage: MessageData = {
    id: msgId,
    roomId: cleanRoomId,
    userId,
    userName,
    text,
    createdAt: new Date().toISOString(),
  };

  if (!db.messages[cleanRoomId]) {
    db.messages[cleanRoomId] = [];
  }
  db.messages[cleanRoomId].push(newMessage);
  saveDB();

  res.json({ success: true, message: newMessage });
});

// Clear Canvas
app.post("/api/rooms/:roomId/clear", (req, res) => {
  const { roomId } = req.params;
  const cleanRoomId = roomId.toUpperCase();

  if (db.rooms[cleanRoomId]) {
    db.strokes[cleanRoomId] = [];
    saveDB();
    return res.json({ success: true });
  }

  res.status(404).json({ error: "Xona topilmadi" });
});

// Undo Last Stroke for Specific User
app.post("/api/rooms/:roomId/undo", (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.body;
  const cleanRoomId = roomId.toUpperCase();

  if (db.rooms[cleanRoomId]) {
    const strokes = db.strokes[cleanRoomId] || [];
    for (let i = strokes.length - 1; i >= 0; i--) {
      if (strokes[i].userId === userId) {
        strokes.splice(i, 1);
        saveDB();
        return res.json({ success: true, removedId: strokes[i]?.id });
      }
    }
    return res.json({ success: true, message: "No stroke found to undo" });
  }

  res.status(404).json({ error: "Xona topilmadi" });
});

// Clean idle elements
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", activeRooms: Object.keys(db.rooms).length });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
