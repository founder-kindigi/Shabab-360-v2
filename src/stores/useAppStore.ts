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
  | "admin-events"
  | "admin-events-detail"
  | "admin-calling"
  | "admin-calling-campaign-detail"
  | "admin-calling-templates"
  | "admin-settings"
  | "admin-users"
  | "admin-admissions"
  | "admin-fees"
  | "admin-announcements"
  | "admin-reports"
  | "admin-audit-log"
  | "admin-access"
  | "admin-access-management"
  | "admin-collaboration-teams"
  | "admin-mashwara"
  | "admin-mashwara-detail"
  | "notifications"
  // Murabbi pages
  | "murabbi-dashboard"
  | "murabbi-groups"
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
  | "student-announcements"
  | "student-fees"
  | "student-profile"
  // Guardian pages (extra)
  | "guardian-fees";

export type Language = "en" | "ur";
const MAX_NAVIGATION_HISTORY = 25;

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "en";
  return (localStorage.getItem("shabab360-language") as Language) || "en";
}

interface AppState {
  currentPage: PageId;
  previousPage: PageId | null;
  navigationHistory: PageId[];
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

  // Guardian
  selectedParticipantId: string | null;
  setSelectedParticipantId: (id: string | null) => void;

  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: "login",
  previousPage: null,
  navigationHistory: [],
  navigateTo: (page) =>
    set((state) => {
      if (page === state.currentPage) return state;

      const navigationHistory = [...state.navigationHistory, state.currentPage].slice(
        -MAX_NAVIGATION_HISTORY
      );
      return {
        currentPage: page,
        previousPage: state.currentPage,
        navigationHistory,
      };
    }),
  goBack: () =>
    set((state) => {
      const previousPage = state.navigationHistory.at(-1);
      if (!previousPage) {
        return {
          currentPage: "login",
          previousPage: null,
          navigationHistory: [],
        };
      }

      const navigationHistory = state.navigationHistory.slice(0, -1);
      return {
        currentPage: previousPage,
        previousPage: navigationHistory.at(-1) || null,
        navigationHistory,
      };
    }),

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

  selectedParticipantId: null,
  setSelectedParticipantId: (id) => set({ selectedParticipantId: id }),

  language: getInitialLanguage(),
  setLanguage: (lang) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("shabab360-language", lang);
    }
    set({ language: lang });
  },
}));
