import { create } from "zustand";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PresenceUser {
  userId: string;
  role: string;
}

interface PresenceState {
  onlineUsers: Record<string, PresenceUser>;
  setOnlineUsers: (users: Record<string, PresenceUser>) => void;
  isUserOnline: (userId: string) => boolean;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUsers: {},

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  isUserOnline: (userId: string) => {
    const { onlineUsers } = get();
    return Object.values(onlineUsers).some((u) => u.userId === userId);
  },
}));