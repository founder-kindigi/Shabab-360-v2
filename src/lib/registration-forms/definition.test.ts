import { describe, expect, it } from "vitest";
import { formFieldsSchema, formSettingsSchema, parseFormAnswers, publicationError } from "./definition";
import { ATFAL_CITY_OPTIONS, ATFAL_STYLE_FIELDS, EMPTY_FORM_SETTINGS } from "./template";

const fields = formFieldsSchema.parse(ATFAL_STYLE_FIELDS);
const settings = formSettingsSchema.parse({ ...EMPTY_FORM_SETTINGS, privacyNotice: "We use these details to process this registration.", contactConsentText: "I agree to be contacted about this registration.", minimumAge: 18, ageFieldKey: "age" });
const answers = { fullName: "Test Applicant", gender: "Male", age: 20, currentRole: "Student", whatsApp: "0300 1234567", emergencyPhone: "0301 1234567", affiliated: "No", city: "Lahore", address: "Lahore" };

describe("registration form definition", () => {
  it("includes all observed Atfal cities and an Other City answer", () => {
    expect(ATFAL_CITY_OPTIONS).toHaveLength(35);
    expect(ATFAL_CITY_OPTIONS).toContain("Lahore");
    expect(ATFAL_CITY_OPTIONS).toContain("Other City");
    expect(parseFormAnswers(fields, settings, { ...answers, city: { choice: "Other City", other: "A new town" } })?.city).toEqual({ choice: "Other City", other: "A new town" });
  });

  it("rejects ineligible, unknown and malformed answers", () => {
    expect(parseFormAnswers(fields, settings, { ...answers, age: 17 })).toBeNull();
    expect(parseFormAnswers(fields, settings, { ...answers, unexpected: "value" })).toBeNull();
    expect(parseFormAnswers(fields, settings, { ...answers, city: "Other City" })).toBeNull();
    expect(parseFormAnswers(fields, settings, { ...answers, emergencyPhone: "123" })).toBeNull();
  });

  it("requires affiliation details only when affiliation is Yes", () => {
    expect(parseFormAnswers(fields, settings, answers)?.affiliationDetails).toBeUndefined();
    expect(parseFormAnswers(fields, settings, { ...answers, affiliated: "Yes" })).toBeNull();
    expect(parseFormAnswers(fields, settings, { ...answers, affiliated: "Yes", affiliationDetails: "Shabab student" })?.affiliationDetails).toBe("Shabab student");
  });

  it("requires a privacy notice and a valid eligibility field before publishing", () => {
    expect(publicationError(fields, formSettingsSchema.parse(EMPTY_FORM_SETTINGS))).toMatch(/Privacy notice/);
    expect(publicationError(fields, settings)).toBeNull();
    expect(publicationError(fields.filter((field) => field.key !== "age"), settings)).toMatch(/age eligibility/);
  });
});
