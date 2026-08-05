import { describe, it, expect } from 'vitest';
import { processAdmissionsImport } from '../admissions-import';
import { ImportScopeContext } from '../../types';

const sampleScope: ImportScopeContext = {
  actorId: 'usr_superadmin_01',
  cityId: 'cty_lahore_01',
};

describe('V2-101 Registrations & Admissions Importer', () => {
  it('parses valid admissions workbook rows cleanly in dry-run mode', async () => {
    const headers = ['Candidate Name', 'Applicant Mobile', 'Father Name', 'Parent Phone', 'Status', 'Registration ID'];
    const rows = [
      {
        'Candidate Name': 'Bilal Farooq',
        'Applicant Mobile': '+923001234567',
        'Father Name': 'Farooq Ahmed',
        'Parent Phone': '+923007654321',
        Status: 'accepted',
        'Registration ID': 'REG-2026-001',
      },
      {
        'Candidate Name': 'Hamza Tariq',
        'Applicant Mobile': '03019876543',
        'Father Name': 'Tariq Mehmood',
        'Parent Phone': '03011234567',
        Status: 'interviewed',
        'Registration ID': 'REG-2026-002',
      },
    ];

    const report = await processAdmissionsImport({
      mode: 'dry_run',
      scope: sampleScope,
      headers,
      rows,
    });

    expect(report.moduleCode).toBe('admissions_v2');
    expect(report.totalRows).toBe(2);
    expect(report.counts.valid).toBe(2);
    expect(report.counts.invalid).toBe(0);
    expect(report.errors).toHaveLength(0);
    expect(report.unsupportedColumnsFound).toHaveLength(0);
    expect(report.rowResults[0].parsedData).toEqual({
      applicantName: 'Bilal Farooq',
      mobile: '+923001234567',
      guardianName: 'Farooq Ahmed',
      guardianPhone: '+923007654321',
      admissionStatus: 'accepted',
      sourceReference: 'REG-2026-001',
    });
  });

  it('rejects unauthenticated scope context with unauthorized error', async () => {
    const headers = ['Candidate Name', 'Applicant Mobile'];
    const rows = [{ 'Candidate Name': 'Test Student', 'Applicant Mobile': '+923000000000' }];

    await expect(
      processAdmissionsImport({
        mode: 'dry_run',
        scope: { actorId: '' }, // Missing actorId
        headers,
        rows,
      })
    ).rejects.toThrow('UNAUTHORIZED: Scope context must include verified actorId.');
  });

  it('detects duplicate applicants against existing database records', async () => {
    const headers = ['Candidate Name', 'Applicant Mobile', 'Registration ID'];
    const rows = [
      { 'Candidate Name': 'New Applicant', 'Applicant Mobile': '+923009999999', 'Registration ID': 'REG-NEW-01' },
      { 'Candidate Name': 'Existing Applicant', 'Applicant Mobile': '+923001112222', 'Registration ID': 'REG-EXISTING-01' },
    ];

    const existingApplicants = [
      { id: 'app_01', mobile: '+923001112222', sourceReference: 'REG-EXISTING-01' },
    ];

    const report = await processAdmissionsImport({
      mode: 'dry_run',
      scope: sampleScope,
      headers,
      rows,
      existingApplicants,
    });

    expect(report.rowResults[0].status).toBe('valid');
    expect(report.rowResults[1].status).toBe('duplicate');
  });

  it('reports unsupported workbook columns without dropping them silently', async () => {
    const headers = ['Candidate Name', 'Applicant Mobile', 'Blood Group', 'School Name'];
    const rows = [
      { 'Candidate Name': 'Ali Khan', 'Applicant Mobile': '+923005554433', 'Blood Group': 'O+', 'School Name': 'Model High School' },
    ];

    const report = await processAdmissionsImport({
      mode: 'discovery',
      scope: sampleScope,
      headers,
      rows,
    });

    expect(report.unsupportedColumnsFound).toEqual(['Blood Group', 'School Name']);
  });

  it('executes applicant save callback in execute mode', async () => {
    const headers = ['Candidate Name', 'Applicant Mobile'];
    const rows = [{ 'Candidate Name': 'Zain Malik', 'Applicant Mobile': '+923008887766' }];

    const createdIds: string[] = [];

    const report = await processAdmissionsImport({
      mode: 'execute',
      scope: sampleScope,
      headers,
      rows,
      onSaveApplicant: async (data) => {
        createdIds.push(data.mobile);
        return { id: 'app_new_01', outcome: 'created' };
      },
    });

    expect(report.counts.created).toBe(1);
    expect(createdIds).toEqual(['+923008887766']);
  });
});
