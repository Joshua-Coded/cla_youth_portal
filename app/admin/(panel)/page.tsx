'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Legend, Tooltip } from 'chart.js';
import type { Overview } from '@/lib/analytics';
import { Icon, ProgrammeIcon } from '@/components/Logo';
import { api, Avatar, ContactLinks, RoleBadge, daysAgo, fmtDate, ProgrammeTag, StatusBadge, Streak, timeAgo } from '@/components/ui';

Chart.register(BarElement, CategoryScale, LinearScale, Legend, Tooltip);
Chart.defaults.font.family = 'var(--font-sans), system-ui, sans-serif';
Chart.defaults.color = '#8f8aab';

export default function DashboardPage() {
  return (
    <Suspense fallback={<main className="page"><p className="muted">Loading dashboard…</p></main>}>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const router = useRouter();
  const params = useSearchParams();
  const programmeId = Number(params.get('programme')) || 0;
  const audience = params.get('audience') === 'team' ? 'team' : 'youth';
  const team = audience === 'team';
  const [threshold, setThreshold] = useState(3);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [hello, setHello] = useState('Welcome');

  useEffect(() => {
    const h = new Date().getHours();
    setHello(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
  }, []);

  useEffect(() => {
    const q = new URLSearchParams({ threshold: String(threshold), audience });
    if (programmeId) q.set('programme', String(programmeId));
    const load = () => api<Overview>(`/api/admin/overview?${q}`).then(setData).catch((e) => setError(e.message));
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [programmeId, threshold, audience]);

  if (error) return <main className="page"><div className="error">{error}</div></main>;
  if (!data) return <main className="page"><p className="muted">Loading dashboard…</p></main>;

  const { kpis, trend, byProgramme, followUp, recentCheckins, programmes } = data;
  const colorOf = new Map(programmes.map((p) => [p.id, p.color]));
  const current = programmes.find((p) => p.id === programmeId);
  const shown = current ? [current] : programmes;
  const go = (id: number, aud: string) => {
    const q = new URLSearchParams();
    if (id) q.set('programme', String(id));
    if (aud === 'team') q.set('audience', 'team');
    router.push(q.size ? `/admin?${q}` : '/admin');
  };
  const setProgramme = (id: number) => go(id, audience);
  const people = team ? 'facilitators & leaders' : 'young people';

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">{fmtDate(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1>{hello} 👋</h1>
          <p>{current ? `How ${current.name} is doing.` : `Here’s how our ${people} are showing up.`}</p>
        </div>
        <div className="toolbar">
          <div className="seg">
            <button className={!team ? 'on' : ''} onClick={() => go(programmeId, 'youth')}><Icon.members size={15} />Young people</button>
            <button className={team ? 'on' : ''} onClick={() => go(programmeId, 'team')}><Icon.people size={15} />Facilitators &amp; leaders</button>
          </div>
          <select className="select" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} title="When to flag someone">
            {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>Flag after {n} missed</option>)}
          </select>
        </div>
      </div>

      <div className="seg" style={{ marginBottom: 18 }}>
        <button className={!programmeId ? 'on' : ''} onClick={() => setProgramme(0)}>All programmes</button>
        {programmes.filter((p) => p.is_active).map((p) => (
          <button key={p.id} className={programmeId === p.id ? 'on' : ''} onClick={() => setProgramme(p.id)}>
            <i style={{ background: p.color }} />{p.name}
          </button>
        ))}
      </div>

      <section className="banner">
        <div>
          <h2>{kpis.followUp ? `${kpis.followUp} ${kpis.followUp === 1 ? 'person needs' : 'people need'} a call` : 'Everyone is showing up 🎉'}</h2>
          <p>
            {kpis.followUp
              ? `They’ve missed ${data.threshold} or more ${current ? current.name : ''} sessions in a row. A quick call or WhatsApp goes a long way.`
              : 'No one has missed enough sessions in a row to be flagged. Keep it up!'}
          </p>
        </div>
        <div className="banner-stats">
          <div className="banner-stat"><b>{kpis.hereToday}</b><span><i className="ci-live" /> Here today</span></div>
          <div className="banner-stat"><b>{kpis.checkinsThisMonth}</b><span>Check-ins this month</span></div>
          <div className="banner-stat"><b>{kpis.newMembers}</b><span>New in 30 days</span></div>
        </div>
      </section>

      <div className="grid kpis">
        <Kpi label={team ? 'Facilitators & leaders' : 'Young people'} value={kpis.members} sub="Have checked in at least once" icon={<Icon.members />} />
        <Kpi label="Consistent" value={kpis.active} sub={pct(kpis.active, kpis.members)} icon={<Icon.check />} tone="ok" meter={kpis.members ? kpis.active / kpis.members : 0} />
        <Kpi label="Slipping" value={kpis.atRisk} sub={`Missed ${data.threshold - 1} in a row`} icon={<Icon.trend />} tone="warn" />
        <Kpi label="Needs follow-up" value={kpis.followUp} sub={`Missed ${data.threshold}+ in a row`} icon={<Icon.alert />} tone="danger" />
        <Kpi label="Avg. per session" value={kpis.avgAttendance} sub="Across the last 8 sessions" icon={<Icon.pulse />} />
      </div>

      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        <section className="panel">
          <div className="panel-head">
            <div><h2>Attendance over time</h2><p>Check-ins per day, by programme</p></div>
          </div>
          {trend.length === 0 ? (
            <Empty icon={<Icon.trend size={24} />}>Your chart appears after the first check-ins. <Link href="/admin/qr">Get the QR codes</Link>.</Empty>
          ) : (
            <div className="chart-box">
              <Bar
                data={{
                  labels: trend.map((d) => fmtDate(d.date, { day: 'numeric', month: 'short' })),
                  datasets: shown.map((p) => ({
                    label: p.name,
                    data: trend.map((d) => d.byProgramme[p.id] ?? 0),
                    backgroundColor: p.color,
                    borderRadius: 6,
                    borderSkipped: false,
                    maxBarThickness: 38,
                  })),
                }}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 3, padding: 16 } },
                    tooltip: { backgroundColor: '#15122b', padding: 12, cornerRadius: 10, boxPadding: 4 },
                  },
                  scales: {
                    x: { stacked: true, grid: { display: false }, border: { display: false } },
                    y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(143,138,171,.15)' }, border: { display: false } },
                  },
                }}
              />
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div><h2>Programme health</h2><p>Everyone who attends each programme</p></div>
          </div>
          <div className="health">
            {byProgramme.filter((p) => !current || p.id === current.id).map((p) => {
              const prog = programmes.find((x) => x.id === p.id)!;
              const total = p.members || 1;
              return (
                <div className="health-row" key={p.id}>
                  <div className="health-icon" style={{ background: p.color }}><ProgrammeIcon icon={prog.icon} size={17} /></div>
                  <div>
                    <div className="health-name">
                      <span>{p.name}</span>
                      <span className="muted small">{p.today ? `${p.today} today` : ''}</span>
                    </div>
                    <div className="health-bar">
                      {p.members === 0 ? null : (
                        <>
                          <i style={{ width: `${(p.active / total) * 100}%`, background: 'var(--ok)' }} />
                          <i style={{ width: `${(p.atRisk / total) * 100}%`, background: 'var(--warn)' }} />
                          <i style={{ width: `${(p.followUp / total) * 100}%`, background: 'var(--danger)' }} />
                        </>
                      )}
                    </div>
                  </div>
                  <div className="health-num">{p.members}<span>people</span></div>
                </div>
              );
            })}
          </div>
          <div className="legend">
            <span><i style={{ background: 'var(--ok)' }} />Consistent</span>
            <span><i style={{ background: 'var(--warn)' }} />Slipping</span>
            <span><i style={{ background: 'var(--danger)' }} />Needs follow-up</span>
          </div>
        </section>
      </div>

      <div className="grid cols-2b">
        <section className="panel">
          <div className="panel-head">
            <div><h2>Who to reach out to</h2><p>Sorted by how many sessions in a row they’ve missed</p></div>
            <Link className="btn sm" href="/admin/members?status=follow-up">View all</Link>
          </div>
          {followUp.length === 0 ? (
            <Empty icon={<Icon.check size={24} />}>No one to follow up with right now.</Empty>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Person</th><th>Missed in a row</th><th>Last seen</th><th>Contact</th></tr></thead>
                <tbody>
                  {followUp.slice(0, 10).map((m) => (
                    <tr key={m.id} className="clickable" onClick={() => router.push(`/admin/members?id=${m.id}`)}>
                      <td>
                        <div className="person">
                          <Avatar name={m.full_name} />
                          <div>
                            <div className="person-name">{m.full_name}</div>
                            <span style={{ display: 'inline-flex', gap: 4 }}><StatusBadge status={m.status} /><RoleBadge role={m.role} /></span>
                          </div>
                        </div>
                      </td>
                      <td><Streak missed={m.missedInARow} /></td>
                      <td className="small">
                        {m.lastProgramme && <ProgrammeTag name={m.lastProgramme} color={colorOf.get(m.primaryProgrammeId ?? 0) ?? '#7c5cff'} />}
                        <div className="muted" style={{ marginTop: 4 }}>{daysAgo(m.lastSeen)}</div>
                      </td>
                      <td><ContactLinks phone={m.phone} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div><h2>Live check-ins</h2><p>Updates every 30 seconds</p></div>
            <span className="badge live"><i className="dot" />Live</span>
          </div>
          {recentCheckins.length === 0 ? (
            <Empty icon={<Icon.qr size={24} />}>No check-ins yet. Put the QR code up and they’ll appear here.</Empty>
          ) : (
            <ul className="feed">
              {recentCheckins.map((c, i) => (
                <li key={i}>
                  <Avatar name={c.full_name} />
                  <div style={{ minWidth: 0 }}>
                    <div className="person-name">{c.full_name}</div>
                    <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}><ProgrammeTag name={c.programme} color={c.color} /><RoleBadge role={c.role} /></span>
                  </div>
                  <div className="when">{timeAgo(c.created_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}% of everyone` : 'No one yet');

function Kpi({ label, value, sub, icon, tone, meter }: {
  label: string; value: number; sub?: string; icon: React.ReactNode; tone?: 'ok' | 'warn' | 'danger'; meter?: number;
}) {
  return (
    <div className={`kpi ${tone ?? ''}`}>
      <div className="kpi-top"><span className="label">{label}</span><span className="kpi-icon">{icon}</span></div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
      {meter !== undefined && <div className="meter" style={{ color: 'var(--ok)' }}><i style={{ width: `${meter * 100}%` }} /></div>}
    </div>
  );
}

function Empty({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="empty"><div className="empty-icon">{icon}</div>{children}</div>;
}

