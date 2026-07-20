import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "@/lib/security/origin";

describe("isSameOriginRequest", () => {
  it("accepts an exact Origin header matching request URL origin", () => {
    const request = new Request("https://pilot.shabab360.pk/api/admin/cities", {
      headers: { origin: "https://pilot.shabab360.pk" },
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("accepts same-origin Referer when Origin header is absent", () => {
    const request = new Request("https://preview.shabab360.pk/api/admin/cities", {
      headers: { referer: "https://preview.shabab360.pk/admin" },
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("prioritizes Origin over Referer when both are present", () => {
    // If Origin is cross-origin, it must be rejected, even if Referer is same-origin
    const request = new Request("https://pilot.shabab360.pk/api/admin/cities", {
      headers: {
        origin: "https://attacker.com",
        referer: "https://pilot.shabab360.pk/admin",
      },
    });
    expect(isSameOriginRequest(request)).toBe(false);

    // If Origin is same-origin, it must be accepted, even if Referer is cross-origin
    const request2 = new Request("https://pilot.shabab360.pk/api/admin/cities", {
      headers: {
        origin: "https://pilot.shabab360.pk",
        referer: "https://attacker.com/some-page",
      },
    });
    expect(isSameOriginRequest(request2)).toBe(true);
  });

  it("rejects when both headers are missing", () => {
    const request = new Request("https://pilot.shabab360.pk/api/admin/cities");
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("rejects subdomains (they are considered different origins)", () => {
    const request = new Request("https://shabab360.pk/api/admin/cities", {
      headers: { origin: "https://pilot.shabab360.pk" },
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("rejects differing ports", () => {
    const request = new Request("http://localhost:3000/api/admin/cities", {
      headers: { origin: "http://localhost:3001" },
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("rejects differing protocols (HTTP vs HTTPS)", () => {
    const request = new Request("https://pilot.shabab360.pk/api/admin/cities", {
      headers: { origin: "http://pilot.shabab360.pk" },
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("handles malformed, invalid, or injection URLs gracefully without throwing", () => {
    const destination = "https://pilot.shabab360.pk/api/admin/cities";

    expect(
      isSameOriginRequest(
        new Request(destination, { headers: { origin: "not-a-valid-url" } })
      )
    ).toBe(false);

    expect(
      isSameOriginRequest(
        new Request(destination, { headers: { origin: "http://" } })
      )
    ).toBe(false);

    expect(
      isSameOriginRequest(
        new Request(destination, { headers: { origin: "" } })
      )
    ).toBe(false);

    // Standard URL constructor trims leading/trailing whitespace automatically, resulting in same-origin match
    expect(
      isSameOriginRequest(
        new Request(destination, { headers: { origin: "   https://pilot.shabab360.pk   " } })
      )
    ).toBe(true);

    expect(
      isSameOriginRequest(
        new Request(destination, { headers: { origin: "<script>alert(1)</script>" } })
      )
    ).toBe(false);

    // Attacker attempting prefix bypass
    expect(
      isSameOriginRequest(
        new Request(destination, { headers: { origin: "https://pilot.shabab360.pk.attacker.com" } })
      )
    ).toBe(false);
  });
});
