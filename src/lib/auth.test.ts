import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), staff: vi.fn(), guardian: vi.fn(), participant: vi.fn(), throttle: vi.fn(), compare: vi.fn() }));
vi.mock("next-auth/providers/credentials", () => ({ default: (config: any) => config }));
vi.mock("bcryptjs", () => ({ default: { compare: mocks.compare } }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: mocks.user }, staffMeta: { findUnique: mocks.staff }, guardian: { findUnique: mocks.guardian }, participant: { findUnique: mocks.participant }, $queryRaw: mocks.throttle } }));
import { authOptions } from "./auth";
const login = (credentials: any) => (authOptions.providers[0] as any).authorize(credentials);
const jwt = (token: any) => authOptions.callbacks!.jwt!({ token } as never);
describe("exact login identity and fresh session authority", () => {
 beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "user-1", email: "actor@example.test", isActive: true, passwordHash: "synthetic", tokenVersion: 2, mustResetPwd: false });
  mocks.staff.mockResolvedValue({ role: "super_admin", isActive: true, assignedCityId: null, assignedParkId: null, assignedGroupId: null });
  mocks.throttle.mockResolvedValue([{ attempts: 1 }]);
  mocks.compare.mockResolvedValue(true);
 });
 it("uses only exact normalized email", async () => {
  expect(await login({ email: "  Actor@Example.Test ", password: "correct" })).toMatchObject({ id: "user-1", role: "super_admin" });
  expect(mocks.user).toHaveBeenCalledWith({ where: { email: "actor@example.test" } });
 });
 it("rejects substring identity before any database lookup", async () => {
  expect(await login({ email: "actor", password: "correct" })).toBeNull();
  expect(mocks.user).not.toHaveBeenCalled();
 });
 it("denies inactive staff even with a correct password", async () => {
  mocks.staff.mockResolvedValue({ role: "super_admin", isActive: false });
  expect(await login({ email: "actor@example.test", password: "correct" })).toBeNull();
 });
 it("denies exhausted shared throttle without checking passwords", async () => {
  mocks.throttle.mockResolvedValue([{ attempts: 6 }]);
  expect(await login({ email: "actor@example.test", password: "correct" })).toBeNull();
  expect(mocks.compare).not.toHaveBeenCalled();
 });
 it("fails closed if the shared throttle is unavailable", async () => {
  mocks.throttle.mockRejectedValue(new Error("offline"));
  expect(await login({ email: "actor@example.test", password: "correct" })).toBeNull();
 });
 it.each([null, { isActive: false, tokenVersion: 2 }, { isActive: true, tokenVersion: 3 }])("invalidates deleted, inactive and revoked identities", async (row) => {
  mocks.user.mockResolvedValue(row);
  expect(await jwt({ id: "user-1", role: "super_admin", tokenVersion: 2 })).toEqual({});
 });
 it("refreshes role and reset state instead of keeping old authority", async () => {
  mocks.staff.mockResolvedValue({ role: "park_admin", isActive: true, assignedParkId: "park-a", assignedPark: { id: "park-a", cityId: "city-a", isActive: true } });
  const token = await jwt({ id: "user-1", role: "super_admin", tokenVersion: 2 });
  expect(token).toMatchObject({ role: "park_admin", assignedParkId: "park-a", assignedCityId: "city-a", mustResetPwd: false });
 });
 it("denies missing required assignments", async () => {
  mocks.staff.mockResolvedValue({ role: "city_head", isActive: true });
  expect(await jwt({ id: "user-1", tokenVersion: 2 })).toEqual({});
 });
 it("invalidates on identity storage failure", async () => {
  mocks.user.mockRejectedValue(new Error("offline"));
  expect(await jwt({ id: "user-1", tokenVersion: 2 })).toEqual({});
 });
});
