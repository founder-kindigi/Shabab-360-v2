import { describe, it, expect } from 'vitest';
import { processImport } from '../parser';
import { ImportTemplateSpec, ImportScopeContext } from '../types';

interface SampleStudentRow {
  fullName: string;
  phone: string;
  age?: number;
}

const sampleTemplate: ImportTemplateSpec<SampleStudentRow> = {
  moduleCode: 'admissions_test',
  version: '1.0.0',
  columns: [
    {
      key: 'fullName',
      header: 'Full Name',
      aliases: ['Name', 'Student Name'],
      required: true,
    },
    {
      key: 'phone',
      header: 'Phone Number',
      aliases: ['Mobile', 'Contact Phone'],
      required: true,
      validate: (val) => {
        const str = String(val).trim();
        if (!/^\+?[0-9\s-]{10,15}$/.test(str)) {
          return { valid: false, error: 'Invalid phone format.' };
        }
        return { valid: true, value: str };
      },
    },
    {
      key: 'age',
      header: 'Age',
      required: false,
      validate: (val) => {
        const num = Number(val);
        if (isNaN(num) || num < 5 || num > 30) {
          return { valid: false, error: 'Age must be between 5 and 30.' };
        }
        return { valid: true, value: num };
      },
    },
  ],
};

const sampleScope: ImportScopeContext = {
  actorId: 'usr_superadmin_01',
  cityId: 'cty_lahore_01',
};

describe('Shared Import Framework Parser', () => {
  it('successfully parses valid rows and builds a reconciliation report', async () => {
    const headers = ['Student Name', 'Contact Phone', 'Age'];
    const rows = [
      { 'Student Name': 'Ahmed Hassan', 'Contact Phone': '+923001234567', Age: '15' },
      { 'Student Name': 'Zaid Ali', 'Contact Phone': '03009876543', Age: '18' },
    ];

    const result = await processImport<SampleStudentRow>({
      template: sampleTemplate,
      mode: 'dry_run',
      scope: sampleScope,
      headers,
      rows,
    });

    expect(result.moduleCode).toBe('admissions_test');
    expect(result.mode).toBe('dry_run');
    expect(result.totalRows).toBe(2);
    expect(result.counts.valid).toBe(2);
    expect(result.counts.invalid).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(result.unsupportedColumnsFound).toHaveLength(0);
    expect(result.rowResults[0].parsedData).toEqual({
      fullName: 'Ahmed Hassan',
      phone: '+923001234567',
      age: 15,
    });
  });

  it('detects missing required columns globally', async () => {
    const headers = ['Age']; // Missing Full Name and Phone Number
    const rows = [{ Age: '15' }];

    const result = await processImport<SampleStudentRow>({
      template: sampleTemplate,
      mode: 'discovery',
      scope: sampleScope,
      headers,
      rows,
    });

    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.errors.some((e) => e.code === 'MISSING_REQUIRED_COLUMN')).toBe(true);
    expect(result.counts.invalid).toBe(1);
  });

  it('validates invalid field values at row level', async () => {
    const headers = ['Full Name', 'Phone Number', 'Age'];
    const rows = [
      { 'Full Name': 'Bad Row User', 'Phone Number': 'invalid_phone', Age: '100' },
    ];

    const result = await processImport<SampleStudentRow>({
      template: sampleTemplate,
      mode: 'dry_run',
      scope: sampleScope,
      headers,
      rows,
    });

    expect(result.counts.invalid).toBe(1);
    expect(result.rowResults[0].status).toBe('invalid');
    expect(result.rowResults[0].errors).toHaveLength(2); // Invalid phone & age out of bounds
  });

  it('identifies unsupported columns for audit safety', async () => {
    const headers = ['Full Name', 'Phone Number', 'Secret Notes', 'CNIC Number'];
    const rows = [
      {
        'Full Name': 'Usman Khan',
        'Phone Number': '+923001112233',
        'Secret Notes': 'Top secret',
        'CNIC Number': '35202-0000000-1',
      },
    ];

    const result = await processImport<SampleStudentRow>({
      template: sampleTemplate,
      mode: 'discovery',
      scope: sampleScope,
      headers,
      rows,
    });

    expect(result.unsupportedColumnsFound).toEqual(['Secret Notes', 'CNIC Number']);
  });

  it('detects duplicate rows using custom duplicate handler', async () => {
    const headers = ['Full Name', 'Phone Number'];
    const rows = [
      { 'Full Name': 'Same Name', 'Phone Number': '+923001234567' },
      { 'Full Name': 'Same Name', 'Phone Number': '+923001234567' },
    ];

    const result = await processImport<SampleStudentRow>({
      template: sampleTemplate,
      mode: 'dry_run',
      scope: sampleScope,
      headers,
      rows,
      detectDuplicate: (row, accumulator) => {
        return accumulator.some(
          (prev) => prev.parsedData?.phone === row.parsedData?.phone
        );
      },
    });

    expect(result.rowResults[0].status).toBe('valid');
    expect(result.rowResults[1].status).toBe('duplicate');
  });

  it('executes row creation / update when onExecuteRow handler is provided', async () => {
    const headers = ['Full Name', 'Phone Number'];
    const rows = [
      { 'Full Name': 'New Candidate', 'Phone Number': '+923001234567' },
      { 'Full Name': 'Existing Candidate', 'Phone Number': '+923009876543' },
    ];

    const result = await processImport<SampleStudentRow>({
      template: sampleTemplate,
      mode: 'execute',
      scope: sampleScope,
      headers,
      rows,
      onExecuteRow: async (row) => {
        if (row.parsedData?.fullName === 'New Candidate') {
          return { outcome: 'created' };
        }
        return { outcome: 'updated' };
      },
    });

    expect(result.counts.created).toBe(1);
    expect(result.counts.updated).toBe(1);
  });
});
