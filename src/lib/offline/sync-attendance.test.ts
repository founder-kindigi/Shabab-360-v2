import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ pending: vi.fn(), syncing: vi.fn(), synced: vi.fn(), failed: vi.fn(), recover: vi.fn() }));
vi.mock("./db", () => ({ getPendingSyncItems: m.pending, markAsSyncing: m.syncing, markAsSynced: m.synced, markAsFailed: m.failed, recoverStuckSyncing: m.recover }));
import { drainAttendanceQueue } from "./sync-attendance";
describe("attendance queue transport", () => {
  let items: any[];
  let sent: any[][];
  beforeEach(() => {
    vi.resetAllMocks(); sent = [];
    items = Array.from({ length: 120 }, (_, i) => ({ mutationId: `m${i}`, ownerId: "owner", eventId: "event", participantId: `p${i}`, status: "present", markedAt: "2026-09-09T00:00:00Z", expectedResetVersion: 0, expectedVersion: null }));
    m.pending.mockImplementation(async (owner, attempted) => items.filter(i => i.ownerId === owner && !attempted.has(i.mutationId)).slice(0, 50));
    vi.stubGlobal("fetch", vi.fn(async (_url, options) => {
      const batch = JSON.parse(options.body).mutations; sent.push(batch);
      return Response.json({ results: batch.map((i: any) => ({ mutationId: i.mutationId, status: "processed", recordId: `record-${i.participantId}`, version: "2026-09-09T01:00:00Z" })) });
    }));
  });
  it("drains more than 50 marks in bounded batches", async () => {
    expect(await drainAttendanceQueue("owner")).toEqual({ success: true, processed: 120, failed: 0 });
    expect(sent.map(b => b.length)).toEqual([50, 50, 20]); expect(m.synced.mock.calls.flat(2)).toHaveLength(120);
  });
  it("does not submit another account's pending marks", async () => {
    items[0].ownerId = "other"; await drainAttendanceQueue("owner");
    expect(sent.flat().some(i => i.ownerId !== "owner")).toBe(false); expect(sent.flat()).toHaveLength(119);
  });
  it("retains all sent marks after an incomplete or foreign acknowledgement", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ results: [{ mutationId: "foreign", status: "processed", recordId: "r", version: "v" }] }));
    expect((await drainAttendanceQueue("owner")).success).toBe(false); expect(m.synced).not.toHaveBeenCalled(); expect(m.failed.mock.calls[0][0]).toHaveLength(50);
  });
  it("stops when the account changes before the next batch", async () => {
    let current = true;
    m.synced.mockImplementation(async () => { current = false; });
    const result = await drainAttendanceQueue("owner", () => current); expect(sent).toHaveLength(1); expect(result.success).toBe(false);
  });
  it("retains rejected version conflicts and continues independent marks", async () => {
    vi.mocked(fetch).mockImplementation(async (_url, options) => {
      const batch = JSON.parse(options!.body as string).mutations; sent.push(batch);
      return Response.json({ results: batch.map((i: any) => i.mutationId === "m0" ? { mutationId: i.mutationId, status: "failed", code: "VERSION_CONFLICT", retryable: false } : { mutationId: i.mutationId, status: "processed", recordId: "r", version: "v" }) });
    });
    expect(await drainAttendanceQueue("owner")).toEqual({ success: false, processed: 119, failed: 1 });
    expect(m.failed.mock.calls[0][0][0].retryable).toBe(false);
  });
  it("shares an in-flight run for the same owner", async () => {
    const first = drainAttendanceQueue("owner"); const second = drainAttendanceQueue("owner"); expect(first).toBe(second); await first; expect(sent).toHaveLength(3);
  });
});
