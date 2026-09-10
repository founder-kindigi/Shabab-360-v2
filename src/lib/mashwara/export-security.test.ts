import { describe, expect, it } from "vitest";
import { generateMashwaraMinutes, type MashwaraMeetingData } from "./export-minutes";

describe("minutes HTML context escaping", () => {
  it("renders hostile stored text literally in every exported field", () => {
    const hostile = '</title><script>document.documentElement.dataset.probe="executed"</script><img src=x onerror=alert(1)>';
    const meeting: MashwaraMeetingData = {
      id: "synthetic", title: hostile, meetingDate: hostile, cityName: hostile, status: "completed",
      attendees: [{ name: hostile, isPresent: true }], decisions: [{ title: hostile, details: hostile }],
      actionItems: [{ title: hostile, assigneeName: hostile, status: hostile }],
    };
    for (const lang of ["en", "ur"] as const) {
      const result = generateMashwaraMinutes(meeting, { format: "html", lang });
      expect(result.content).not.toContain("<script>");
      expect(result.content).not.toContain("<img");
      expect(result.content).toContain("&lt;script&gt;");
      expect(result.content).toContain("&quot;executed&quot;");
    }
  });
});
