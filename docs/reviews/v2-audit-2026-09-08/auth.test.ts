// Audit reproductions; only synthetic credentials and a mocked database are used.
import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ unique: vi.fn(), first: vi.fn(), staff: vi.fn(), compare: vi.fn() }));
vi.mock('next-auth/providers/credentials', () => ({ default: (config: unknown) => config }));
vi.mock('bcryptjs', () => ({ default: { compare: m.compare } }));
vi.mock('@/lib/db', () => ({ db: { user: { findUnique: m.unique, findFirst: m.first }, staffMeta: { findUnique: m.staff } } }));
import { authOptions } from '@/lib/auth';
beforeEach(() => vi.resetAllMocks());

it('A07: login accepts a substring as an email and uses a separate rate-limit key', async () => {
  m.unique.mockResolvedValue(null);
  m.first.mockResolvedValue({ id: 'audit-target', email: 'audit-target@example.invalid', name: 'Audit target', isActive: true, passwordHash: 'SYNTHETIC', tokenVersion: 1 });
  m.staff.mockResolvedValue({ role: 'park_lead', isActive: true });
  m.compare.mockResolvedValue(true);
  const provider = authOptions.providers[0] as unknown as { authorize: (credentials: unknown) => Promise<{ id: string }> };
  const user = await provider.authorize({ email: 'audit-target', password: 'SYNTHETIC_TEST_PASSWORD' });
  expect(user.id).toBe('audit-target');
  expect(m.first).toHaveBeenCalledWith({ where: { email: { contains: 'audit-target' } } });
});

it('A07: inactive staff assignment still authenticates when User is active', async () => {
  m.unique.mockResolvedValue({ id: 'audit-user', email: 'audit-user@example.invalid', isActive: true, passwordHash: 'SYNTHETIC', tokenVersion: 1 });
  m.staff.mockResolvedValue({ role: 'park_lead', isActive: false });
  m.compare.mockResolvedValue(true);
  const provider = authOptions.providers[0] as unknown as { authorize: (credentials: unknown) => Promise<{ id: string }> };
  expect((await provider.authorize({ email: 'audit-user@example.invalid', password: 'SYNTHETIC_TEST_PASSWORD' })).id).toBe('audit-user');
});

it('A07: deleted users retain their existing JWT', async () => {
  m.unique.mockResolvedValue(null);
  const token = { id: 'audit-deleted-user', role: 'super_admin', tokenVersion: 1 };
  expect(await authOptions.callbacks!.jwt!({ token } as never)).toEqual(token);
});
