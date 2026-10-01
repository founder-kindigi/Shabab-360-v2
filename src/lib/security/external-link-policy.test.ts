import { describe, expect, it } from "vitest";
import { normalizeAllowedDomains, validateAllowedExternalUrl } from "./external-link-policy";

describe("external link policy helpers", () => {
  it("normalizes and deduplicates valid domains", () => {
    expect(normalizeAllowedDomains([" Drive.Google.com ", "drive.google.com", "not a host"])).toEqual(["drive.google.com"]);
  });

  it("allows only HTTPS hosts on the configured domain boundary", () => {
    expect(validateAllowedExternalUrl("https://docs.google.com/document/d/1", ["docs.google.com"]).allowed).toBe(true);
    expect(validateAllowedExternalUrl("http://docs.google.com/document/d/1", ["docs.google.com"]).allowed).toBe(false);
    expect(validateAllowedExternalUrl("https://docs.google.com.evil.example/", ["docs.google.com"]).allowed).toBe(false);
  });
});
