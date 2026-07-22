import { z } from "zod";

export const TEAM_CODES = ["sports", "skills", "tadreeb"] as const;
export type TeamCode = (typeof TEAM_CODES)[number];

export const TEAM_COLUMNS = ["exercises", "sports", "skills", "tadreeb"] as const;
export type TeamColumn = (typeof TEAM_COLUMNS)[number];

export const COLUMN_TO_TEAM: Record<TeamColumn, TeamCode> = {
  exercises: "sports",
  sports: "sports",
  skills: "skills",
  tadreeb: "tadreeb",
};

export const workbookContextSchema = z.object({
  cityName: z.string().min(1).max(100),
  batchName: z.string().min(1).max(100),
  parkName: z.string().nullable(),
});

export type WorkbookContext = z.infer<typeof workbookContextSchema>;

export const REQUIRED_COLUMNS = [
  "week", "day", "date", "exercises", "sports", "skills", "tadreeb", "areas_to_focus",
] as const;

export type ParsedBlock = {
  teamCode: TeamCode;
  category: string;
  content: string;
  sortOrder: number;
  sourceSheetName: string;
  sourceRow: number;
  sourceColumn: string;
};

export type ParsedSession = {
  weekLabel: string;
  dayLabel: string;
  sessionDate: string;
  sourceSheetName: string;
  sourceRow: number;
  focusArea: string | null;
  isOffDay: boolean;
  blocks: ParsedBlock[];
};

export type ParsedSheet = {
  sheetName: string;
  context: WorkbookContext;
  sessions: ParsedSession[];
  skippedPlaceholderRows: number;
  hasContent: boolean;
};

export type DryRunReport = {
  context: WorkbookContext;
  sheets: ParsedSheet[];
  totalSessions: number;
  totalBlocks: number;
  errors: { sheetName: string; row: number; column?: string; message: string }[];
  summary: {
    sheetsParsed: number;
    sessionsWithContent: number;
    sessionsPlaceholder: number;
    totalBlocks: number;
    blocksPerTeam: Record<string, number>;
    externalLinksFound: number;
    offDays: number;
  };
};
