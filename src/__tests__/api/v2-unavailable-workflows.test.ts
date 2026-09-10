import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: null as any }));
vi.mock("next-auth", () => ({ getServerSession: async () => m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
import * as consent from "@/app/api/guardian/consents/route";
import * as emergency from "@/app/api/guardian/emergency-info/route";
import * as leave from "@/app/api/guardian/leave-requests/route";
import * as islah from "@/app/api/islah/daily-log/route";
import * as posts from "@/app/api/community/posts/route";
import * as polls from "@/app/api/community/polls/route";
describe.each([consent, emergency, leave, islah, posts, polls])("unapproved workflow containment", (route) => {
  beforeEach(() => { m.session = { user: { id: "synthetic", role: "guardian" } }; });
  it.each(["GET", "POST"] as const)("%s gives authenticated unavailable, no private records or save acknowledgment", async (method) => {
    const response = await route[method](new Request("http://localhost", { method }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: "WORKFLOW_UNAVAILABLE", error: expect.stringContaining("unavailable") });
  });
  it("denies unauthenticated access", async () => {
    m.session = null;
    expect((await route.GET(new Request("http://localhost"))).status).toBe(401);
  });
  it("denies reset-required sessions", async () => {
    m.session.user.mustResetPwd = true;
    expect((await route.GET(new Request("http://localhost"))).status).toBe(403);
  });
});
