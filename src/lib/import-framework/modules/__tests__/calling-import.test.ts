import { describe, it, expect } from 'vitest';
import { processCallingImport } from '../calling-import';
import { ImportScopeContext } from '../../types';

const sampleScope: ImportScopeContext = {
  actorId: 'usr_superadmin_01',
  cityId: 'cty_lahore_01',
};

describe('V2-102 Calling History Importer', () => {
  it('parses valid calling history workbook rows in dry-run mode', async () => {
    const headers = [
      'Campaign Code',
      'Name',
      'Contact Number',
      'WhatsApp',
      'Calling Status',
      'Response',
      'Caller',
      'Notes',
    ];
    const rows = [
      {
        'Campaign Code': 'CAMP-LAHORE-2026',
        Name: 'Saad Rafique',
        'Contact Number': '+923001234567',
        WhatsApp: '+923001234567',
        'Calling Status': 'interested',
        Response: 'Will attend weekend session',
        Caller: 'caller_ali@example.com',
        Notes: 'Student asked about parking availability and timings.',
      },
    ];

    const report = await processCallingImport({
      mode: 'dry_run',
      scope: sampleScope,
      headers,
      rows,
      knownCampaigns: ['CAMP-LAHORE-2026'],
      knownCallers: ['caller_ali@example.com'],
    });

    expect(report.moduleCode).toBe('calling_history_v2');
    expect(report.totalRows).toBe(1);
    expect(report.counts.valid).toBe(1);
    expect(report.errors).toHaveLength(0);
    expect(report.rowResults[0].parsedData?.applicantName).toBe('Saad Rafique');
    expect(report.rowResults[0].parsedData?.callingStatus).toBe('interested');

    // Verify PII Redaction Evidence
    expect(report.rowResults[0].matchingEvidence?.hasCallNotes).toBe(true);
    expect(report.rowResults[0].matchingEvidence?.sanitizedNotesSummary).toBe(
      '[REDACTED_SENSITIVE_CALL_NOTES]'
    );
  });

  it('rejects unauthenticated scope context', async () => {
    const headers = ['Campaign Code', 'Name', 'Contact Number', 'Calling Status'];
    const rows = [
      {
        'Campaign Code': 'CAMP-01',
        Name: 'Test Applicant',
        'Contact Number': '+923000000000',
        'Calling Status': 'contacted',
      },
    ];

    await expect(
      processCallingImport({
        mode: 'dry_run',
        scope: { actorId: '' },
        headers,
        rows,
      })
    ).rejects.toThrow('UNAUTHORIZED: Scope context must include verified actorId.');
  });

  it('flags unrecognized campaign codes and callers for operator resolution', async () => {
    const headers = ['Campaign Code', 'Name', 'Contact Number', 'Calling Status', 'Caller'];
    const rows = [
      {
        'Campaign Code': 'UNKNOWN_CAMPAIGN_99',
        Name: 'Unknown Ref User',
        'Contact Number': '+923009998877',
        'Calling Status': 'unreachable',
        Caller: 'unknown_caller@example.com',
      },
    ];

    const report = await processCallingImport({
      mode: 'dry_run',
      scope: sampleScope,
      headers,
      rows,
      knownCampaigns: ['CAMP-APPROVED-01'],
      knownCallers: ['approved_caller@example.com'],
    });

    expect(report.rowResults[0].errors).toHaveLength(2);
    expect(report.rowResults[0].errors.some((e) => e.code === 'UNMATCHED_CAMPAIGN')).toBe(true);
    expect(report.rowResults[0].errors.some((e) => e.code === 'UNMATCHED_CALLER')).toBe(true);
  });

  it('detects duplicate calling entries in the same campaign', async () => {
    const headers = ['Campaign Code', 'Name', 'Contact Number', 'Calling Status'];
    const rows = [
      {
        'Campaign Code': 'CAMP-01',
        Name: 'Duplicate Person',
        'Contact Number': '+923001112233',
        'Calling Status': 'contacted',
      },
      {
        'Campaign Code': 'CAMP-01',
        Name: 'Duplicate Person',
        'Contact Number': '+923001112233',
        'Calling Status': 'interested',
      },
    ];

    const report = await processCallingImport({
      mode: 'dry_run',
      scope: sampleScope,
      headers,
      rows,
    });

    expect(report.rowResults[0].status).toBe('valid');
    expect(report.rowResults[1].status).toBe('duplicate');
  });

  it('executes saving calling record handler in execute mode', async () => {
    const headers = ['Campaign Code', 'Name', 'Contact Number', 'Calling Status'];
    const rows = [
      {
        'Campaign Code': 'CAMP-01',
        Name: 'Saved Candidate',
        'Contact Number': '+923005556677',
        'Calling Status': 'interested',
      },
    ];

    const savedRecords: string[] = [];

    const report = await processCallingImport({
      mode: 'execute',
      scope: sampleScope,
      headers,
      rows,
      onSaveCallingRecord: async (data) => {
        savedRecords.push(data.primaryMobile);
        return { id: 'call_rec_01', outcome: 'created' };
      },
    });

    expect(report.counts.created).toBe(1);
    expect(savedRecords).toEqual(['+923005556677']);
  });
});
