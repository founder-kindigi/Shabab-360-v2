/**
 * Shabab 360 - Mashwara Minutes of Meeting (MoM) Exporter (V2-303)
 * Formats meeting minutes into printable HTML / Markdown with module-scoped Urdu/RTL support.
 */

export interface MashwaraMeetingData {
  id: string;
  title: string;
  meetingDate: Date | string;
  cityName?: string;
  parkName?: string;
  notes?: string | null;
  status: string;
  attendees: Array<{ name: string; role?: string; isPresent: boolean }>;
  decisions: Array<{ title: string; details?: string | null; category?: string }>;
  actionItems: Array<{
    title: string;
    assigneeName?: string;
    teamName?: string;
    dueDate?: Date | string | null;
    status: string;
  }>;
}

export interface ExportMinutesOptions {
  format: 'html' | 'markdown' | 'json';
  lang?: 'en' | 'ur';
}

export function generateMashwaraMinutes(
  meeting: MashwaraMeetingData,
  options: ExportMinutesOptions = { format: 'html', lang: 'en' }
): { content: string; mimeType: string; isRTL: boolean } {
  const isUrdu = options.lang === 'ur';
  const isRTL = isUrdu;

  const labels = isUrdu
    ? {
        header: 'مشورہ کی روئداد (Minutes of Meeting)',
        meetingTitle: 'عنوان مشورہ',
        date: 'تاریخ',
        city: 'شہر',
        location: 'مقام',
        attendees: 'شرکاء کی فہرست',
        decisions: 'منظور شدہ فیصلے',
        actionItems: 'عملی ہدایات و کارروائی',
        present: 'حاضر',
        absent: 'غیر حاضر',
        status: 'حیثیت',
        dueDate: 'آخری تاریخ',
        assignee: 'مسؤل / ذمہ دار',
      }
    : {
        header: 'Mashwara Minutes of Meeting (MoM)',
        meetingTitle: 'Meeting Title',
        date: 'Date',
        city: 'City',
        location: 'Location',
        attendees: 'Attendees List',
        decisions: 'Approved Decisions',
        actionItems: 'Action Items & Assignments',
        present: 'Present',
        absent: 'Absent',
        status: 'Status',
        dueDate: 'Due Date',
        assignee: 'Assignee',
      };

  const meetingDateStr =
    meeting.meetingDate instanceof Date
      ? meeting.meetingDate.toISOString().split('T')[0]
      : String(meeting.meetingDate).split('T')[0];

  if (options.format === 'markdown') {
    let md = `# ${labels.header}\n\n`;
    md += `**${labels.meetingTitle}:** ${meeting.title}\n`;
    md += `**${labels.date}:** ${meetingDateStr}\n`;
    if (meeting.cityName) md += `**${labels.city}:** ${meeting.cityName}\n`;
    md += `\n## ${labels.attendees}\n`;
    meeting.attendees.forEach((a) => {
      md += `- ${a.name} (${a.isPresent ? labels.present : labels.absent})\n`;
    });

    md += `\n## ${labels.decisions}\n`;
    meeting.decisions.forEach((d, i) => {
      md += `${i + 1}. **${d.title}**${d.details ? `: ${d.details}` : ''}\n`;
    });

    md += `\n## ${labels.actionItems}\n`;
    meeting.actionItems.forEach((item, i) => {
      const assigneeStr = item.assigneeName || item.teamName || 'Unassigned';
      md += `${i + 1}. **${item.title}** — ${labels.assignee}: ${assigneeStr} [${item.status}]\n`;
    });

    return { content: md, mimeType: 'text/markdown', isRTL };
  }

  // Default HTML printable layout
  let html = `<!DOCTYPE html>
<html lang="${isUrdu ? 'ur' : 'en'}" dir="${isRTL ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8">
  <title>${meeting.title} - Minutes</title>
  <style>
    body { font-family: ${isUrdu ? "'Jameel Noori Nastaleeq', 'Noto Naskh Arabic', sans-serif" : "Inter, system-ui, sans-serif"}; padding: 24px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6; }
    h1 { color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; font-size: 24px; }
    h2 { color: #1e3a8a; margin-top: 24px; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .meta-box { background: #f8fafc; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { text-align: ${isRTL ? 'right' : 'left'}; padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 14px; }
    th { background: #f1f5f9; font-weight: 600; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge-present { background: #dcfce7; color: #166534; }
    .badge-absent { background: #fee2e2; color: #991b1b; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${labels.header}</h1>
  <div class="meta-box">
    <div><strong>${labels.meetingTitle}:</strong> ${meeting.title}</div>
    <div><strong>${labels.date}:</strong> ${meetingDateStr}</div>
    ${meeting.cityName ? `<div><strong>${labels.city}:</strong> ${meeting.cityName}</div>` : ''}
  </div>

  <h2>${labels.attendees}</h2>
  <table>
    <thead><tr><th>Name</th><th>${labels.status}</th></tr></thead>
    <tbody>
      ${meeting.attendees
        .map(
          (a) => `<tr>
            <td>${a.name}</td>
            <td><span class="badge ${a.isPresent ? 'badge-present' : 'badge-absent'}">${a.isPresent ? labels.present : labels.absent}</span></td>
          </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <h2>${labels.decisions}</h2>
  <ol>
    ${meeting.decisions
      .map((d) => `<li><strong>${d.title}</strong>${d.details ? `<br><small>${d.details}</small>` : ''}</li>`)
      .join('')}
  </ol>

  <h2>${labels.actionItems}</h2>
  <table>
    <thead>
      <tr>
        <th>Action Task</th>
        <th>${labels.assignee}</th>
        <th>${labels.status}</th>
      </tr>
    </thead>
    <tbody>
      ${meeting.actionItems
        .map(
          (item) => `<tr>
            <td>${item.title}</td>
            <td>${item.assigneeName || item.teamName || 'Unassigned'}</td>
            <td>${item.status}</td>
          </tr>`
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>`;

  return { content: html, mimeType: 'text/html', isRTL };
}
