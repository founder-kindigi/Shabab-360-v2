import { describe, it, expect } from 'vitest';
import { processBatchesImport } from '../batches-import';
import { ImportScopeContext } from '../../types';

const sampleScope: ImportScopeContext = {
  actorId: 'usr_superadmin_01',
  cityId: 'cty_lahore_01',
};

describe('V2-103 Previous Three Batches Importer', () => {
  it('parses valid batch history rows cleanly in dry-run mode', async () => {
    const headers = [
      'City Name',
      'Park Name',
      'Batch Name',
      'Group Name',
      'Murabbi Name',
      'Student Name',
      'Student Mobile',
      'Father Name',
      'State',
      'Present Events',
      'Total Events',
    ];
    const rows = [
      {
        'City Name': 'Lahore',
        'Park Name': 'Gulshan-e-Iqbal',
        'Batch Name': 'Batch 3',
        'Group Name': 'Group Alpha',
        'Murabbi Name': 'Murabbi Tariq',
        'Student Name': 'Zain Ul Abideen',
        'Student Mobile': '+923001234567',
        'Father Name': 'Abideen Shah',
        State: 'active',
        'Present Events': '10',
        'Total Events': '12',
      },
    ];

    const report = await processBatchesImport({
      mode: 'dry_run',
      scope: sampleScope,
      headers,
      rows,
    });

    expect(report.moduleCode).toBe('historical_batches_v2');
    expect(report.totalRows).toBe(1);
    expect(report.counts.valid).toBe(1);
    expect(report.rowResults[0].parsedData?.cityName).toBe('Lahore');
    expect(report.rowResults[0].parsedData?.studentName).toBe('Zain Ul Abideen');
    expect(report.rowResults[0].parsedData?.attendancePresentCount).toBe(10);
    expect(report.rowResults[0].parsedData?.attendanceTotalEvents).toBe(12);
  });

  it('rejects unauthenticated scope context', async () => {
    const headers = ['City Name', 'Park Name', 'Batch Name', 'Student Name', 'Student Mobile'];
    const rows = [
      {
        'City Name': 'Lahore',
        'Park Name': 'Model Town Park',
        'Batch Name': 'Batch 2',
        'Student Name': 'Test Student',
        'Student Mobile': '+923000000000',
      },
    ];

    await expect(
      processBatchesImport({
        mode: 'dry_run',
        scope: { actorId: '' },
        headers,
        rows,
      })
    ).rejects.toThrow('UNAUTHORIZED: Scope context must include verified actorId.');
  });

  it('preserves valid unassigned students with an info warning for manual placement', async () => {
    const headers = ['City Name', 'Park Name', 'Batch Name', 'Student Name', 'Student Mobile'];
    const rows = [
      {
        'City Name': 'Lahore',
        'Park Name': 'Jinnah Park',
        'Batch Name': 'Batch 1',
        'Student Name': 'Unassigned Candidate',
        'Student Mobile': '+923009998877',
      },
    ];

    const report = await processBatchesImport({
      mode: 'dry_run',
      scope: sampleScope,
      headers,
      rows,
    });

    expect(report.counts.valid).toBe(1);
    expect(report.rowResults[0].status).toBe('valid');
    expect(report.rowResults[0].errors.some((e) => e.code === 'UNASSIGNED_GROUP_PRESERVED')).toBe(true);
  });

  it('warns when dropout state is set without an explicit dropout date', async () => {
    const headers = ['City Name', 'Park Name', 'Batch Name', 'Student Name', 'Student Mobile', 'State'];
    const rows = [
      {
        'City Name': 'Lahore',
        'Park Name': 'Model Town Park',
        'Batch Name': 'Batch 3',
        'Student Name': 'Dropout Student',
        'Student Mobile': '+923005554433',
        State: 'dropout',
      },
    ];

    const report = await processBatchesImport({
      mode: 'dry_run',
      scope: sampleScope,
      headers,
      rows,
    });

    expect(report.rowResults[0].errors.some((e) => e.code === 'DROPOUT_DATE_MISSING')).toBe(true);
  });

  it('detects duplicate student entries in the same batch', async () => {
    const headers = ['City Name', 'Park Name', 'Batch Name', 'Student Name', 'Student Mobile'];
    const rows = [
      {
        'City Name': 'Lahore',
        'Park Name': 'Jinnah Park',
        'Batch Name': 'Batch 3',
        'Student Name': 'Same Student',
        'Student Mobile': '+923001112233',
      },
      {
        'City Name': 'Lahore',
        'Park Name': 'Jinnah Park',
        'Batch Name': 'Batch 3',
        'Student Name': 'Same Student',
        'Student Mobile': '+923001112233',
      },
    ];

    const report = await processBatchesImport({
      mode: 'dry_run',
      scope: sampleScope,
      headers,
      rows,
    });

    expect(report.rowResults[0].status).toBe('valid');
    expect(report.rowResults[1].status).toBe('duplicate');
  });

  it('executes saving batch participant callback in execute mode', async () => {
    const headers = ['City Name', 'Park Name', 'Batch Name', 'Student Name', 'Student Mobile'];
    const rows = [
      {
        'City Name': 'Lahore',
        'Park Name': 'Jinnah Park',
        'Batch Name': 'Batch 3',
        'Student Name': 'Saved Participant',
        'Student Mobile': '+923007778899',
      },
    ];

    const savedStudents: string[] = [];

    const report = await processBatchesImport({
      mode: 'execute',
      scope: sampleScope,
      headers,
      rows,
      onSaveBatchParticipant: async (data) => {
        savedStudents.push(data.studentMobile);
        return { id: 'part_rec_01', outcome: 'created' };
      },
    });

    expect(report.counts.created).toBe(1);
    expect(savedStudents).toEqual(['+923007778899']);
  });
});
