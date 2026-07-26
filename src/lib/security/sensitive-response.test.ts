import { describe, expect, it } from "vitest";
import { SENSITIVE_RESPONSE_HEADERS } from "./sensitive-response";

describe("SENSITIVE_RESPONSE_HEADERS", () => {
  it("prevents generated credentials from being cached", () => {
    expect(SENSITIVE_RESPONSE_HEADERS).toEqual({
      "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });
  });
});
