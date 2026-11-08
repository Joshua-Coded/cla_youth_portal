import { sql, today, FOLLOW_UP_AFTER } from './db';
import { inAudience, type Audience, type Programme, type Role, type Status } from './config';

export type Member = { id: number; full_name: string; phone: string | null; role: Role; notes: string | null; created_at: string };

export type MemberStats = Member & {
  attended: number;
  eligible: number;
  rate: number | null;
  missedInARow: number;
  lastSeen: string | null;
  lastProgramme: string | null;
  programmeIds: number[];
  primaryProgrammeId: number | null;
  status: Status;
};

type Session = { id: number; programme_id: number; date: string; is_open: boolean };

export const programmesList = async () =>
  (await sql`SELECT id, name, tagline, schedule, color, icon, code, is_active, sort_order
             FROM programmes ORDER BY sort_order, id`) as Programme[];

/**
 * Per-member consistency figures.
 *
 * A session is a programme meeting on a given day. A member is expected at every session
 * of each programme they attend, from their first check-in to that programme onward.
 * Today's sessions don't count as missed until they're closed or the day passes.
 */
export async function memberStats(threshold = FOLLOW_UP_AFTER): Promise<MemberStats[]> {
  const t = today();
  const [programmes, sessions, members, attendance] = (await Promise.all([
    programmesList(),
    sql`SELECT id, programme_id, date::text AS date, is_open FROM sessions ORDER BY date, id`,
    sql`SELECT id, full_name, phone, role, notes, created_at FROM members ORDER BY lower(full_name)`,
    sql`SELECT member_id, session_id FROM attendance`,
  ])) as [Programme[], Session[], Member[], { member_id: number; session_id: number }[]];

  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const nameById = new Map(programmes.map((p) => [p.id, p.name]));
  const mineBy = new Map<number, Set<number>>();
  for (const a of attendance) {
    if (!mineBy.has(a.member_id)) mineBy.set(a.member_id, new Set());
    mineBy.get(a.member_id)!.add(a.session_id);
  }
  const finished = (s: Session) => s.date < t || (!s.is_open && s.date <= t);

  return members.map((m) => {
    const mine = mineBy.get(m.id) ?? new Set<number>();
    const firstByProgramme = new Map<number, string>();
    const countByProgramme = new Map<number, number>();
    for (const id of mine) {
      const s = sessionById.get(id)!;
      const first = firstByProgramme.get(s.programme_id);
      if (!first || s.date < first) firstByProgramme.set(s.programme_id, s.date);
      countByProgramme.set(s.programme_id, (countByProgramme.get(s.programme_id) ?? 0) + 1);
    }

    const eligible = sessions.filter((s) => {
      const first = firstByProgramme.get(s.programme_id);
      return first !== undefined && s.date >= first && (mine.has(s.id) || finished(s));
    });

    let missedInARow = 0;
    for (let i = eligible.length - 1; i >= 0 && !mine.has(eligible[i].id); i--) missedInARow++;
    const last = eligible.findLast((s) => mine.has(s.id));
    const programmeIds = [...countByProgramme.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);

    let status: Status = 'active';
    if (missedInARow >= threshold) status = 'follow-up';
    else if (missedInARow > 0 && missedInARow >= threshold - 1) status = 'at-risk';

    return {
      ...m,
      attended: mine.size,
      eligible: eligible.length,
      rate: eligible.length ? mine.size / eligible.length : null,
      missedInARow,
      lastSeen: last?.date ?? null,
      lastProgramme: last ? nameById.get(last.programme_id) ?? null : null,
      programmeIds,
      primaryProgrammeId: programmeIds[0] ?? null,
      status,
    };
  });
}

export async function overview({ programmeId, threshold = FOLLOW_UP_AFTER, audience = 'youth' }: {
  programmeId?: number;
  threshold?: number;
  audience?: Audience;
}) {
  const t = today();
  const p = programmeId ?? null;
  const youth = audience === 'youth';

  const [programmes, everyone, sessionCounts, [month], [fresh], recentCheckins] = await Promise.all([
    programmesList(),
    memberStats(threshold),
    sql`SELECT s.id, s.programme_id, s.date::text AS date,
               COUNT(m.id) FILTER (WHERE (m.role = 'member') = ${youth})::int AS n
        FROM sessions s LEFT JOIN attendance a ON a.session_id = s.id LEFT JOIN members m ON m.id = a.member_id
        WHERE s.date <= ${t} GROUP BY s.id ORDER BY s.date, s.id`,
    sql`SELECT COUNT(*)::int AS n FROM attendance a JOIN sessions s ON s.id = a.session_id JOIN members m ON m.id = a.member_id
        WHERE to_char(s.date, 'YYYY-MM') = ${t.slice(0, 7)} AND (${p}::int IS NULL OR s.programme_id = ${p})
          AND (m.role = 'member') = ${youth}`,
    sql`SELECT COUNT(DISTINCT m.id)::int AS n FROM members m
        JOIN attendance a ON a.member_id = m.id JOIN sessions s ON s.id = a.session_id
        WHERE m.created_at >= now() - interval '30 days' AND (${p}::int IS NULL OR s.programme_id = ${p})
          AND (m.role = 'member') = ${youth}`,
    sql`SELECT a.created_at, m.id AS member_id, m.full_name, m.role, pr.name AS programme, pr.color
        FROM attendance a JOIN members m ON m.id = a.member_id
        JOIN sessions s ON s.id = a.session_id JOIN programmes pr ON pr.id = s.programme_id
        WHERE (${p}::int IS NULL OR s.programme_id = ${p}) AND (m.role = 'member') = ${youth}
        ORDER BY a.id DESC LIMIT 12`,
  ]);

  const all = everyone.filter((m) => inAudience(m.role, audience));
  const stats = p ? all.filter((m) => m.programmeIds.includes(p)) : all;
  const count = (s: Status) => stats.filter((m) => m.status === s).length;
  const relevant = sessionCounts.filter((s) => !p || s.programme_id === p);

  // Attendance by day, split by programme
  const dates = [...new Set(relevant.map((s) => s.date as string))].slice(-12);
  const trend = dates.map((date) => {
    const byProgramme: Record<number, number> = {};
    for (const s of relevant) if (s.date === date) byProgramme[s.programme_id] = s.n;
    return { date, byProgramme, total: Object.values(byProgramme).reduce((a, b) => a + b, 0) };
  });

  const lastEight = relevant.slice(-8);
  const avgAttendance = lastEight.length ? Math.round(lastEight.reduce((a, s) => a + s.n, 0) / lastEight.length) : 0;
  const hereToday = relevant.filter((s) => s.date === t).reduce((a, s) => a + s.n, 0);

  const byProgramme = programmes.map((pr) => {
    const group = all.filter((m) => m.programmeIds.includes(pr.id));
    return {
      id: pr.id,
      name: pr.name,
      color: pr.color,
      members: group.length,
      active: group.filter((m) => m.status === 'active').length,
      atRisk: group.filter((m) => m.status === 'at-risk').length,
      followUp: group.filter((m) => m.status === 'follow-up').length,
      today: sessionCounts.filter((s) => s.programme_id === pr.id && s.date === t).reduce((a, s) => a + s.n, 0),
    };
  });

  const followUp = stats
    .filter((m) => m.status !== 'active')
    .sort((a, b) => b.missedInARow - a.missedInARow || (a.rate ?? 0) - (b.rate ?? 0));

  return {
    threshold,
    audience,
    programmes,
    kpis: {
      members: stats.length,
      hereToday,
      active: count('active'),
      atRisk: count('at-risk'),
      followUp: count('follow-up'),
      avgAttendance,
      checkinsThisMonth: month.n as number,
      newMembers: fresh.n as number,
    },
    trend,
    byProgramme,
    followUp,
    recentCheckins,
  };
}

export type Overview = Awaited<ReturnType<typeof overview>>;
