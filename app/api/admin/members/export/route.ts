import { memberStats, programmesList } from '@/lib/analytics';
import { FOLLOW_UP_AFTER, today } from '@/lib/db';
import { ROLE_LABEL, STATUS_LABEL } from '@/lib/config';
import { denyUnlessAdmin } from '@/lib/http';

export async function GET(req: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const threshold = Math.max(1, Number(new URL(req.url).searchParams.get('threshold')) || FOLLOW_UP_AFTER);
  const [rows, programmes] = await Promise.all([memberStats(threshold), programmesList()]);
  const names = new Map(programmes.map((p) => [p.id, p.name]));
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['Name', 'Role', 'Phone', 'Programmes', 'Attended', 'Expected', 'Attendance %', 'Missed in a row', 'Last seen', 'Last programme', 'Status', 'First seen', 'Notes'];
  const lines = rows.map((m) =>
    [
      m.full_name, ROLE_LABEL[m.role], m.phone, m.programmeIds.map((id) => names.get(id)).join('; '), m.attended, m.eligible,
      m.rate === null ? '' : Math.round(m.rate * 100), m.missedInARow, m.lastSeen, m.lastProgramme,
      STATUS_LABEL[m.status], new Date(m.created_at).toISOString().slice(0, 10), m.notes,
    ].map(cell).join(','),
  );
  return new Response([header.map(cell).join(','), ...lines].join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="youth-members-${today()}.csv"`,
    },
  });
}
