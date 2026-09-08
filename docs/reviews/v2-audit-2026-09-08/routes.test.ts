// Audit reproductions: passing assertions document existing defects, NOT safe behavior.
// All authentication, database, audit, and imported personal datasets are synthetic mocks.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const m = vi.hoisted(() => {
  const model = () => ({ findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), upsert: vi.fn(), delete: vi.fn() });
  const db = {
    user: model(), staffMeta: model(), participant: model(), park: model(), city: model(),
    batch: model(), group: model(), studentEvaluation: model(), parkLesson: model(),
    parkRoutineSlot: model(), admissionApplication: model(), callingAssignment: model(),
    callInteraction: model(), parkStock: model(), financialAdjustment: model(),
    purchaseOrder: model(), procurementItem: model(), receiptSequence: model(),
    stockTransfer: model(), attendanceEvent: model(), attendanceRecord: model(),
    studentExtendedProfile: model(), auditLog: model(), announcement: model(), digitalResource: model(), $transaction: vi.fn(),
  };
  return { db, session: vi.fn(), capability: vi.fn(), audit: vi.fn(), verifyCalling: vi.fn(), portalWrite: vi.fn() };
});
vi.mock('next-auth', () => ({ getServerSession: m.session }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({ db: m.db }));
vi.mock('@/lib/auth/capability-access', () => ({ userHasCapability: m.capability }));
vi.mock('@/lib/audit', () => ({ logAudit: m.audit, createAuditLogData: (x: unknown) => x }));
vi.mock('@/lib/calling/poc-auth', () => ({ verifyCallingManagerOrPoc: m.verifyCalling }));
vi.mock('@/lib/calling/portal-store', () => ({ logPortalCallInteraction: m.portalWrite, assignPortalCallingLeads: m.portalWrite, getPortalCallingLeads: () => [], CALLERS_LIST: {} }));
vi.mock('@/lib/import-framework/portal-raw-dataset.json', () => ({ default: [] }));
vi.mock('@/lib/attendance-alerts', () => ({ checkAttendanceAlerts: vi.fn() }));

import * as structure from '@/app/api/park/structure/route';
import * as evaluations from '@/app/api/park/evaluations/route';
import * as lessons from '@/app/api/park/lessons/route';
import * as planner from '@/app/api/park/planner/route';
import * as admissions from '@/app/api/admin/admissions/route';
import * as interactions from '@/app/api/calling/interactions/route';
import * as assignments from '@/app/api/calling/assignments/route';
import * as sync from '@/app/api/sync/process/route';
import * as reports from '@/app/api/admin/reports/custom/route';
import * as emergency from '@/app/api/guardian/emergency-info/route';
import * as consents from '@/app/api/guardian/consents/route';
import * as islah from '@/app/api/islah/daily-log/route';
import * as posts from '@/app/api/community/posts/route';
import * as stock from '@/app/api/admin/procurement/stock/route';
import * as orders from '@/app/api/admin/procurement/orders/route';
import * as transfers from '@/app/api/admin/procurement/transfers/route';
import * as adjustments from '@/app/api/admin/finance/adjustments/route';
import * as attendance from '@/app/api/park/attendance/route';
import * as analytics from '@/app/api/admin/home-analytics/route';
import { canAccessParticipantProfile } from '@/lib/student-profile/scope';
import * as announcements from '@/app/api/announcements/route';
import * as resources from '@/app/api/resources/route';
import * as profile from '@/app/api/admin/students/[id]/profile/route';
import * as realSync from '@/app/api/park/attendance/sync/route';
import { syncAttendanceRequestSchema } from '@/lib/attendance/schemas';
import { updateProfileSchema } from '@/lib/student-profile/zod';

const req = (path: string, body?: unknown) => new NextRequest(`http://localhost:3000${path}`, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const actor = (role: string, extras = {}) => m.session.mockResolvedValue({ user: { id: 'audit-actor', role, ...extras } });

beforeEach(() => {
  vi.resetAllMocks();
  actor('murabbi', { assignedGroupId: 'group-own', assignedParkId: 'park-own', assignedCityId: 'city-own' });
  m.capability.mockResolvedValue(true);
  m.db.$transaction.mockImplementation(async (fn) => fn(m.db));
  m.audit.mockResolvedValue(undefined);
});

describe('Confirmed v2 route defects (synthetic characterization)', () => {
  it('A27: a loaded nullable profile cannot be submitted unchanged with one edit', () => {
    expect(updateProfileSchema.safeParse({ school: 'Edited school', college: null }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ school: 'Edited school' }).success).toBe(true);
  });

  it('A28: batch-anchor Park Lead can mark a group assigned to a different park', async () => {
    actor('park_lead', { assignedParkId: 'park-anchor' });
    const eventId = 'c1234567890123456789012345';
    const participantId = 'c2234567890123456789012345';
    m.db.attendanceEvent.findUnique.mockResolvedValue({ id: eventId, groupId: 'group-foreign', isClosed: false, eventDate: new Date('2026-09-08'), group: { parkId: 'park-foreign', batch: { parkId: 'park-anchor', park: { cityId: 'city-a' } } } });
    m.db.participant.findFirst.mockResolvedValue({ id: participantId, state: 'active' });
    m.db.attendanceRecord.upsert.mockResolvedValue({ id: 'record-a' });
    const response = await realSync.POST(req('/api/park/attendance/sync', { mutations: [{ mutationId: 'foreign-group-write', eventId, participantId, status: 'present', markedAt: '2026-09-08T10:00:00Z' }] }));
    expect((await response.json()).summary.processed).toBe(1);
    expect(m.db.attendanceRecord.upsert).toHaveBeenCalled();
  });

  it('A24: student can list announcements addressed only to HQ', async () => {
    actor('student');
    m.db.announcement.findMany.mockResolvedValue([{ id: 'hq-notice', title: 'Audit HQ notice', content: 'SYNTHETIC_RESTRICTED_NOTICE', priority: 'normal', targetRoles: '["super_admin"]', author: { id: 'hq-a', name: 'Synthetic HQ', email: 'hq@example.invalid' }, createdAt: new Date(), expiresAt: null }]);
    const body = await (await announcements.GET(req('/api/announcements'))).json();
    expect(body[0].content).toBe('SYNTHETIC_RESTRICTED_NOTICE');
    expect(JSON.stringify(m.db.announcement.findMany.mock.calls[0][0].where)).not.toContain('student');
  });

  it('A24: student resource query omits target city entirely', async () => {
    actor('student');
    m.db.digitalResource.findMany.mockResolvedValue([{ id: 'foreign-resource', targetCityId: 'city-foreign', allowedRoles: 'all' }]);
    const body = await (await resources.GET(req('/api/resources'))).json();
    expect(body[0].id).toBe('foreign-resource');
    expect(m.db.digitalResource.findMany.mock.calls[0][0].where).toEqual({});
  });

  it('A25: offline queue can supply 51 records but sync schema rejects them all', () => {
    const mutation = { eventId: 'c1234567890123456789012345', participantId: 'c2234567890123456789012345', status: 'present', markedAt: '2026-09-08T00:00:00Z' };
    expect(syncAttendanceRequestSchema.safeParse({ mutations: [{ ...mutation, mutationId: 'one' }] }).success).toBe(true);
    const result = syncAttendanceRequestSchema.safeParse({ mutations: Array.from({ length: 51 }, (_, index) => ({ ...mutation, mutationId: `audit-${index}` })) });
    expect(result.success).toBe(false);
  });

  it('A25: an older offline write overwrites a newer saved attendance mark', async () => {
    actor('super_admin');
    const eventId = 'c1234567890123456789012345';
    const participantId = 'c2234567890123456789012345';
    m.db.attendanceEvent.findUnique.mockResolvedValue({ id: eventId, groupId: 'group-a', isClosed: false, eventDate: new Date('2026-09-08'), group: { batch: { parkId: 'park-a', park: { cityId: 'city-a' } } } });
    m.db.participant.findFirst.mockResolvedValue({ id: participantId, state: 'active' });
    m.db.attendanceRecord.upsert.mockImplementation(async ({ update }) => ({ id: 'record-a', ...update }));
    const base = { mutationId: 'new-write', eventId, participantId, status: 'present', markedAt: '2026-09-08T10:00:00Z' };
    await realSync.POST(req('/api/park/attendance/sync', { mutations: [base] }));
    const response = await realSync.POST(req('/api/park/attendance/sync', { mutations: [{ ...base, mutationId: 'old-write', status: 'late', markedAt: '2026-09-08T09:00:00Z' }] }));
    expect((await response.json()).summary.processed).toBe(1);
    expect(m.db.attendanceRecord.upsert.mock.calls[1][0].update).toMatchObject({ status: 'late', markedAt: new Date('2026-09-08T09:00:00Z') });
    expect(m.db.attendanceRecord.findUnique).not.toHaveBeenCalled();
  });

  it('A26: profile persists before audit failure, without transaction rollback', async () => {
    actor('super_admin');
    m.db.city.findFirst.mockResolvedValue({ id: 'city-a' });
    m.db.participant.findUnique.mockResolvedValue({ id: 'student-a', group: { batch: { cityId: 'city-a' } } });
    m.db.studentExtendedProfile.findUnique.mockResolvedValue(null);
    m.db.studentExtendedProfile.upsert.mockResolvedValue({ id: 'profile-a', participantId: 'student-a', school: 'Audit school' });
    m.db.auditLog.create.mockRejectedValue(new Error('synthetic audit failure'));
    await expect(profile.PUT(req('/api/admin/students/student-a/profile', { school: 'Audit school' }), { params: Promise.resolve({ id: 'student-a' }) })).rejects.toThrow('synthetic audit failure');
    expect(m.db.studentExtendedProfile.upsert).toHaveBeenCalled();
    expect(m.db.$transaction).not.toHaveBeenCalled();
  });

  it('A01: Murabbi can change an existing foreign account role and receive its hash', async () => {
    m.db.user.findUnique.mockResolvedValue({ id: 'foreign-hq', email: 'target@example.invalid', passwordHash: 'SYNTHETIC_HASH_MARKER', tokenVersion: 1 });
    const response = await structure.POST(req('/api/park/structure', { action: 'add_murabbi', parkId: 'park-foreign', name: 'Audit target', email: 'target@example.invalid', role: 'Park Admin' }));
    expect(response.status).toBe(201);
    expect((await response.json()).user.passwordHash).toBe('SYNTHETIC_HASH_MARKER');
    expect(m.db.staffMeta.upsert.mock.calls[0][0].update).toEqual({ role: 'park_admin', assignedParkId: 'park-foreign' });
    expect(m.capability).not.toHaveBeenCalled();
    expect(m.db.user.update).not.toHaveBeenCalled();
  });

  it('A02: out-of-scope evaluations still write while password reset is required', async () => {
    actor('murabbi', { assignedGroupId: 'group-own', mustResetPwd: true });
    m.capability.mockResolvedValue(false);
    m.db.studentEvaluation.upsert.mockResolvedValue({ id: 'evaluation-audit' });
    const response = await evaluations.POST(req('/api/park/evaluations', { participantId: 'student-foreign', parkId: 'park-foreign', month: 9, year: 2026, discipline: 9, farmabardari: 9, islah: 9, ibadah: 9, participation: 9, comment: 'Synthetic audit comment' }));
    expect(response.status).toBe(201);
    expect(m.db.studentEvaluation.upsert).toHaveBeenCalled();
    expect(m.capability).not.toHaveBeenCalled();
    expect(m.db.participant.findUnique).not.toHaveBeenCalled();
  });

  it('A02: Murabbi reads foreign park lessons', async () => {
    m.db.parkLesson.findMany.mockResolvedValue([{ id: 'foreign-lesson' }]);
    expect((await lessons.GET(req('/api/park/lessons?parkId=park-foreign'))).status).toBe(200);
    expect(m.db.parkLesson.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { parkId: 'park-foreign' } }));
  });

  it('A02: Murabbi deletes a foreign routine slot without scope lookup', async () => {
    expect((await planner.DELETE(req('/api/park/planner?id=foreign-slot'))).status).toBe(200);
    expect(m.db.parkRoutineSlot.delete).toHaveBeenCalledWith({ where: { id: 'foreign-slot' } });
    expect(m.db.park.findUnique).not.toHaveBeenCalled();
  });

  it('A03: admission listing ignores denied capability and assigned city', async () => {
    actor('city_head', { assignedCityId: 'city-own' });
    m.capability.mockResolvedValue(false);
    m.db.admissionApplication.count.mockResolvedValue(1);
    m.db.admissionApplication.findMany.mockResolvedValue([{ id: 'foreign-app', cityId: 'city-foreign' }]);
    const response = await admissions.GET(req('/api/admin/admissions'));
    expect(response.status).toBe(200);
    expect((await response.json()).data[0].cityId).toBe('city-foreign');
    expect(m.db.admissionApplication.findMany.mock.calls[0][0].where).toEqual({});
    expect(m.capability).not.toHaveBeenCalled();
  });

  it('A04: student can log a call against another caller active assignment', async () => {
    actor('student');
    m.db.callingAssignment.findUnique.mockResolvedValue({ id: 'assignment-audit', isActive: true, callerStaffMetaId: 'someone-else', campaign: { cityId: 'city-foreign' } });
    m.db.callInteraction.create.mockResolvedValue({ id: 'interaction-audit' });
    expect((await interactions.POST(req('/api/calling/interactions', { assignmentId: 'assignment-audit', outcome: 'reached' }))).status).toBe(200);
    expect(m.db.callInteraction.create).toHaveBeenCalled();
    expect(m.verifyCalling).not.toHaveBeenCalled();
  });

  it('A04: city head assignment proceeds after explicit scope denial', async () => {
    actor('city_head', { assignedCityId: 'city-own' });
    m.verifyCalling.mockResolvedValue({ error: 'Foreign city denied', status: 403, campaign: null });
    m.db.admissionApplication.findMany.mockResolvedValue([{ id: 'application-foreign' }]);
    m.db.callingAssignment.create.mockResolvedValue({ id: 'created-foreign-assignment' });
    expect((await assignments.POST(req('/api/calling/assignments', { campaignId: 'campaign-foreign', applicationIds: ['application-foreign'], callerStaffMetaId: 'caller-foreign' }))).status).toBe(200);
    expect(m.db.callingAssignment.create).toHaveBeenCalled();
  });

  it('A05: park-only actor reads a foreign park stock', async () => {
    actor('park_lead', { assignedParkId: 'park-own' });
    m.db.park.findUnique.mockResolvedValue({ id: 'park-foreign', cityId: 'city-foreign' });
    m.db.parkStock.findMany.mockResolvedValue([]);
    expect((await stock.GET(req('/api/admin/procurement/stock?parkId=park-foreign'))).status).toBe(200);
    expect(m.db.parkStock.findMany).toHaveBeenCalled();
  });

  it('A05: city head can override finance query scope using cityId', async () => {
    actor('city_head', { assignedCityId: 'city-own' });
    m.db.financialAdjustment.findMany.mockResolvedValue([]);
    expect((await adjustments.GET(req('/api/admin/finance/adjustments?cityId=city-foreign'))).status).toBe(200);
    expect(m.db.financialAdjustment.findMany.mock.calls[0][0].where).toEqual({ cityId: 'city-foreign' });
  });

  it('A06: Park Admin profile helper grants another park in the same city', async () => {
    m.db.participant.findUnique.mockResolvedValue({ userId: null, groupId: 'group-foreign', group: { parkId: 'park-foreign', batch: { cityId: 'city-own', parkId: 'park-foreign' } } });
    expect(await canAccessParticipantProfile({ id: 'audit-actor', role: 'park_admin', assignedParkId: 'park-own' }, 'student-foreign', 'city-own')).toBe(true);
  });

  it('A09: new park attendance tab payload is rejected by its destination', async () => {
    const response = await attendance.POST(req('/api/park/attendance', { parkId: 'park-own', murabbiAttendance: { m1: 'P' }, studentAttendance: { s1: 'P' } }));
    expect(response.status).toBe(400);
    expect(m.db.attendanceEvent.create).not.toHaveBeenCalled();
  });

  it('A10: Sync Studio reports unsaved attendance as synced', async () => {
    actor('student');
    const response = await sync.POST(req('/api/sync/process', { mutations: [{ mutationId: 'audit-mutation', eventId: 'foreign-event', participantId: 'foreign-student', status: 'present', markedAt: '2026-09-08T00:00:00Z', queuedAt: '2026-09-08T00:00:00Z' }] }));
    expect((await response.json()).syncedIds).toEqual(['audit-mutation']);
    expect(m.db.attendanceRecord.upsert).not.toHaveBeenCalled();
    expect(m.db.$transaction).not.toHaveBeenCalled();
    expect(m.capability).not.toHaveBeenCalled();
  });

  it('A11: student can save emergency information for an arbitrary child ID', async () => {
    actor('student');
    const response = await emergency.POST(req('/api/guardian/emergency-info', { participantId: 'audit-foreign-child', primaryEmergencyContactName: 'Synthetic guardian', primaryEmergencyPhone: '0000000000', relationshipToChild: 'Father', medicalNotes: 'AUDIT_PRIVATE_NOTE' }));
    expect(response.status).toBe(200);
    actor('guardian', { id: 'different-guardian' });
    const body = await (await emergency.GET(req('/api/guardian/emergency-info'))).json();
    expect(body.data['audit-foreign-child'].medicalNotes).toBe('AUDIT_PRIVATE_NOTE');
    expect(body.data['audit-foreign-child'].bloodGroup).toBe('B+');
  });

  it('A11: student can approve an unrelated sample consent', async () => {
    actor('student');
    const response = await consents.POST(req('/api/guardian/consents', { consentId: 'consent-101', status: 'approved', guardianSignature: 'Synthetic actor signature' }));
    expect(response.status).toBe(200);
    expect((await response.json()).data.status).toBe('approved');
  });

  it('A12: spiritual notes submitted by one account are exposed to another', async () => {
    actor('student', { id: 'student-a' });
    await islah.POST(req('/api/islah/daily-log', { date: '2026-09-08', notes: 'AUDIT_PRIVATE_SPIRITUAL_NOTE' }));
    actor('student', { id: 'student-b' });
    const body = await (await islah.GET(req('/api/islah/daily-log'))).json();
    expect(body.data.some((log: { notes: string }) => log.notes === 'AUDIT_PRIVATE_SPIRITUAL_NOTE')).toBe(true);
  });

  it('A12: community creation reports success but a fresh GET loses the post', async () => {
    const created = await (await posts.POST(req('/api/community/posts', { content: 'AUDIT_NEW_POST' }))).json();
    const listed = await (await posts.GET()).json();
    expect(created.success).toBe(true);
    expect(listed.data.some((post: { content: string }) => post.content === 'AUDIT_NEW_POST')).toBe(false);
  });

  it('A13: custom report returns success without any data or file', async () => {
    const body = await (await reports.POST(req('/api/admin/reports/custom', { domainId: 'attendance', columns: ['name'], exportFormat: 'xlsx' }))).json();
    expect(body.success).toBe(true);
    expect(body.data).toBeUndefined();
    expect(body.query.exportFormat).toBe('xlsx');
    expect(m.db.attendanceRecord.findMany).not.toHaveBeenCalled();
  });

  it('A16: issuing a purchase order immediately increases available stock', async () => {
    actor('super_admin');
    m.db.city.findUnique.mockResolvedValue({ id: 'city-a' });
    m.db.park.findUnique.mockResolvedValue({ id: 'park-a', cityId: 'city-a' });
    m.db.procurementItem.findUnique.mockResolvedValue({ id: 'item-a' });
    m.db.receiptSequence.upsert.mockResolvedValue({ counter: 1 });
    m.db.purchaseOrder.create.mockResolvedValue({ id: 'order-a' });
    const response = await orders.POST(req('/api/admin/procurement/orders', { cityId: 'city-a', parkId: 'park-a', itemId: 'item-a', quantity: 10, unitCost: 5, supplierName: 'Audit supplier' }));
    expect(response.status).toBe(201);
    expect(m.db.purchaseOrder.create.mock.calls[0][0].data.status).toBe('issued');
    expect(m.db.parkStock.upsert.mock.calls[0][0].update.quantity.increment).toBe(10);
  });

  it('A17: concurrent transfers overspend stock checked outside the transaction', async () => {
    actor('super_admin');
    m.db.park.findUnique.mockImplementation(async ({ where }) => ({ id: where.id, cityId: 'city-a' }));
    let balance = 5;
    let readers = 0;
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    m.db.parkStock.findUnique.mockImplementation(async () => {
      const quantity = balance;
      if (++readers === 2) release();
      await barrier;
      return { quantity };
    });
    m.db.parkStock.update.mockImplementation(async ({ data }) => { balance -= data.quantity.decrement; return { quantity: balance }; });
    m.db.stockTransfer.create.mockResolvedValue({ id: 'transfer-a' });
    const body = { fromParkId: 'park-a', toParkId: 'park-b', itemId: 'item-a', quantity: 4 };
    const responses = await Promise.all([transfers.POST(req('/api/admin/procurement/transfers', body)), transfers.POST(req('/api/admin/procurement/transfers', body))]);
    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(balance).toBe(-3);
  });

  it('A18: multi-session attendance percentage exceeds 100 and Murabbi present stays zero', async () => {
    actor('super_admin');
    m.db.park.findMany.mockResolvedValue([{ id: 'park-a', name: 'Audit Park' }]);
    m.db.batch.findMany.mockResolvedValue([{ id: 'batch-a', parkId: 'park-a' }]);
    m.db.group.findMany.mockResolvedValue([{ id: 'group-a', batchId: 'batch-a', name: 'Audit Group', murabbis: [] }]);
    m.db.participant.findMany.mockResolvedValue([{ id: 'student-a', groupId: 'group-a' }]);
    m.db.attendanceEvent.findMany.mockResolvedValue([{ id: 'event-a', groupId: 'group-a' }, { id: 'event-b', groupId: 'group-a' }]);
    m.db.attendanceRecord.findMany.mockResolvedValue([{ id: 'record-a', eventId: 'event-a' }, { id: 'record-b', eventId: 'event-b' }]);
    const body = await (await analytics.GET(req('/api/admin/home-analytics?from=2026-09-01&to=2026-09-08'))).json();
    expect(body.parks[0].percentage).toBe(200);
    expect(body.byMurabbi[0].present).toBe(0);
  });
});
