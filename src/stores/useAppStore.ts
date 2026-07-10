import { create } from "zustand";
import type { UserRole } from "@/types";

export type PageId =
  // Auth pages
  | "login"
  | "reset-password"
  | "access-pending"
  // City Head pages
  | "city-head-dashboard"
  // Admin pages
  | "admin-dashboard"
  | "admin-cities"
  | "admin-parks"
  | "admin-batches"
  | "admin-groups"
  | "admin-people"
  | "admin-students"
  | "admin-guardians"
  | "admin-attendance-events"
  | "admin-settings"
  | "admin-users"
  | "admin-admissions"
  | "admin-fees"
  | "admin-announcements"
  | "admin-reports"
  | "admin-audit-log"
  // Murabbi pages
  | "murabbi-dashboard"
  // Park pages
  | "park-dashboard"
  | "park-attendance"
  | "park-roster"
  | "park-participants"
  | "park-guardians"
  | "park-schedule"
  | "park-attendance-roster"
  // Guardian pages
  | "guardian-dashboard"
  | "guardian-history"
  | "guardian-schedule"
  | "guardian-announcements"
  // Student pages
  | "student-dashboard"
  | "student-history"
  | "student-schedule"
  | "student-announcements";

interface AppState {
  currentPage: PageId;
  previousPage: PageId | null;
  navigateTo: (page: PageId) => void;
  goBack: () => void;

  selectedCityId: string | null;
  selectedParkId: string | null;
  selectedBatchId: string | null;
  selectedGroupId: string | null;
  setSelectedCity: (id: string | null) => void;
  setSelectedPark: (id: string | null) => void;
  setSelectedBatch: (id: string | null) => void;
  setSelectedGroup: (id: string | null) => void;

  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Auth state
  userRole: UserRole | null;
  setUserRole: (role: UserRole | null) => void;

  // Attendance
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: "login",
  previousPage: null,
  navigateTo: (page) =>
    set((state) => ({ currentPage: page, previousPage: state.currentPage })),
  goBack: () =>
    set((state) => ({
      currentPage: state.previousPage || "login",
      previousPage: null,
    })),

  selectedCityId: null,
  selectedParkId: null,
  selectedBatchId: null,
  selectedGroupId: null,
  setSelectedCity: (id) =>
    set({
      selectedCityId: id,
      selectedParkId: null,
      selectedBatchId: null,
      selectedGroupId: null,
    }),
  setSelectedPark: (id) =>
    set({ selectedParkId: id, selectedBatchId: null, selectedGroupId: null }),
  setSelectedBatch: (id) => set({ selectedBatchId: id, selectedGroupId: null }),
  setSelectedGroup: (id) => set({ selectedGroupId: id }),

  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  userRole: null,
  setUserRole: (role) => set({ userRole: role }),

  selectedEventId: null,
  setSelectedEventId: (id) => set({ selectedEventId: id }),
}));