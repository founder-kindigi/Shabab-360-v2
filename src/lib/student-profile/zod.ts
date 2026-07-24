import { z } from "zod";

export const participantIdSchema = z.string().cuid();

export const updateProfileSchema = z.object({
  // Education
  school: z.string().max(200).optional(),
  college: z.string().max(200).optional(),
  educationSystem: z.string().max(100).optional(),
  previousResults: z.string().max(2000).optional(),
  awardsAchievements: z.string().max(2000).optional(),
  averageGrade: z.string().max(50).optional(),
  favouriteSubjects: z.string().max(500).optional(),
  // Family & Background
  fatherName: z.string().max(200).optional(),
  fatherOccupation: z.string().max(200).optional(),
  siblings: z.string().max(500).optional(),
  nativeArea: z.string().max(200).optional(),
  ethnicity: z.string().max(100).optional(),
  modeOfTransport: z.string().max(100).optional(),
  // Interests & Skills
  subjectsOfInterest: z.string().max(500).optional(),
  extraCurricular: z.string().max(500).optional(),
  hobbies: z.string().max(500).optional(),
  sports: z.string().max(500).optional(),
  learningStyle: z.string().max(200).optional(),
  curiosity: z.string().max(500).optional(),
  specialTalent: z.string().max(500).optional(),
  currentSkills: z.string().max(1000).optional(),
  skillsWantToLearn: z.string().max(1000).optional(),
  // Goals & Development
  generalGoals: z.string().max(1000).optional(),
  vision: z.string().max(1000).optional(),
  mission: z.string().max(1000).optional(),
  careerAspirations: z.string().max(1000).optional(),
  academicInterests: z.string().max(500).optional(),
  collegePlans: z.string().max(1000).optional(),
  futureCareerGoals: z.string().max(1000).optional(),
  strengths: z.string().max(2000).optional(),
  weaknesses: z.string().max(2000).optional(),
  goodHabits: z.string().max(1000).optional(),
  // Support & Wellbeing (sensitive — requires sensitive.manage)
  financialStatus: z.string().max(500).optional(),
  deenBackground: z.string().max(2000).optional(),
  badHabits: z.string().max(1000).optional(),
  disability: z.string().max(1000).optional(),
  specialNeed: z.string().max(1000).optional(),
  moralCharacter: z.string().max(2000).optional(),
  namaz: z.string().max(1000).optional(),
  // Personality & Skills
  leadershipSkills: z.string().max(500).optional(),
  personalityResponsibility: z.string().max(500).optional(),
  communicationSkills: z.string().max(500).optional(),
  teamworkSkills: z.string().max(500).optional(),
  problemSolvingSkills: z.string().max(500).optional(),
  creativity: z.string().max(500).optional(),
  criticalThinking: z.string().max(500).optional(),
  adaptability: z.string().max(500).optional(),
  initiative: z.string().max(500).optional(),
  selfMotivation: z.string().max(500).optional(),
  integrity: z.string().max(500).optional(),
  empathy: z.string().max(500).optional(),
  reading: z.string().max(500).optional(),
  learningInterest: z.string().max(500).optional(),
}).strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const listSearchSchema = z.object({
  cityId: z.string().cuid().optional(),
  query: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Sensitive wellbeing fields that must be stripped from non-sensitive responses and audit logs. */
export const SENSITIVE_PROFILE_FIELDS = [
  "financialStatus", "deenBackground", "badHabits",
  "disability", "specialNeed", "moralCharacter", "namaz",
] as const;
