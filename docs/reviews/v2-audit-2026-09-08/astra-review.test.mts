// Independent review evidence. CONFIRMED tests characterize defects, not fixes.
// Real authorization helpers and route handlers; only sessions, capabilities,
// persistence and audit sinks are mocked. All fixture records are synthetic.
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { writeFileSync } from 'node:fs';
const m = vi.hoisted(() => {
  const model = () => ({ findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), upsert: vi.fn(), delete: vi.fn() });
  return { session: vi.fn(), capability: vi.fn(), audit: vi.fn(), verify: vi.fn(), db: {
    admissionApplication: model(), callingCampaign: model(), financialAdjustment: model(), feeDonation: model(), payment: model(), purchaseOrder: model(), park: model(), stockRequest: model(), parkStock: model(), stockTransfer: model(), city: model(), procurementItem: model(), receiptSequence: model(), user: model(), staffMeta: model(), pointTransaction: model(), participant: model(), attendanceEvent: model(), attendanceRecord: model(), $transaction: vi.fn(),
  } };
});
vi.mock('next-auth', () => ({ getServerSession: m.session }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({ db: m.db }));
vi.mock('@/lib/auth/capability-access', () => ({ userHasCapability: m.capability }));
vi.mock('@/lib/audit', () => ({ logAudit: m.audit }));
vi.mock('@/lib/calling/poc-auth', () => ({ verifyCallingManagerOrPoc: m.verify }));
vi.mock('@/lib/attendance-alerts', () => ({ checkAttendanceAlerts: vi.fn() }));
import * as attendanceSync from '@/app/api/park/attendance/sync/route';
import { canAccessParticipantProfile } from '@/lib/student-profile/scope';
import * as admission from '@/app/api/admin/admissions/[id]/route';
import * as campaign from '@/app/api/calling/campaigns/[id]/route';
import * as adjustments from '@/app/api/admin/finance/adjustments/route';
import * as reconciliation from '@/app/api/admin/finance/reconciliation/route';
import * as orders from '@/app/api/admin/procurement/orders/route';
import * as requests from '@/app/api/admin/procurement/requests/[id]/route';
import * as transfers from '@/app/api/admin/procurement/transfers/route';
import * as stock from '@/app/api/admin/procurement/stock/route';
import * as points from '@/app/api/admin/gamification/points/route';
import * as structure from '@/app/api/park/structure/route';
import * as importer from '@/app/api/admin/import/portal-raw/route';
import * as sync from '@/app/api/sync/process/route';
import { generateMashwaraMinutes } from '@/lib/mashwara/export-minutes';
const req = (path: string, body?: unknown) => new NextRequest('http://localhost' + path, body === undefined ? {} : { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
const params = { params: Promise.resolve({ id: 'synthetic-record' }) };
const actor = (role: string, extra = {}) => m.session.mockResolvedValue({ user: { id: 'synthetic-actor', role, ...extra } });
beforeEach(() => {
  vi.resetAllMocks(); actor('super_admin'); m.capability.mockResolvedValue(true);
  m.audit.mockResolvedValue(undefined); m.db.$transaction.mockImplementation(async fn => fn(m.db));
});
it('CONFIRMED R01: successful admission deletion responds 404 after deleting', async () => {
  m.db.admissionApplication.findUnique.mockResolvedValue({ id: 'synthetic-record' });
  const response = await admission.DELETE(req('/api/admin/admissions/synthetic-record'), params);
  expect(m.db.admissionApplication.delete).toHaveBeenCalledOnce(); expect(response.status).toBe(404);
});
it('CONFIRMED R01: successful campaign deletion responds 404 after deleting', async () => {
  m.db.callingCampaign.findUnique.mockResolvedValue({ id: 'synthetic-record' });
  const response = await campaign.DELETE(req('/api/calling/campaigns/synthetic-record'), params);
  expect(m.db.callingCampaign.delete).toHaveBeenCalledOnce(); expect(response.status).toBe(404);
});
it('CONFIRMED R02: Park Admin with a grant can read same-city foreign-park adjustments', async () => {
  actor('park_admin', { assignedCityId: 'city-own', assignedParkId: 'park-own' });
  m.db.financialAdjustment.findMany.mockResolvedValue([{ id: 'foreign-adjustment', parkId: 'park-other' }]);
  const response = await adjustments.GET(req('/api/admin/finance/adjustments?parkId=park-other'));
  expect(response.status).toBe(200);
  expect(m.db.financialAdjustment.findMany.mock.calls[0][0].where).toEqual({ cityId: 'city-own', parkId: 'park-other' });
});
it('CONFIRMED R02: park-scoped order listing with city assignment expands to the entire city', async () => {
  actor('park_admin', { assignedCityId: 'city-own', assignedParkId: 'park-own' });
  m.db.purchaseOrder.findMany.mockResolvedValue([]);
  expect((await orders.GET(req('/api/admin/procurement/orders'))).status).toBe(200);
  expect(m.db.purchaseOrder.findMany.mock.calls[0][0].where).toEqual({ cityId: 'city-own' });
});
it('CONFIRMED R02: valid park-only actor is denied own-park order listing before park resolution', async () => {
  actor('park_admin', { assignedParkId: 'park-own' });
  expect((await orders.GET(req('/api/admin/procurement/orders?parkId=park-own'))).status).toBe(403);
  expect(m.db.park.findUnique).not.toHaveBeenCalled();
});
it('CONFIRMED R03: reconciliation park filter removes the City Head payment city constraint', async () => {
  actor('city_head', { assignedCityId: 'city-own' });
  m.db.payment.findMany.mockResolvedValue([{ amount: 123, waivedAmount: 0 }]);
  m.db.feeDonation.findMany.mockResolvedValue([]); m.db.financialAdjustment.findMany.mockResolvedValue([]); m.db.purchaseOrder.findMany.mockResolvedValue([]);
  const response = await reconciliation.GET(req('/api/admin/finance/reconciliation?parkId=park-foreign-city'));
  expect(response.status).toBe(200);
  expect(m.db.payment.findMany.mock.calls[0][0].where).toEqual({ feeEvent: { batch: { parkId: 'park-foreign-city' } } });
  expect((await response.json()).summary.feesCollected).toBe(123);
});
it('CONFIRMED R04: concurrent approved/rejected requests both succeed from a stale pending state', async () => {
  m.db.stockRequest.findUnique.mockResolvedValue({ id: 'synthetic-record', status: 'pending', park: { id: 'park-own', cityId: 'city-own' } });
  m.db.stockRequest.update.mockImplementation(async ({ data }) => ({ id: 'synthetic-record', ...data }));
  const responses = await Promise.all(['approved', 'rejected'].map(status => requests.PATCH(req('/api/admin/procurement/requests/synthetic-record', { status }), params)));
  expect(responses.map(r => r.status)).toEqual([200, 200]);
  expect(m.db.stockRequest.update.mock.calls.map(c => c[0].where)).toEqual([{ id: 'synthetic-record' }, { id: 'synthetic-record' }]);
});
it('CONFIRMED R04: repeated transfer request moves stock twice without retry identity', async () => {
  m.db.park.findUnique.mockImplementation(async ({ where }) => ({ id: where.id, cityId: 'city-own' }));
  m.db.parkStock.updateMany.mockResolvedValue({ count: 1 }); m.db.stockTransfer.create.mockResolvedValue({ id: 'transfer' });
  const body = { fromParkId: 'source', toParkId: 'target', itemId: 'item', quantity: 2 };
  const responses = [await transfers.POST(req('/api/admin/procurement/transfers', body)), await transfers.POST(req('/api/admin/procurement/transfers', body))];
  expect(responses.map(r => r.status)).toEqual([201, 201]); expect(m.db.parkStock.updateMany).toHaveBeenCalledTimes(2);
});
it('CONTAINMENT: conditional stock failure returns 409 with no destination or transfer write', async () => {
  m.db.park.findUnique.mockImplementation(async ({ where }) => ({ id: where.id, cityId: 'city-own' }));
  m.db.parkStock.updateMany.mockResolvedValue({ count: 0 });
  const response = await transfers.POST(req('/api/admin/procurement/transfers', { fromParkId: 'source', toParkId: 'target', itemId: 'item', quantity: 4 }));
  expect(response.status).toBe(409); expect(m.db.parkStock.upsert).not.toHaveBeenCalled(); expect(m.db.stockTransfer.create).not.toHaveBeenCalled();
});
it('CONTAINMENT: purchase order issue does not increase available stock', async () => {
  m.db.city.findUnique.mockResolvedValue({ id: 'city-own' }); m.db.park.findUnique.mockResolvedValue({ id: 'park-own', cityId: 'city-own' });
  m.db.procurementItem.findUnique.mockResolvedValue({ id: 'item' }); m.db.receiptSequence.upsert.mockResolvedValue({ counter: 1 }); m.db.purchaseOrder.create.mockResolvedValue({ id: 'order' });
  const response = await orders.POST(req('/api/admin/procurement/orders', { cityId: 'city-own', parkId: 'park-own', itemId: 'item', quantity: 4, unitCost: 2, supplierName: 'Synthetic supplier' }));
  expect(response.status).toBe(201); expect(m.db.parkStock.upsert).not.toHaveBeenCalled();
});
it('CONTAINMENT: park-only actor cannot query another park stock', async () => {
  actor('park_lead', { assignedParkId: 'park-own' }); m.db.park.findUnique.mockResolvedValue({ id: 'park-other', cityId: 'city-own' });
  expect((await stock.GET(req('/api/admin/procurement/stock?parkId=park-other'))).status).toBe(403); expect(m.db.parkStock.findMany).not.toHaveBeenCalled();
});
it('CONTAINMENT: point awards are unavailable to students', async () => {
  actor('student'); expect((await points.POST(req('/api/admin/gamification/points', {}))).status).toBe(503); expect(m.db.pointTransaction.create).not.toHaveBeenCalled();
});
it('CONTAINMENT: structure add_murabbi cannot write or disclose a user', async () => {
  actor('murabbi', { assignedGroupId: 'group-own' });
  const response = await structure.POST(req('/api/park/structure', { action: 'add_murabbi', email: 'synthetic@example.invalid', parkId: 'park-other' }));
  expect(response.status).toBe(503); expect(m.db.user.findUnique).not.toHaveBeenCalled(); expect(m.db.staffMeta.upsert).not.toHaveBeenCalled(); expect(await response.json()).not.toHaveProperty('user');
});
it('CONTAINMENT: portal import and simulated sync deny unauthenticated and reset sessions', async () => {
  m.session.mockResolvedValue(null); expect((await importer.GET()).status).toBe(401); expect((await sync.POST()).status).toBe(401);
  actor('super_admin', { mustResetPwd: true }); expect((await importer.POST()).status).toBe(403); expect((await sync.POST()).status).toBe(403);
  actor('super_admin'); expect((await importer.GET()).status).toBe(503); expect((await importer.POST()).status).toBe(503); expect((await sync.POST()).status).toBe(503);
});
it('CONFIRMED A22: browser fixture from the actual exporter contains executable stored text', () => {
  const marker = '<script>document.documentElement.dataset.astraProbe="executed"</script>';
  const result = generateMashwaraMinutes({ id: 'synthetic-meeting', title: marker, meetingDate: '2026-09-08', status: 'completed', attendees: [], decisions: [], actionItems: [] });
  expect(result.content).toContain(marker);
  writeFileSync('docs/reviews/v2-audit-2026-09-08/astra-minutes-fixture.html', result.content);
});
it('CONTAINMENT A28: sync allows the group park and denies the batch anchor park', async () => {
  const eventId = 'ckccccccccccccccccccccccc', participantId = 'ckaaaaaaaaaaaaaaaaaaaaaaa';
  m.db.attendanceEvent.findUnique.mockResolvedValue({ id: eventId, groupId: 'group-own', isClosed: false, eventDate: new Date('2026-09-08'), group: { park: { id: 'park-group', cityId: 'city-own' }, batch: { parkId: 'park-anchor', park: { id: 'park-anchor', cityId: 'city-own' } } } });
  m.db.participant.findFirst.mockResolvedValue({ id: participantId, state: 'active' });
  m.db.attendanceRecord.upsert.mockResolvedValue({ id: 'record' });
  const body = { mutations: [{ mutationId: 'synthetic-mutation', eventId, participantId, status: 'present' }] };
  actor('park_lead', { assignedParkId: 'park-anchor' });
  const denied = await (await attendanceSync.POST(req('/api/park/attendance/sync', body))).json();
  expect(denied.results[0].code).toBe('FORBIDDEN'); expect(m.db.attendanceRecord.upsert).not.toHaveBeenCalled();
  actor('park_lead', { assignedParkId: 'park-group' });
  const allowed = await (await attendanceSync.POST(req('/api/park/attendance/sync', body))).json();
  expect(allowed.results[0].status).toBe('processed'); expect(m.db.attendanceRecord.upsert).toHaveBeenCalledOnce();
});
it('CONTAINMENT A06: profile helper allows own Park Admin and denies same-city foreign Park Admin', async () => {
  m.db.participant.findUnique.mockResolvedValue({ groupId: 'group-own', group: { parkId: 'park-group', batch: { cityId: 'city-own', parkId: 'park-anchor' } } });
  expect(await canAccessParticipantProfile({ id: 'actor', role: 'park_admin', assignedParkId: 'park-anchor' }, 'participant', 'city-own')).toBe(false);
  expect(await canAccessParticipantProfile({ id: 'actor', role: 'park_admin', assignedParkId: 'park-group' }, 'participant', 'city-own')).toBe(true);
});
