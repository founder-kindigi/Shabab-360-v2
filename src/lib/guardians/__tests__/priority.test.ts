import { describe, it, expect } from "vitest";
import { sortGuardianContacts, formatPrimaryEmergencyContact, GuardianContactItem } from "../priority";

describe("Multi-Guardian Priority Helper", () => {
  const sampleContacts: GuardianContactItem[] = [
    { id: "g1", guardianName: "Tariq Ahmed", phone: "+92 300 1111111", relation: "Uncle", isPrimary: false, priorityOrder: 2 },
    { id: "g2", guardianName: "Zahid Ahmed", phone: "+92 300 2222222", relation: "Father", isPrimary: true, priorityOrder: 1 },
    { id: "g3", guardianName: "Ayesha Ahmed", phone: "+92 300 3333333", relation: "Mother", isPrimary: false, priorityOrder: 1 },
  ];

  it("sorts primary guardian first", () => {
    const sorted = sortGuardianContacts(sampleContacts);
    expect(sorted[0].guardianName).toBe("Zahid Ahmed");
    expect(sorted[0].isPrimary).toBe(true);
  });

  it("formats primary and secondary emergency contact details", () => {
    const formatted = formatPrimaryEmergencyContact(sampleContacts);
    expect(formatted.primaryName).toContain("Zahid Ahmed (Father)");
    expect(formatted.primaryPhone).toBe("+92 300 2222222");
    expect(formatted.secondaryName).toBeDefined();
  });

  it("handles empty contact lists gracefully", () => {
    const formatted = formatPrimaryEmergencyContact([]);
    expect(formatted.primaryName).toBe("Not specified");
    expect(formatted.primaryPhone).toBe("—");
  });
});
