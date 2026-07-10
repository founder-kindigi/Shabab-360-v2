// Role types
export type StaffRole =
  | "super_admin"
  | "program_admin"
  | "city_head"
  | "park_admin"
  | "park_lead"
  | "murabbi";

export type UserRole = StaffRole | "guardian" | "student";

// Workspace types
export type Workspace = "admin" | "park" | "guardian" | "student";

// Session user with extended fields
export interface ShababUser {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole | null;
  mustResetPwd?: boolean;
  assignedCityId?: string | null;
  assignedParkId?: string | null;
  assignedGroupId?: string | null;
}

// API response types
export interface ApiSuccess<T = any> {
  data: T;
}

export interface ApiError {
  error: string;
  details?: string;
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;

// Attendance status
export type AttendanceStatus = "present" | "absent" | "late" | "excused";

// Participant state
export type ParticipantState = "active" | "warning" | "dropout" | "graduated" | "inactive";