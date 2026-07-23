import { describe, expect, it } from "vitest";
import { updateProfileSchema, listSearchSchema, SENSITIVE_PROFILE_FIELDS } from "@/lib/student-profile/zod";

describe("Student profile Zod schemas", () => {
  it("accepts a valid partial update with non-sensitive fields", () => {
    const result = updateProfileSchema.safeParse({
      school: "Lahore Grammar School",
      hobbies: "Cricket, Reading",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid full update including sensitive fields", () => {
    const result = updateProfileSchema.safeParse({
      school: "School",
      college: "College",
      educationSystem: "Matric",
      previousResults: "A grades",
      awardsAchievements: "Best Student",
      averageGrade: "A",
      favouriteSubjects: "Math",
      fatherName: "John",
      fatherOccupation: "Engineer",
      siblings: "2 brothers",
      nativeArea: "Lahore",
      ethnicity: "Punjabi",
      modeOfTransport: "Bus",
      subjectsOfInterest: "Science",
      extraCurricular: "Football",
      hobbies: "Reading",
      sports: "Cricket",
      learningStyle: "Visual",
      curiosity: "High",
      specialTalent: "Painting",
      currentSkills: "Coding",
      skillsWantToLearn: "AI",
      generalGoals: "Become engineer",
      vision: "Help community",
      mission: "Study hard",
      careerAspirations: "Engineer",
      academicInterests: "Physics",
      collegePlans: "LUMS",
      futureCareerGoals: "CEO",
      strengths: "Hardworking",
      weaknesses: "Impatient",
      goodHabits: "Punctual",
      financialStatus: "Middle class",
      deenBackground: "Practicing",
      badHabits: "None",
      disability: "None",
      specialNeed: "None",
      moralCharacter: "Good",
      namaz: "Five times",
      leadershipSkills: "High",
      personalityResponsibility: "High",
      communicationSkills: "Good",
      teamworkSkills: "Good",
      problemSolvingSkills: "Good",
      creativity: "Good",
      criticalThinking: "Good",
      adaptability: "Good",
      initiative: "Good",
      selfMotivation: "High",
      integrity: "High",
      empathy: "High",
      reading: "Daily",
      learningInterest: "High",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown fields (strict mode)", () => {
    const result = updateProfileSchema.safeParse({
      school: "School",
      participantId: "should-not-be-allowed",
      cityId: "should-not-be-allowed",
    });
    expect(result.success).toBe(false);
  });

  it("rejects fields exceeding max length", () => {
    const result = updateProfileSchema.safeParse({
      school: "A".repeat(300),
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty object (no fields to update)", () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("listSearchSchema accepts valid params", () => {
    const result = listSearchSchema.safeParse({ cityId: "c123456789012345678901abc", page: 2, limit: 50 });
    expect(result.success).toBe(true);
  });

  it("listSearchSchema rejects page < 1", () => {
    const result = listSearchSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it("SENSITIVE_PROFILE_FIELDS contains exactly 7 wellbeing fields", () => {
    expect(SENSITIVE_PROFILE_FIELDS).toHaveLength(7);
    expect(SENSITIVE_PROFILE_FIELDS).toContain("financialStatus");
    expect(SENSITIVE_PROFILE_FIELDS).toContain("disability");
  });
});
