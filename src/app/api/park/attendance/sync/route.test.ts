import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
const m = vi.hoisted(() => ({ auth: vi.fn(), capability: vi.fn(), apply: vi.fn() }));
vi.mock("@/lib/auth/authorize", () => ({ requireAuth: m.auth, requireCapability: m.capability }));
vi.mock("@/lib/attendance/apply-mutation", () => ({ applyAttendanceMutation: m.apply }));
import { POST } from "./route";
const mark = { mutationId: "one", ownerId: "actor", eventId: "ckccccccccccccccccccccccc", participantId: "ckaaaaaaaaaaaaaaaaaaaaaaa", status: "present", expectedResetVersion: 0, expectedVersion: null };
const request = (mutations: unknown) => new Request("http://localhost/api/park/attendance/sync", { method: "POST", body: JSON.stringify({ mutations }) });
const accepted = { mutationId: "one", status: "processed", recordId: "record", version: "2026-09-09T00:00:00.000Z", code: null, error: null, retryable: false };
describe("attendance batch transport (transaction integrity covered by disposable DB suite)", () => {
  beforeEach(() => { vi.resetAllMocks(); m.auth.mockResolvedValue({ user: { id: "actor" } }); m.capability.mockResolvedValue(null); m.apply.mockResolvedValue(accepted); });
  it("denies authentication and capability failures before processing", async () => {
    m.auth.mockResolvedValueOnce(NextResponse.json({}, { status: 401 })); expect((await POST(request([mark]))).status).toBe(401);
    m.capability.mockResolvedValueOnce(NextResponse.json({}, { status: 403 })); expect((await POST(request([mark]))).status).toBe(403); expect(m.apply).not.toHaveBeenCalled();
  });
  it.each([{}, [], Array(51).fill(mark), [mark, mark], [{ ...mark, ownerId: undefined }], [{ ...mark, expectedVersion: undefined }], [{ ...mark, markedAt: "invalid" }]])("rejects malformed or ambiguous batches before processing: %j", async mutations => {
    expect((await POST(request(mutations))).status).toBe(400); expect(m.apply).not.toHaveBeenCalled();
  });
  it("returns the service acknowledgment verbatim", async () => {
    const response = await POST(request([mark])); expect(response.status).toBe(200); expect(await response.json()).toEqual({ results: [accepted], summary: { total: 1, processed: 1, failed: 0 } });
    expect(m.apply).toHaveBeenCalledWith({ id: "actor" }, mark);
  });
  it.each(["FORBIDDEN", "EVENT_LOCKED", "ATTENDANCE_DISCONTINUED", "VERSION_CONFLICT", "OWNER_MISMATCH", "PROCESSING_ERROR"])("retains %s failures alongside independent successes", async code => {
    const denied = { ...accepted, status: "failed", recordId: null, code, error: "Review required", retryable: code === "PROCESSING_ERROR" };
    m.apply.mockResolvedValueOnce(denied).mockResolvedValueOnce({ ...accepted, mutationId: "two" });
    const response = await POST(request([mark, { ...mark, mutationId: "two" }])); const body = await response.json();
    expect(body.summary).toEqual({ total: 2, processed: 1, failed: 1 }); expect(body.results[0]).toEqual(denied); expect(m.apply).toHaveBeenCalledTimes(2);
  });
  it("does not invent a success for an earlier mark of the same participant", async () => {
    const conflict = { ...accepted, mutationId: "two", status: "failed", recordId: null, code: "VERSION_CONFLICT", error: "Reload", retryable: false };
    m.apply.mockResolvedValueOnce(accepted).mockResolvedValueOnce(conflict);
    const body = await (await POST(request([mark, { ...mark, mutationId: "two", status: "absent" }]))).json();
    expect(body.results).toEqual([accepted, conflict]); expect(body.summary.processed).toBe(1);
  });
});
