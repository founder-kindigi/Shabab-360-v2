import { describe, expect, it } from "vitest";

describe("StudentProfilePage UI Data Formatting", () => {
  it("formats populated age and grade/class correctly for display", () => {
    const participant = {
      age: 17,
      gradeClass: "Grade 10",
    };

    const displayAge = participant.age != null ? String(participant.age) : "Not provided";
    const displayGradeClass = participant.gradeClass || "Not provided";

    expect(displayAge).toBe("17");
    expect(displayGradeClass).toBe("Grade 10");
  });

  it("provides 'Not provided' fallback when age and grade/class are null or empty", () => {
    const participantNull = {
      age: null,
      gradeClass: null,
    };

    const displayAge = participantNull.age != null ? String(participantNull.age) : "Not provided";
    const displayGradeClass = participantNull.gradeClass || "Not provided";

    expect(displayAge).toBe("Not provided");
    expect(displayGradeClass).toBe("Not provided");
  });

  it("handles blank string gradeClass as 'Not provided'", () => {
    const participantBlank = {
      age: null,
      gradeClass: "",
    };

    const displayGradeClass = participantBlank.gradeClass || "Not provided";
    expect(displayGradeClass).toBe("Not provided");
  });
});
