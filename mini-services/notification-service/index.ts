import { createServer } from "http";
import { Server } from "socket.io";

// ─── Types ──────────────────────────────────────────────────────────────────

interface NotifyRequestBody {
  type: string;
  data: Record<string, unknown>;
  room?: string; // optional: target a specific room
}

interface PresenceUser {
  userId: string;
  role: string;
  lastSeen: Date;
}

// ─── Presence Tracking ──────────────────────────────────────────────────────

const onlineUsers = new Map<string, PresenceUser>();

function broadcastPresence() {
  const serializable: Record<string, { userId: string; role: string }> = {};
  for (const [socketId, user] of onlineUsers) {
    serializable[socketId] = { userId: user.userId, role: user.role };
  }
  io.emit("user:presence", serializable);
}

// ─── HTTP Server (REST endpoint for API routes) ─────────────────────────────

const httpServer = createServer((req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  // POST /notify — receive notifications from Next.js API routes
  if (req.method === "POST" && req.url === "/notify") {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const parsed: NotifyRequestBody = JSON.parse(body);
        const { type, data, room } = parsed;

        if (!type || !data) {
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({ error: "type and data are required" }));
          return;
        }

        // Broadcast to all connected clients, or a specific room
        const payload = { type, data, timestamp: new Date().toISOString() };

        if (room) {
          io.to(room).emit(type, payload);
          // Also always emit globally for the type
          io.emit(type, payload);
        } else {
          io.emit(type, payload);
        }

        console.log(`[notify] HTTP → emitted "${type}" to all clients`);

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
    return;
  }

  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ status: "ok", connections: io.engine.clientsCount }));
    return;
  }

  // 404
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

// ─── Socket.IO Server ───────────────────────────────────────────────────────

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectionStateRecovery: {},
});

io.on("connection", (socket) => {
  console.log(`[socket] Client connected: ${socket.id}`);

  // ─── Presence: join ───────────────────────────────────────────────────────
  socket.on("presence:join", (data: { userId: string; role: string }) => {
    if (data?.userId) {
      onlineUsers.set(socket.id, {
        userId: data.userId,
        role: data.role || "unknown",
        lastSeen: new Date(),
      });
      broadcastPresence();
      console.log(`[presence] ${data.userId} (${data.role}) joined — ${onlineUsers.size} online`);
    }
  });

  // ─── Presence: heartbeat ──────────────────────────────────────────────────
  socket.on("presence:ping", () => {
    const entry = onlineUsers.get(socket.id);
    if (entry) {
      entry.lastSeen = new Date();
    }
  });

  // ─── Join role-based room ─────────────────────────────────────────────────
  socket.on("join", (role: string) => {
    socket.join(`role:${role}`);
    // Also join the "all" room for global broadcasts
    socket.join("role:all");
    console.log(`[socket] ${socket.id} joined role:${role}`);
  });

  // ─── Join a specific room (e.g., park-scoped) ────────────────────────────
  socket.on("join-room", (roomName: string) => {
    socket.join(roomName);
    console.log(`[socket] ${socket.id} joined room: ${roomName}`);
  });

  // ─── Leave a specific room ───────────────────────────────────────────────
  socket.on("leave-room", (roomName: string) => {
    socket.leave(roomName);
    console.log(`[socket] ${socket.id} left room: ${roomName}`);
  });

  // ─── Client-to-server attendance update relay ────────────────────────────
  socket.on("attendance:update", (data: Record<string, unknown>) => {
    // Relay to all clients
    const payload = { type: "attendance:updated", data, timestamp: new Date().toISOString() };
    io.emit("attendance:updated", payload);
    console.log(`[socket] Attendance update relayed from ${socket.id}`);
  });

  // ─── Client-to-server announcement relay ─────────────────────────────────
  socket.on("announcement:new", (data: Record<string, unknown>) => {
    const payload = { type: "announcement:received", data, timestamp: new Date().toISOString() };
    io.to("role:all").emit("announcement:received", payload);
    console.log(`[socket] Announcement relayed from ${socket.id}`);
  });

  socket.on("disconnect", () => {
    const wasPresent = onlineUsers.delete(socket.id);
    if (wasPresent) {
      broadcastPresence();
    }
    console.log(`[socket] Client disconnected: ${socket.id}`);
  });

  socket.on("error", (error) => {
    console.error(`[socket] Error on ${socket.id}:`, error);
  });
});

// ─── Start ──────────────────────────────────────────────────────────────────

const PORT = 3004;
httpServer.listen(PORT, () => {
  console.log(`[notification-service] Running on port ${PORT}`);
  console.log(`[notification-service] REST endpoint: POST http://localhost:${PORT}/notify`);
  console.log(`[notification-service] Health check:  GET  http://localhost:${PORT}/health`);
});

// ─── Periodic Presence Cleanup (every 30s, remove stale > 90s) ─────────────

setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [id, user] of onlineUsers) {
    if (now - user.lastSeen.getTime() > 90000) {
      onlineUsers.delete(id);
      changed = true;
    }
  }
  if (changed) {
    broadcastPresence();
    console.log(`[presence] Stale connections cleaned — ${onlineUsers.size} online`);
  }
}, 30000);

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`\n[notification-service] Received ${signal}, shutting down...`);
  io.close();
  httpServer.close(() => {
    console.log("[notification-service] Server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));