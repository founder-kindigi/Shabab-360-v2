// Actual candidate route + Prisma writes to an empty, disposable SQLite DB.
// This is supplementary evidence, never PostgreSQL migration/concurrency proof.
import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const state = vi.hoisted(() => ({ prisma: null as any }));
vi.mock('next-auth', () => ({ getServerSession: async () => ({ user: { id: 'synthetic-reviewer', role: 'super_admin' } }) }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/auth/capability-access', () => ({ userHasCapability: async () => true }));
vi.mock('@/lib/audit', () => ({ logAudit: async () => {} }));
vi.mock('@/lib/db', () => ({ get db() { return state.prisma; } }));
import { POST } from '@/app/api/admin/procurement/transfers/route';
beforeAll(async () => {
  const dir = fs.mkdtempSync(path.resolve('.next/astra-disposable-'));
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8').replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  output = "./client"');
  fs.writeFileSync(path.join(dir, 'schema.prisma'), schema);
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'generate', '--schema', path.join(dir, 'schema.prisma')], { timeout: 45000, stdio: ['ignore', 'pipe', 'pipe'] });
  const { PrismaClient } = await import(pathToFileURL(path.join(dir, 'client/index.js')).href);
  const sql = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8', timeout: 45000, stdio: ['ignore', 'pipe', 'pipe'] });
  state.prisma = new PrismaClient({ datasourceUrl: `file:${path.join(dir, 'synthetic.db').replaceAll('\\', '/')}` });
  for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await state.prisma.$executeRawUnsafe(statement);
  await state.prisma.city.create({ data: { id: 'city', name: 'Synthetic city', code: 'ASTRA' } });
  for (const id of ['source', 'target']) await state.prisma.park.create({ data: { id, name: id, cityId: 'city' } });
  await state.prisma.procurementItem.create({ data: { id: 'item', sku: 'ASTRA', name: 'Synthetic equipment', category: 'general', unit: 'piece' } });
  fs.writeFileSync('docs/reviews/v2-audit-2026-09-08/astra-db-environment.json', JSON.stringify({ provider: 'sqlite', generatedFrom: 'prisma/schema.prisma', disposableDirectory: dir, auditSink: 'mocked; audit atomicity not verified' }, null, 2));
});
afterAll(async () => { await state.prisma?.$disconnect(); });
const request = (quantity: number) => new NextRequest('http://localhost/api/admin/procurement/transfers', { method: 'POST', body: JSON.stringify({ fromParkId: 'source', toParkId: 'target', itemId: 'item', quantity }), headers: { 'Content-Type': 'application/json' } });
it('SQLITE CONTAINMENT: two concurrent transfers of four from five leave one transfer and nonnegative balances', async () => {
  await state.prisma.parkStock.create({ data: { parkId: 'source', itemId: 'item', quantity: 5 } });
  const results = await Promise.all([POST(request(4)), POST(request(4))]);
  expect(results.map(r => r.status).sort()).toEqual([201, 409]);
  expect(await state.prisma.stockTransfer.count()).toBe(1);
  expect((await state.prisma.parkStock.findUnique({ where: { parkId_itemId: { parkId: 'source', itemId: 'item' } } })).quantity).toBe(1);
});
it('SQLITE CONFIRMED: identical retry moves inventory twice when stock permits', async () => {
  await state.prisma.parkStock.update({ where: { parkId_itemId: { parkId: 'source', itemId: 'item' } }, data: { quantity: 5 } });
  expect((await POST(request(2))).status).toBe(201);
  expect((await POST(request(2))).status).toBe(201);
  expect(await state.prisma.stockTransfer.count()).toBe(3);
});
it('SQLITE CONFIRMED A30: database accepts two active batches in the same city', async () => {
  await Promise.all(['one', 'two'].map(name => state.prisma.batch.create({ data: { name, cityId: 'city', parkId: 'source', startDate: new Date('2026-09-08'), isActive: true } })));
  expect(await state.prisma.batch.count({ where: { cityId: 'city', isActive: true } })).toBe(2);
});
