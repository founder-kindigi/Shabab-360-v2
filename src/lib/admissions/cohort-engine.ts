/**
 * Cohort Placement Engine for Shabab 360 Admissions
 * Automatically maps applicant age and grade/education level to appropriate cohort groups (Senior / Junior).
 */

export interface CohortRecommendation {
  cohortName: "Senior" | "Junior";
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

const SENIOR_GRADE_KEYWORDS = [
  "10th", "11th", "12th", "college", "university", "intermediate",
  "fsc", "fa", "ics", "a level", "a-level", "o level 3", "matric"
];

const JUNIOR_GRADE_KEYWORDS = [
  "6th", "7th", "8th", "9th", "middle", "primary", "grade 6",
  "grade 7", "grade 8", "grade 9"
];

export function recommendCohort(
  age?: number | null,
  gradeClass?: string | null
): CohortRecommendation {
  const normalizedGrade = gradeClass?.toLowerCase().trim() || "";

  // 1. Evaluate Grade / Previous Education keywords
  const isSeniorGrade = SENIOR_GRADE_KEYWORDS.some((kw) => normalizedGrade.includes(kw));
  const isJuniorGrade = JUNIOR_GRADE_KEYWORDS.some((kw) => normalizedGrade.includes(kw));

  // 2. Evaluate Age
  if (age !== undefined && age !== null && !isNaN(age)) {
    if (age >= 16) {
      return {
        cohortName: "Senior",
        confidence: isSeniorGrade ? "high" : "medium",
        reasoning: `Applicant age ${age} is 16 or above${gradeClass ? ` (${gradeClass})` : ""}`,
      };
    }
    if (age > 0 && age < 16) {
      return {
        cohortName: "Junior",
        confidence: isJuniorGrade ? "high" : "medium",
        reasoning: `Applicant age ${age} is under 16${gradeClass ? ` (${gradeClass})` : ""}`,
      };
    }
  }

  // 3. Grade-only matching when age is unavailable
  if (isSeniorGrade) {
    return {
      cohortName: "Senior",
      confidence: "medium",
      reasoning: `Matched senior education level: ${gradeClass}`,
    };
  }

  if (isJuniorGrade) {
    return {
      cohortName: "Junior",
      confidence: "medium",
      reasoning: `Matched junior education level: ${gradeClass}`,
    };
  }

  // 4. Fallback default
  return {
    cohortName: "Junior",
    confidence: "low",
    reasoning: "Default cohort recommendation based on entry profile",
  };
}
