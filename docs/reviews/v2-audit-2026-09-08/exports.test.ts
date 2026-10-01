import { expect, it } from 'vitest';
import { generateMashwaraMinutes } from '@/lib/mashwara/export-minutes';

it('A22: minutes exporter embeds unescaped stored markup in same-origin HTML', () => {
  const marker = '<img src=x onerror="void(0)" data-audit="inert-marker">';
  const result = generateMashwaraMinutes({ id: 'audit-meeting', title: marker, meetingDate: '2026-09-08', status: 'completed', attendees: [], decisions: [], actionItems: [] });
  expect(result.mimeType).toBe('text/html');
  expect(result.content).toContain(`<title>${marker} - Minutes</title>`);
  expect(result.content).toContain(`</strong> ${marker}</div>`);
});
