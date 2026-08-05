import { describe, it, expect } from 'vitest';
import { generateMashwaraMinutes, MashwaraMeetingData } from '../export-minutes';

const sampleMeeting: MashwaraMeetingData = {
  id: 'msh_101',
  title: 'Weekly Lahore City Mashwara',
  meetingDate: '2026-08-04',
  cityName: 'Lahore',
  status: 'closed',
  attendees: [
    { name: 'Tariq Mehmood', isPresent: true },
    { name: 'Usman Ali', isPresent: false },
  ],
  decisions: [
    { title: 'Approve new Gulshan Park Lead assignment', details: 'Effective immediately' },
  ],
  actionItems: [
    {
      title: 'Prepare Batch 4 attendance summary',
      assigneeName: 'Tariq Mehmood',
      status: 'in_progress',
    },
  ],
};

describe('V2-303 Mashwara Minutes Exporter', () => {
  it('generates clean HTML minutes in English', () => {
    const res = generateMashwaraMinutes(sampleMeeting, { format: 'html', lang: 'en' });
    expect(res.isRTL).toBe(false);
    expect(res.mimeType).toBe('text/html');
    expect(res.content).toContain('Mashwara Minutes of Meeting');
    expect(res.content).toContain('Weekly Lahore City Mashwara');
    expect(res.content).toContain('Tariq Mehmood');
  });

  it('generates Urdu RTL HTML minutes when lang is ur', () => {
    const res = generateMashwaraMinutes(sampleMeeting, { format: 'html', lang: 'ur' });
    expect(res.isRTL).toBe(true);
    expect(res.content).toContain('dir="rtl"');
    expect(res.content).toContain('مشورہ کی روئداد');
    expect(res.content).toContain('منظور شدہ فیصلے');
  });

  it('generates Markdown formatted minutes', () => {
    const res = generateMashwaraMinutes(sampleMeeting, { format: 'markdown', lang: 'en' });
    expect(res.mimeType).toBe('text/markdown');
    expect(res.content).toContain('# Mashwara Minutes of Meeting');
    expect(res.content).toContain('- Tariq Mehmood (Present)');
  });
});
