import { z } from "zod";

export const participantIdSchema = z.string().cuid();

export const updateProfileSchema = z.object({
  // Education
  school: z.string().max(200).nullable().optional(),
  college: z.string().max(200).nullable().optional(),
  educationSystem: z.string().max(100).nullable().optional(),
  previousResults: z.string().max(2000).nullable().optional(),
  awardsAchievements: z.string().max(2000).nullable().optional(),
  averageGrade: z.string().max(50).nullable().optional(),
  favouriteSubjects: z.string().max(500).nullable().optional(),
  // Family & Background
  fatherName: z.string().max(200).nullable().optional(),
  fatherOccupation: z.string().max(200).nullable().optional(),
  siblings: z.string().max(500).nullable().optional(),
  nativeArea: z.string().max(200).nullable().optional(),
  ethnicity: z.string().max(100).nullable().optional(),
  modeOfTransport: z.string().max(100).nullable().optional(),
  // Interests & Skills
  subjectsOfInterest: z.string().max(500).nullable().optional(),
  extraCurricular: z.string().max(500).nullable().optional(),
  hobbies: z.string().max(500).nullable().optional(),
  sports: z.string().max(500).nullable().optional(),
  learningStyle: z.string().max(200).nullable().optional(),
  curiosity: z.string().max(500).nullable().optional(),
  specialTalent: z.string().max(500).nullable().optional(),
  currentSkills: z.string().max(1000).nullable().optional(),
  skillsWantToLearn: z.string().max(1000).nullable().optional(),
  // Goals & Development
  generalGoals: z.string().max(1000).nullable().optional(),
  vision: z.string().max(1000).nullable().optional(),
  mission: z.string().max(1000).nullable().optional(),
  careerAspirations: z.string().max(1000).nullable().optional(),
  academicInterests: z.string().max(500).nullable().optional(),
  collegePlans: z.string().max(1000).nullable().optional(),
  futureCareerGoals: z.string().max(1000).nullable().optional(),
  strengths: z.string().max(2000).nullable().optional(),
  weaknesses: z.string().max(2000).nullable().optional(),
  goodHabits: z.string().max(1000).nullable().optional(),
  // Support & Wellbeing (sensitive — requires sensitive.manage)
  financialStatus: z.string().max(500).nullable().optional(),
  deenBackground: z.string().max(2000).nullable().optional(),
  badHabits: z.string().max(1000).nullable().optional(),
  disability: z.string().max(1000).nullable().optional(),
  specialNeed: z.string().max(1000).nullable().optional(),
  moralCharacter: z.string().max(2000).nullable().optional(),
  namaz: z.string().max(1000).nullable().optional(),
  // Personality & Skills
  leadershipSkills: z.string().max(500).nullable().optional(),
  personalityResponsibility: z.string().max(500).nullable().optional(),
  communicationSkills: z.string().max(500).nullable().optional(),
  teamworkSkills: z.string().max(500).nullable().optional(),
  problemSolvingSkills: z.string().max(500).nullable().optional(),
  creativity: z.string().max(500).nullable().optional(),
  criticalThinking: z.string().max(500).nullable().optional(),
  adaptability: z.string().max(500).nullable().optional(),
  initiative: z.string().max(500).nullable().optional(),
  selfMotivation: z.string().max(500).nullable().optional(),
  integrity: z.string().max(500).nullable().optional(),
  empathy: z.string().max(500).nullable().optional(),
  reading: z.string().max(500).nullable().optional(),
  learningInterest: z.string().max(500).nullable().optional(),
}).strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const listSearchSchema = z.object({
  cityId: z.string().cuid().optional(),
  query: z.string().max(100).nullable().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Sensitive wellbeing fields that must be stripped from non-sensitive responses and audit logs. */
export const SENSITIVE_PROFILE_FIELDS = [
  "financialStatus", "deenBackground", "badHabits",
  "disability", "specialNeed", "moralCharacter", "namaz",
] as const;
