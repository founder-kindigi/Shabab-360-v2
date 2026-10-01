// src/components/prototype/data/proto-data.ts
// Comprehensive prototype data for Shabab 360 full system prototype

export interface ProtoCity {
  id: string;
  name: string;
  head: string;
  parks: number;
  shabab: number;
  activeRate: number;
}

export interface ProtoPark {
  id: string;
  name: string;
  city: string;
  lead: string;
  admin: string;
  groups: number;
  shabab: number;
  totalShabab: number;
  status: string;
}

export interface ProtoGroup {
  id: string;
  park: string;
  name: string;
  murabbi: string;
  shabab: number;
  presentToday: number;
}

export interface ProtoShabab {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  age: number;
  grade: string;
  group: string;
  groupId: string;
  park?: string;
  status: string;
  attendance: number;
  guardian: string;
  guardianName: string;
  phone: string;
  guardianPhone: string;
}

export interface ProtoStaff {
  id: string;
  name: string;
  role: string;
  roles: string[];
  park: string | null;
  parkAssigned?: string | null;
  group: string | null;
  city: string;
  team: string | null;
  active: boolean;
  isActive: boolean;
}

export interface ProtoAdmission {
  id: string;
  name: string;
  age: number;
  grade: string;
  status: string;
  date: string;
  phone: string;
  park: string | null;
  parkAssigned?: string | null;
}

export interface ProtoActionItem {
  task: string;
  assignee: string;
  assignedTo?: string;
  team: string;
  due: string;
  status: string;
}

export interface ProtoMashwara {
  id: string;
  title: string;
  date: string;
  scope: string;
  facilitator: string;
  attendees: number | string[];
  attendeesCount: number;
  status: string;
  decisions: string[];
  actions: ProtoActionItem[];
  actionItems: ProtoActionItem[];
}

export interface ProtoEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  scope: string;
  venue: string;
  status: string;
  capacity: number;
  responsible: string;
  responsiblePerson: string;
}

export interface ProtoCallingLead {
  id: string;
  name: string;
  phone: string;
  status: string;
  outcome: string | null;
  caller: string;
  callerName: string;
  nextAction: string | null;
}

export interface ProtoContentPlan {
  id: string;
  week: number;
  weekNo: number;
  weekNumber: number;
  category: string;
  topic: string;
  theme: string;
  topics: string[];
  objectives: string;
  materials: string;
  delivery: string;
  deliveryMethod: string;
  status: string;
}

export interface ProtoAttendanceSession {
  id: string;
  date: string;
  park: string;
  group: string;
  type: string;
  facilitator: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  status: string;
  notes: string;
}

export interface ProtoFinance {
  id: string;
  type: string;
  participant: string | null;
  participantOrDonor: string | null;
  amount: number;
  date: string;
  status: string;
  receipt: string | null;
  receiptNumber: string | null;
}

export interface ProtoNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: string;
}

export interface ProtoAnnouncement {
  id: string;
  title: string;
  body: string;
  content: string;
  date: string;
  author: string;
  audience: string;
  priority: string;
  type: string;
}

export const PROTO_CITIES: ProtoCity[] = [
  { id: "city-lhr", name: "Lahore", head: "Br. Tariq Mahmood", parks: 6, shabab: 254, activeRate: 84 },
  { id: "city-khi", name: "Karachi", head: "Br. Adnan Siddiqui", parks: 4, shabab: 188, activeRate: 79 },
  { id: "city-isl", name: "Islamabad", head: "Br. Zafar Iqbal", parks: 3, shabab: 122, activeRate: 88 },
];

export const PROTO_PARKS: ProtoPark[] = [
  { id: "park-sl", name: "State Life Park", city: "Lahore", lead: "Br. Usman Ali", admin: "Br. Bilal Ahmed", groups: 3, shabab: 52, totalShabab: 52, status: "Active" },
  { id: "park-gp", name: "Gulberg Park", city: "Lahore", lead: "Br. Hassan Raza", admin: "Br. Kamran Asif", groups: 2, shabab: 38, totalShabab: 38, status: "Active" },
  { id: "park-jp", name: "Johar Park", city: "Lahore", lead: "Br. Sajid Mehmood", admin: "Br. Rizwan Shah", groups: 3, shabab: 47, totalShabab: 47, status: "Active" },
];

export const PROTO_GROUPS: ProtoGroup[] = [
  { id: "grp-sl-a", park: "State Life Park", name: "Group A (Senior)", murabbi: "Br. Ali Raza", shabab: 18, presentToday: 15 },
  { id: "grp-sl-b", park: "State Life Park", name: "Group B (Junior)", murabbi: "Br. Imran Shah", shabab: 17, presentToday: 14 },
  { id: "grp-sl-c", park: "State Life Park", name: "Group C (Senior)", murabbi: "Br. Waseem Akram", shabab: 17, presentToday: 13 },
];

export const PROTO_SHABAB: ProtoShabab[] = [
  { id: "s001", name: "Muhammad Abdullah", firstName: "Muhammad", lastName: "Abdullah", age: 16, grade: "10th", group: "Group A", groupId: "grp-sl-a", park: "State Life Park", status: "Present", attendance: 91, guardian: "Br. Ahmad Abdullah", guardianName: "Br. Ahmad Abdullah", phone: "0300-1234567", guardianPhone: "0300-1234567" },
  { id: "s002", name: "Usman Tariq", firstName: "Usman", lastName: "Tariq", age: 15, grade: "9th", group: "Group A", groupId: "grp-sl-a", park: "State Life Park", status: "Present", attendance: 88, guardian: "Br. Tariq Usman", guardianName: "Br. Tariq Usman", phone: "0301-2345678", guardianPhone: "0301-2345678" },
  { id: "s003", name: "Hamza Ali", firstName: "Hamza", lastName: "Ali", age: 16, grade: "10th", group: "Group A", groupId: "grp-sl-a", park: "State Life Park", status: "Absent", attendance: 74, guardian: "Br. Ali Hamza", guardianName: "Br. Ali Hamza", phone: "0302-3456789", guardianPhone: "0302-3456789" },
  { id: "s004", name: "Ibrahim Hassan", firstName: "Ibrahim", lastName: "Hassan", age: 15, grade: "9th", group: "Group A", groupId: "grp-sl-a", park: "State Life Park", status: "Present", attendance: 95, guardian: "Br. Hassan Ibrahim", guardianName: "Br. Hassan Ibrahim", phone: "0303-4567890", guardianPhone: "0303-4567890" },
  { id: "s005", name: "Saad Mahmood", firstName: "Saad", lastName: "Mahmood", age: 17, grade: "11th", group: "Group A", groupId: "grp-sl-a", park: "State Life Park", status: "Late", attendance: 82, guardian: "Br. Mahmood Saad", guardianName: "Br. Mahmood Saad", phone: "0304-5678901", guardianPhone: "0304-5678901" },
  { id: "s006", name: "Yahya Qureshi", firstName: "Yahya", lastName: "Qureshi", age: 16, grade: "10th", group: "Group A", groupId: "grp-sl-a", park: "Gulberg Park", status: "Present", attendance: 89, guardian: "Br. Qureshi Yahya", guardianName: "Br. Qureshi Yahya", phone: "0305-6789012", guardianPhone: "0305-6789012" },
  { id: "s007", name: "Talha Awan", firstName: "Talha", lastName: "Awan", age: 15, grade: "9th", group: "Group B", groupId: "grp-sl-b", park: "Gulberg Park", status: "Present", attendance: 79, guardian: "Br. Awan Talha", guardianName: "Br. Awan Talha", phone: "0306-7890123", guardianPhone: "0306-7890123" },
  { id: "s008", name: "Bilal Chaudhry", firstName: "Bilal", lastName: "Chaudhry", age: 16, grade: "10th", group: "Group B", groupId: "grp-sl-b", park: "Johar Park", status: "Excused", attendance: 85, guardian: "Br. Chaudhry Bilal", guardianName: "Br. Chaudhry Bilal", phone: "0307-8901234", guardianPhone: "0307-8901234" },
  { id: "s009", name: "Zain Farooq", firstName: "Zain", lastName: "Farooq", age: 17, grade: "11th", group: "Group B", groupId: "grp-sl-b", park: "Johar Park", status: "Present", attendance: 93, guardian: "Br. Farooq Zain", guardianName: "Br. Farooq Zain", phone: "0308-9012345", guardianPhone: "0308-9012345" },
  { id: "s010", name: "Rayyan Malik", firstName: "Rayyan", lastName: "Malik", age: 15, grade: "9th", group: "Group B", groupId: "grp-sl-b", park: "State Life Park", status: "Absent", attendance: 68, guardian: "Br. Malik Rayyan", guardianName: "Br. Malik Rayyan", phone: "0309-0123456", guardianPhone: "0309-0123456" },
];

export const PROTO_STAFF: ProtoStaff[] = [
  { id: "stf-001", name: "Br. Ali Raza", role: "murabbi", roles: ["murabbi"], park: "State Life Park", parkAssigned: "State Life Park", group: "Group A", city: "Lahore", team: "Tadreeb", active: true, isActive: true },
  { id: "stf-002", name: "Br. Imran Shah", role: "murabbi", roles: ["murabbi"], park: "State Life Park", parkAssigned: "State Life Park", group: "Group B", city: "Lahore", team: "Skills", active: true, isActive: true },
  { id: "stf-003", name: "Br. Usman Ali", role: "park_lead", roles: ["park_lead"], park: "State Life Park", parkAssigned: "State Life Park", group: null, city: "Lahore", team: "Sports", active: true, isActive: true },
  { id: "stf-004", name: "Br. Bilal Ahmed", role: "park_admin", roles: ["park_admin"], park: "State Life Park", parkAssigned: "State Life Park", group: null, city: "Lahore", team: "Media", active: true, isActive: true },
  { id: "stf-005", name: "Br. Tariq Mahmood", role: "city_head", roles: ["city_head"], park: null, parkAssigned: null, group: null, city: "Lahore", team: null, active: true, isActive: true },
];

export const PROTO_ADMISSIONS: ProtoAdmission[] = [
  { id: "adm-001", name: "Hamid Nawaz", age: 15, grade: "9th", status: "Interview Scheduled", date: "2026-08-10", phone: "0311-1111111", park: "State Life Park", parkAssigned: "State Life Park" },
  { id: "adm-002", name: "Fawad Akhtar", age: 16, grade: "10th", status: "New", date: "2026-08-01", phone: "0312-2222222", park: null, parkAssigned: null },
  { id: "adm-003", name: "Khalid Mehmood", age: 15, grade: "9th", status: "Interviewed", date: "2026-07-28", phone: "0313-3333333", park: null, parkAssigned: null },
  { id: "adm-004", name: "Saqib Hussain", age: 17, grade: "11th", status: "Approved", date: "2026-07-25", phone: "0314-4444444", park: "Gulberg Park", parkAssigned: "Gulberg Park" },
  { id: "adm-005", name: "Naveed Aslam", age: 16, grade: "10th", status: "Enrolled", date: "2026-07-20", phone: "0315-5555555", park: "Johar Park", parkAssigned: "Johar Park" },
  { id: "adm-006", name: "Adeel Baig", age: 15, grade: "9th", status: "Hold", date: "2026-07-18", phone: "0316-6666666", park: null, parkAssigned: null },
  { id: "adm-007", name: "Junaid Raza", age: 16, grade: "10th", status: "New", date: "2026-08-02", phone: "0317-7777777", park: null, parkAssigned: null },
  { id: "adm-008", name: "Kashif Amin", age: 17, grade: "11th", status: "Rejected", date: "2026-07-15", phone: "0318-8888888", park: null, parkAssigned: null },
];

const sampleActions: ProtoActionItem[] = [
  { task: "Prepare closing ceremony plan", assignee: "Br. Ali Raza", assignedTo: "Br. Ali Raza", team: "Tadreeb", due: "2026-08-15", status: "Open" },
  { task: "Call 5 absentee guardians", assignee: "Br. Imran Shah", assignedTo: "Br. Imran Shah", team: "Skills", due: "2026-08-08", status: "In Progress" },
];

export const PROTO_MASHWARA: ProtoMashwara[] = [
  {
    id: "msh-001", title: "Weekly Mashwara — Week 18", date: "2026-08-03", scope: "City",
    facilitator: "Br. Tariq Mahmood", attendees: 12, attendeesCount: 12, status: "Completed",
    decisions: ["Attend Johar park on 10-Aug", "Review dropout policy", "Plan closing ceremony"],
    actions: sampleActions,
    actionItems: sampleActions,
  },
  {
    id: "msh-002", title: "Weekly Mashwara — Week 17", date: "2026-07-27", scope: "Park",
    facilitator: "Br. Usman Ali", attendees: 8, attendeesCount: 8, status: "Completed",
    decisions: ["Start evening batch for Group C", "Request Sports equipment"],
    actions: [{ task: "Submit inventory request", assignee: "Br. Bilal Ahmed", assignedTo: "Br. Bilal Ahmed", team: "Sports", due: "2026-08-01", status: "Done" }],
    actionItems: [{ task: "Submit inventory request", assignee: "Br. Bilal Ahmed", assignedTo: "Br. Bilal Ahmed", team: "Sports", due: "2026-08-01", status: "Done" }],
  },
];

export const PROTO_EVENTS: ProtoEvent[] = [
  { id: "ev-001", title: "Closing Ceremony — Batch 4", date: "2026-08-30", time: "10:00 AM", type: "Ceremony", scope: "City", venue: "Alhamra Hall", status: "Planning", capacity: 300, responsible: "Br. Tariq Mahmood", responsiblePerson: "Br. Tariq Mahmood" },
  { id: "ev-002", title: "Swimming Activity", date: "2026-08-15", time: "09:00 AM", type: "Activity", scope: "Park", venue: "WAPDA Pool", status: "Confirmed", capacity: 50, responsible: "Br. Hassan Raza", responsiblePerson: "Br. Hassan Raza" },
  { id: "ev-003", title: "Hiking Trip — Margalla Hills", date: "2026-09-05", time: "06:00 AM", type: "Activity", scope: "City", venue: "Margalla Hills Trail 3", status: "Planning", capacity: 80, responsible: "Br. Faisal Nawaz", responsiblePerson: "Br. Faisal Nawaz" },
];

export const PROTO_CALLING_LEADS: ProtoCallingLead[] = [
  { id: "lead-001", name: "Asad Khalil (Guardian)", phone: "0320-1111111", status: "Called", outcome: "Interview Confirmed", caller: "Br. Zain (Caller)", callerName: "Br. Zain (Caller)", nextAction: null },
  { id: "lead-002", name: "Pervaiz Butt (Guardian)", phone: "0321-2222222", status: "Pending", outcome: null, caller: "Unassigned", callerName: "Unassigned", nextAction: "Call before Fri" },
  { id: "lead-003", name: "Shakeel Ahmed (Guardian)", phone: "0322-3333333", status: "No Answer", outcome: null, caller: "Br. Omar (Caller)", callerName: "Br. Omar (Caller)", nextAction: "Retry tomorrow" },
  { id: "lead-004", name: "Mian Arshad (Guardian)", phone: "0323-4444444", status: "Not Interested", outcome: "Declined", caller: "Br. Zain (Caller)", callerName: "Br. Zain (Caller)", nextAction: null },
  { id: "lead-005", name: "Dr. Akram Qureshi (Guardian)", phone: "0324-5555555", status: "Follow Up", outcome: "Interested", caller: "Br. Omar (Caller)", callerName: "Br. Omar (Caller)", nextAction: "Send WhatsApp link" },
];

export const PROTO_CONTENT_PLAN: ProtoContentPlan[] = [
  { id: "cp-001", week: 18, weekNo: 18, weekNumber: 18, category: "Tadreeb", topic: "Leadership & Accountability", theme: "Leadership & Accountability", topics: ["Leadership & Accountability"], objectives: "Understand responsibility in leadership roles", materials: "Workbook Ch. 7, Activity Cards", delivery: "Group discussion + role play", deliveryMethod: "Group discussion + role play", status: "Planned" },
  { id: "cp-002", week: 18, weekNo: 18, weekNumber: 18, category: "Skills", topic: "Public Speaking Fundamentals", theme: "Public Speaking Fundamentals", topics: ["Public Speaking Fundamentals"], objectives: "Build confidence in speaking to groups", materials: "Speech template, Timer", delivery: "Individual presentations", deliveryMethod: "Individual presentations", status: "Planned" },
  { id: "cp-003", week: 18, weekNo: 18, weekNumber: 18, category: "Sports", topic: "Football — Teamwork Drills", theme: "Football — Teamwork Drills", topics: ["Football — Teamwork Drills"], objectives: "Coordination and teamwork through sport", materials: "Football, cones", delivery: "Outdoor session", deliveryMethod: "Outdoor session", status: "Planned" },
  { id: "cp-004", week: 17, weekNo: 17, weekNumber: 17, category: "Tadreeb", topic: "Time Management", theme: "Time Management", topics: ["Time Management"], objectives: "Prioritise tasks and manage daily schedule", materials: "Workbook Ch. 6", delivery: "Interactive lecture", deliveryMethod: "Interactive lecture", status: "Delivered" },
];

export const PROTO_ATTENDANCE_SESSIONS: ProtoAttendanceSession[] = [
  { id: "sess-001", date: "2026-08-03", park: "State Life Park", group: "Group A", type: "Class", facilitator: "Br. Ali Raza", present: 15, absent: 2, late: 1, excused: 0, total: 18, status: "Closed", notes: "Regular session" },
  { id: "sess-002", date: "2026-08-03", park: "State Life Park", group: "Group B", type: "Class", facilitator: "Br. Imran Shah", present: 14, absent: 2, late: 0, excused: 1, total: 17, status: "Closed", notes: "Regular session" },
  { id: "sess-003", date: "2026-08-10", park: "State Life Park", group: "Group A", type: "Class", facilitator: "Br. Ali Raza", present: 0, absent: 0, late: 0, excused: 0, total: 18, status: "Open", notes: "Upcoming session" },
];

export const PROTO_FINANCE: ProtoFinance[] = [
  { id: "fin-001", type: "Registration Fee", participant: "Muhammad Abdullah", participantOrDonor: "Muhammad Abdullah", amount: 500, date: "2026-06-15", status: "Paid", receipt: "RCP-001", receiptNumber: "RCP-001" },
  { id: "fin-002", type: "Event Fee — Swimming", participant: "Usman Tariq", participantOrDonor: "Usman Tariq", amount: 300, date: "2026-08-01", status: "Pending", receipt: null, receiptNumber: null },
  { id: "fin-003", type: "Donation", participant: "Br. Ahmad Butt (External)", participantOrDonor: "Br. Ahmad Butt (External)", amount: 5000, date: "2026-07-20", status: "Received", receipt: "RCP-002", receiptNumber: "RCP-002" },
  { id: "fin-004", type: "Sports Equipment", participant: null, participantOrDonor: "Sports Supplier", amount: 12000, date: "2026-07-25", status: "Expense", receipt: "EXP-001", receiptNumber: "EXP-001" },
];

export const PROTO_NOTIFICATIONS: ProtoNotification[] = [
  { id: "notif-001", title: "Attendance Open — Group A", body: "Today's session has been opened. Mark attendance now.", time: "08:45 AM", read: false, type: "action" },
  { id: "notif-002", title: "New Admission Application", body: "Fawad Akhtar has submitted an application for Batch 4.", time: "Yesterday", read: false, type: "info" },
  { id: "notif-003", title: "Mashwara Scheduled", body: "City Mashwara Week 19 is scheduled for Sunday 10-Aug at 10:00 AM.", time: "2 days ago", read: true, type: "info" },
  { id: "notif-004", title: "Low Attendance Alert", body: "Rayyan Malik's attendance dropped to 68%. Follow-up required.", time: "3 days ago", read: true, type: "warning" },
];

export const PROTO_ANNOUNCEMENTS: ProtoAnnouncement[] = [
  { id: "ann-001", title: "Closing Ceremony Date Confirmed", body: "Batch 4 Closing Ceremony will be held on 30th August at Alhamra Hall.", content: "Batch 4 Closing Ceremony will be held on 30th August at Alhamra Hall.", date: "2026-08-04", author: "Br. Tariq Mahmood", audience: "All", priority: "High", type: "Announcement" },
  { id: "ann-002", title: "Swimming Activity — Parental Consent Required", body: "Please ensure guardian consent forms are submitted by 12th August.", content: "Please ensure guardian consent forms are submitted by 12th August.", date: "2026-08-02", author: "Br. Usman Ali", audience: "Guardians", priority: "Medium", type: "Consent Request" },
  { id: "ann-003", title: "Batch 5 Admissions Opening Soon", body: "Applications for Batch 5 will open in September.", content: "Applications for Batch 5 will open in September.", date: "2026-07-30", author: "HQ", audience: "All", priority: "Normal", type: "Notice" },
];

export const STATUS_COLORS: Record<string, string> = {
  Present: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Absent: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20",
  Late: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Excused: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  New: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20",
  "Interview Scheduled": "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  Interviewed: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Approved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Enrolled: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20",
  Rejected: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20",
  Hold: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20",
  Planning: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20",
  Confirmed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Completed: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20",
  Open: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Closed: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20",
  Paid: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Called: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "No Answer": "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  "Not Interested": "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20",
  "Follow Up": "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  Delivered: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20",
  Planned: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20",
  "In Progress": "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  Done: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Received: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20",
  Expense: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20",
};
