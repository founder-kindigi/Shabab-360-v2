import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";
import dotenv from "dotenv";
import { resolve } from "path";

// Load .env from the main project root (two levels up)
dotenv.config({ path: resolve(__dirname, "../../.env") });

const JWT_SECRET =
  process.env.NEXTAUTH_SECRET || "shabab360-dev-secret-change-in-production";

const prisma = new PrismaClient();

// Human-readable labels for entity types
const ENTITY_LABELS: Record<string, string> = {
  city: "City",
  park: "Park",
  batch: "Batch",
  group: "Group",
  user: "User",
  attendance_events: "Attendance Event",
  attendance_records: "Attendance Record",
};

const ACTION_VERBS: Record<string, string> = {
  CREATE: "created",
  UPDATE: "updated",
  DELETE: "deleted",
  CLOSE: "closed",
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthenticatedSocket {
  userId: string;
  role: string;
  assignedCityId: string | null;
  assignedParkId: string | null;
  assignedGroupId: string | null;
  rooms: string[];
}

// Map of socket id → auth info
const socketUsers = new Map<string, AuthenticatedSocket>();

// Track the last-seen audit log timestamp for each polling cycle
let lastPolledAt = new Date();

// ─── JWT Verification ───────────────────────────────────────────────────────

async function verifyToken(
  token: string
): Promise<AuthenticatedSocket | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.id || !payload.role) return null;

    // Look up staff meta for scope info
    const staffMeta = await prisma.staffMeta.findUnique({
      where: { userId: payload.id as string },
    });

    return {
      userId: payload.id as string,
      role: payload.role as string,
      assignedCityId: staffMeta?.assignedCityId ?? null,
      assignedParkId: staffMeta?.assignedParkId ?? null,
      assignedGroupId: staffMeta?.assignedGroupId ?? null,
      rooms: [],
    };
  } catch {
    return null;
  }
}

// ─── Room Logic ──────────────────────────────────────────────────────────────

function buildRoleRooms(user: AuthenticatedSocket): string[] {
  const rooms: string[] = [];
  const role = user.role;

  // All staff can see "global" notifications
  if (role === "super_admin" || role === "program_admin") {
    rooms.push("notifications:global");
  } else if (role === "city_head" && user.assignedCityId) {
    rooms.push(`notifications:city:${user.assignedCityId}`);
  } else if (
    (role === "park_admin" || role === "park_lead" || role === "murabbi") &&
    user.assignedParkId
  ) {
    rooms.push(`notifications:park:${user.assignedParkId}`);
  }

  return rooms;
}

// ─── Notification Broadcast ─────────────────────────────────────────────────

interface NotificationPayload {
  type: "notification";
  data: {
    id: string;
    action: string;
    entityType: string;
    description: string;
    actorName: string;
    timestamp: string;
  };
}

function formatNotification(log: {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  newValues?: string | null;
  user?: { name?: string | null } | null;
}): NotificationPayload["data"] {
  const actorName = log.user?.name || "System";
  const entityLabel = ENTITY_LABELS[log.entityType] || log.entityType;
  const actionVerb = ACTION_VERBS[log.action] || log.action.toLowerCase();

  let targetName = "";
  try {
    if (log.newValues) {
      const vals = JSON.parse(log.newValues);
      targetName = vals.name || vals.title || "";
    }
  } catch {
    // ignore
  }

  const description = targetName
    ? `${actorName} ${actionVerb} ${entityLabel}: ${targetName}`
    : `${actorName} ${actionVerb} a ${entityLabel}`;

  return {
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    description,
    actorName,
    timestamp: new Date().toISOString(),
  };
}

// Determine which rooms a new audit log should go to
function resolveTargetRooms(log: {
  userId?: string | null;
  entityType: string;
  entityId?: string | null;
}): string[] {
  const rooms: string[] = ["notifications:global"];

  // If we know the entity type, try to resolve the organizational scope
  if (log.entityType === "park" && log.entityId) {
    rooms.push(`notifications:park:${log.entityId}`);
  } else if (log.entityType === "batch" && log.entityId) {
    // Batch belongs to a park
    rooms.push(`notifications:batch:${log.entityId}`);
  } else if (log.entityType === "group" && log.entityId) {
    rooms.push(`notifications:group:${log.entityId}`);
  } else if (log.entityType === "city" && log.entityId) {
    rooms.push(`notifications:city:${log.entityId}`);
  } else if (log.entityType === "attendance_events" && log.entityId) {
    rooms.push(`notifications:attendance:${log.entityId}`);
  } else if (log.entityType === "attendance_records" && log.entityId) {
    rooms.push(`notifications:attendance-record:${log.entityId}`);
  }

  return rooms;
}

// ─── Polling for New Audit Logs ─────────────────────────────────────────────

async function pollNewAuditLogs() {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        createdAt: { gt: lastPolledAt },
      },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    if (logs.length > 0) {
      // Update the watermark
      lastPolledAt = new Date();

      for (const log of logs) {
        const notification = formatNotification(log);
        const targetRooms = resolveTargetRooms(log);

        // For global rooms, always send
        // For scoped rooms, resolve to park/city level using the DB
        const resolvedRooms = await resolveRoomsToOrgScope(targetRooms, log);

        const payload: NotificationPayload = {
          type: "notification",
          data: notification,
        };

        for (const room of resolvedRooms) {
          io.to(room).emit("notification", payload);
        }

        console.log(
          `[notify] Broadcast audit log ${log.id} to ${resolvedRooms.length} room(s)`
        );
      }
    }
  } catch (err) {
    console.error("[notify] Poll error:", err);
  }
}

// Resolve room names to organizational scope rooms
async function resolveRoomsToOrgScope(
  rooms: string[],
  log: { userId?: string | null; entityType: string; entityId?: string | null }
): Promise<string[]> {
  const resolved = new Set<string>();

  // Always send to global (super_admin / program_admin)
  resolved.add("notifications:global");

  // If the actor has a staff meta, we can determine their scope
  if (log.userId) {
    const staffMeta = await prisma.staffMeta.findUnique({
      where: { userId: log.userId },
    });

    if (staffMeta) {
      if (staffMeta.assignedCityId) {
        resolved.add(`notifications:city:${staffMeta.assignedCityId}`);
      }
      if (staffMeta.assignedParkId) {
        resolved.add(`notifications:park:${staffMeta.assignedParkId}`);
      }
    }
  }

  // Also try to look up entity's parent scope
  if (log.entityType === "park" && log.entityId) {
    const park = await prisma.park.findUnique({
      where: { id: log.entityId },
      select: { cityId: true },
    });
    if (park) {
      resolved.add(`notifications:city:${park.cityId}`);
      resolved.add(`notifications:park:${log.entityId}`);
    }
  } else if (log.entityType === "batch" && log.entityId) {
    const batch = await prisma.batch.findUnique({
      where: { id: log.entityId },
      select: { parkId: true },
    });
    if (batch) {
      const park = await prisma.park.findUnique({
        where: { id: batch.parkId },
        select: { cityId: true },
      });
      if (park) {
        resolved.add(`notifications:city:${park.cityId}`);
      }
      resolved.add(`notifications:park:${batch.parkId}`);
    }
  } else if (log.entityType === "group" && log.entityId) {
    const group = await prisma.group.findUnique({
      where: { id: log.entityId },
      select: { batchId: true },
    });
    if (group) {
      const batch = await prisma.batch.findUnique({
        where: { id: group.batchId },
        select: { parkId: true },
      });
      if (batch) {
        const park = await prisma.park.findUnique({
          where: { id: batch.parkId },
          select: { cityId: true },
        });
        if (park) {
          resolved.add(`notifications:city:${park.cityId}`);
        }
        resolved.add(`notifications:park:${batch.parkId}`);
      }
    }
  } else if (log.entityType === "city" && log.entityId) {
    resolved.add(`notifications:city:${log.entityId}`);
  } else if (log.entityType === "user") {
    // User changes: broadcast globally and to relevant city/park if possible
    if (log.userId) {
      const staffMeta = await prisma.staffMeta.findUnique({
        where: { userId: log.userId },
      });
      if (staffMeta) {
        if (staffMeta.assignedCityId) {
          resolved.add(`notifications:city:${staffMeta.assignedCityId}`);
        }
        if (staffMeta.assignedParkId) {
          resolved.add(`notifications:park:${staffMeta.assignedParkId}`);
        }
      }
    }
  } else if (log.entityType === "attendance_events" && log.entityId) {
    // Attendance events belong to a group
    const group = await prisma.group.findFirst({
      where: {
        attendanceEvents: { some: { id: log.entityId } },
      },
      select: { batchId: true },
    });
    if (group) {
      const batch = await prisma.batch.findUnique({
        where: { id: group.batchId },
        select: { parkId: true },
      });
      if (batch) {
        const park = await prisma.park.findUnique({
          where: { id: batch.parkId },
          select: { cityId: true },
        });
        if (park) {
          resolved.add(`notifications:city:${park.cityId}`);
        }
        resolved.add(`notifications:park:${batch.parkId}`);
      }
    }
  }

  return Array.from(resolved);
}

// ─── Socket.IO Server ────────────────────────────────────────────────────────

const httpServer = createServer();
const io = new Server(httpServer, {
  // DO NOT change the path — Caddy uses it to forward to the correct port
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.on("connection", async (socket) => {
  // Authenticate via token query param
  const token = socket.handshake.auth.token as string | undefined;
  if (!token) {
    console.log(`[auth] Socket ${socket.id} rejected: no token`);
    socket.disconnect();
    return;
  }

  const user = await verifyToken(token);
  if (!user) {
    console.log(`[auth] Socket ${socket.id} rejected: invalid token`);
    socket.emit("error", { message: "Authentication failed" });
    socket.disconnect();
    return;
  }

  // Store user info
  socketUsers.set(socket.id, user);
  console.log(
    `[auth] Socket ${socket.id} connected: user=${user.userId} role=${user.role}`
  );

  // Auto-join role-based rooms
  const roleRooms = buildRoleRooms(user);
  for (const room of roleRooms) {
    socket.join(room);
    user.rooms.push(room);
  }
  console.log(
    `[rooms] Socket ${socket.id} joined: ${user.rooms.join(", ")}`
  );

  // ─── Events ────────────────────────────────────────────────────────────────

  socket.on(
    "join-role-scope",
    (data: {
      role: string;
      assignedCityId?: string;
      assignedParkId?: string;
    }) => {
      // Leave existing scope rooms
      for (const room of user.rooms) {
        socket.leave(room);
      }
      user.rooms = [];

      // Update user data
      user.role = data.role;
      user.assignedCityId = data.assignedCityId ?? null;
      user.assignedParkId = data.assignedParkId ?? null;

      // Re-join based on new scope
      const newRooms = buildRoleRooms(user);
      for (const room of newRooms) {
        socket.join(room);
        user.rooms.push(room);
      }

      console.log(
        `[rooms] Socket ${socket.id} re-joined: ${user.rooms.join(", ")}`
      );
    }
  );

  socket.on("subscribe-park", (data: { parkId: string }) => {
    const room = `notifications:park:${data.parkId}`;
    if (!user.rooms.includes(room)) {
      socket.join(room);
      user.rooms.push(room);
      console.log(
        `[rooms] Socket ${socket.id} subscribed to park: ${data.parkId}`
      );
    }
  });

  socket.on("disconnect", () => {
    for (const room of user.rooms) {
      socket.leave(room);
    }
    socketUsers.delete(socket.id);
    console.log(
      `[auth] Socket ${socket.id} disconnected (user=${user.userId})`
    );
  });

  socket.on("error", (error) => {
    console.error(`[error] Socket ${socket.id}:`, error);
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────

const PORT = 3003;
httpServer.listen(PORT, () => {
  console.log(`[notification-service] Running on port ${PORT}`);

  // Initialize the watermark to the current time so we don't
  // replay old logs on startup
  lastPolledAt = new Date();

  // Start polling for new audit logs every 2 seconds
  const pollingInterval = setInterval(pollNewAuditLogs, 2000);

  // Store for graceful shutdown
  (globalThis as any).__pollingInterval = pollingInterval;
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`\n[notification-service] Received ${signal}, shutting down...`);
  const pollingInterval = (globalThis as any).__pollingInterval;
  if (pollingInterval) clearInterval(pollingInterval);
  prisma.$disconnect();
  httpServer.close(() => {
    console.log("[notification-service] Server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));