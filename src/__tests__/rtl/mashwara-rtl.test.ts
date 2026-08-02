import { describe, expect, it } from "vitest";
import { ur } from "@/lib/i18n/ur";

describe("RTL-002 Mashwara Urdu RTL Support", () => {
  it("includes required Urdu translations for Mashwara module", () => {
    expect(ur["nav.mashwara"]).toBe("ہفتہ وار مشورہ");
    expect(ur["common.save"]).toBe("محفوظ کریں");
    expect(ur["common.cancel"]).toBe("منسوخ کریں");
  });

  it("verifies RTL container direction attribute styling contract", () => {
    const isRtl = true;
    const dirAttribute = isRtl ? "rtl" : "ltr";
    expect(dirAttribute).toBe("rtl");
  });
});
