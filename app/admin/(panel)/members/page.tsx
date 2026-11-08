'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ROLE_LABEL, ROLES, STATUS_LABEL, type Programme, type Role, type Status } from '@/lib/config';
import type { MemberStats } from '@/lib/analytics';
import { Icon } from '@/components/Logo';
import { api, Avatar, ContactLinks, RoleBadge, css, daysAgo, fmtDate, ProgrammeTag, RateBar, StatusBadge, Streak, useToast } from '@/components/ui';

type SortKey = 'missed' | 'rate' | 'lastSeen' | 'name' | 'attended';

export default function Members() {
  const [members, setMembers] = useState<MemberStats[] | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [query, setQuery] = useState('');
  const [programme, setProgramme] = useState(0);
  const [status, setStatus] = useState('');
  const [role, setRole] = useState<'' | Role>('');
  const [sort, setSort] = useState<SortKey>('missed');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [toast, showToast] = useToast();

  const load = useCallback(
    () => api<{ members: MemberStats[]; programmes: Programme[] }>('/api/admin/members').then((d) => {
      setMembers(d.members);
      setProgrammes(d.programmes);
    }),
    [],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('status')) setStatus(params.get('status')!);
    const r = params.get('role');
    if (r && ROLES.includes(r as Role)) setRole(r as Role);
    if (params.get('id')) setSelectedId(Number(params.get('id')));
    load();
  }, [load]);

  const byId = useMemo(() => new Map(programmes.map((p) => [p.id, p])), [programmes]);

  const rows = useMemo(() => {
    if (!members) return [];
    const q = query.trim().toLowerCase();
    const filtered = members.filter(
      (m) =>
        (!programme || m.programmeIds.includes(programme)) &&
        (!status || m.status === status) &&
        (!role || m.role === role) &&
        (!q || m.full_name.toLowerCase().includes(q) || (m.phone ?? '').includes(q)),
    );
    const by: Record<SortKey, (a: MemberStats, b: MemberStats) => number> = {
      missed: (a, b) => b.missedInARow - a.missedInARow || a.full_name.localeCompare(b.full_name),
      rate: (a, b) => (a.rate ?? 1) - (b.rate ?? 1),
      lastSeen: (a, b) => (a.lastSeen ?? '').localeCompare(b.lastSeen ?? ''),
      attended: (a, b) => b.attended - a.attended,
      name: (a, b) => a.full_name.localeCompare(b.full_name),
    };
    return filtered.sort(by[sort]);
  }, [members, query, programme, status, role, sort]);

  const counts = useMemo(() => {
    const pool = (members ?? []).filter((m) => !role || m.role === role);
    const c: Record<string, number> = { '': pool.length };
    for (const m of pool) c[m.status] = (c[m.status] ?? 0) + 1;
    return c;
  }, [members, role]);

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">People</div>
          <h1>People</h1>
          <p>Everyone who has checked in (young people, facilitators and leaders) and how consistent they’ve been.</p>
        </div>
        <a className="btn" href="/api/admin/members/export"><Icon.download />Export CSV</a>
      </div>

      <div className="toolbar" style={{ marginBottom: 14 }}>
      <div className="seg">
        <button className={role === '' ? 'on' : ''} onClick={() => setRole('')}>Everyone</button>
        {ROLES.map((r) => (
          <button key={r} className={role === r ? 'on' : ''} onClick={() => setRole(r)}>
            {r === 'member' ? 'Young people' : `${ROLE_LABEL[r]}s`} <span style={{ opacity: .6 }}>{members?.filter((m) => m.role === r).length ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="seg">
        {(['', 'follow-up', 'at-risk', 'active'] as const).map((s) => (
          <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>
            {s === '' ? 'Any status' : STATUS_LABEL[s as Status]} <span style={{ opacity: .6 }}>{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>
      </div>

      <section className="panel">
        <div className="toolbar" style={{ marginBottom: 14 }}>
          <div className="search">
            <Icon.search />
            <input className="input" placeholder="Search by name or phone…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="select" value={programme} onChange={(e) => setProgramme(Number(e.target.value))}>
            <option value={0}>All programmes</option>
            {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="missed">Most missed in a row</option>
            <option value="rate">Lowest attendance</option>
            <option value="lastSeen">Longest since seen</option>
            <option value="attended">Most check-ins</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        {members === null ? (
          <p className="muted">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><Icon.members size={24} /></div>
            {members.length ? 'No one matches those filters.' : 'No one has checked in yet. Once they scan the QR, they’ll appear here.'}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Person</th><th>Programmes</th><th>Attendance</th><th>Missed in a row</th><th>Last seen</th><th>Status</th><th>Contact</th></tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="clickable" onClick={() => setSelectedId(m.id)}>
                    <td>
                      <div className="person">
                        <Avatar name={m.full_name} />
                        <div>
                          <div className="person-name">{m.full_name}</div>
                          <div className="person-sub" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <RoleBadge role={m.role} />{m.attended} check-in{m.attended === 1 ? '' : 's'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 220 }}>
                        {m.programmeIds.map((id) => byId.get(id) && <ProgrammeTag key={id} name={byId.get(id)!.name} color={byId.get(id)!.color} />)}
                      </div>
                    </td>
                    <td><RateBar rate={m.rate} /><div className="small muted">{m.attended} of {m.eligible} sessions</div></td>
                    <td><Streak missed={m.missedInARow} /></td>
                    <td className="small">{fmtDate(m.lastSeen, { day: 'numeric', month: 'short' })}<div className="muted">{daysAgo(m.lastSeen)}</div></td>
                    <td><StatusBadge status={m.status} /></td>
                    <td><ContactLinks phone={m.phone} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {members && members.length > 0 && <p className="small muted" style={{ margin: '12px 0 0' }}>Showing {rows.length} of {members.length}</p>}
      </section>

      {selectedId !== null && members && (
        <MemberDrawer
          id={selectedId}
          everyone={members}
          byId={byId}
          onClose={() => setSelectedId(null)}
          onChanged={(message) => { showToast(message); load(); }}
        />
      )}
      {toast}
    </main>
  );
}

type History = { id: number; date: string; programme: string; color: string; attended: boolean };
type RoomRef = { id: number; name: string; facilitator: string | null };

function MemberDrawer({ id, everyone, byId, onClose, onChanged }: {
  id: number;
  everyone: MemberStats[];
  byId: Map<number, Programme>;
  onClose: () => void;
  onChanged: (message: string) => void;
}) {
  const [data, setData] = useState<{ member: MemberStats; history: History[]; rooms: RoomRef[] } | null>(null);
  const [form, setForm] = useState({ fullName: '', phone: '', notes: '', role: 'member' as Role });
  const [mergeId, setMergeId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await api<{ member: MemberStats; history: History[]; rooms: RoomRef[] }>(`/api/admin/members/${id}`);
      setData(d);
      setForm({ fullName: d.member.full_name, phone: d.member.phone ?? '', notes: d.member.notes ?? '', role: d.member.role });
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    load();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [load, onClose]);

  const m = data?.member;
  const others = useMemo(() => {
    if (!m) return [];
    const parts = m.full_name.toLowerCase().split(' ');
    const score = (o: MemberStats) => o.full_name.toLowerCase().split(' ').filter((p) => parts.includes(p)).length;
    return everyone.filter((o) => o.id !== m.id).sort((a, b) => score(b) - score(a) || a.full_name.localeCompare(b.full_name));
  }, [everyone, m]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api(`/api/admin/members/${id}`, { method: 'PATCH', json: form });
      onChanged('Saved');
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function merge() {
    const other = everyone.find((o) => o.id === Number(mergeId));
    if (!other || !m) return;
    if (!confirm(`Merge “${other.full_name}” into “${m.full_name}”? Their check-ins move here and the duplicate is removed.`)) return;
    await api(`/api/admin/members/${id}/merge`, { method: 'POST', json: { fromId: other.id } });
    setMergeId('');
    onChanged('Records merged');
    load();
  }

  async function remove() {
    if (!m || !confirm(`Delete ${m.full_name} and all their check-ins? This can’t be undone.`)) return;
    await api(`/api/admin/members/${id}`, { method: 'DELETE' });
    onChanged('Member deleted');
    onClose();
  }

  const accent = byId.get(m?.primaryProgrammeId ?? 0)?.color ?? '#7c5cff';

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Member details" style={css({ '--c': accent })}>
        {!m ? (
          <div className="drawer-body">{error ? <div className="error">{error}</div> : <p className="muted">Loading…</p>}</div>
        ) : (
          <>
            <div className="drawer-hero">
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <Avatar name={m.full_name} large />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: 24 }}>{m.full_name}</h2>
                  <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                    <StatusBadge status={m.status} />
                    <RoleBadge role={m.role} />
                    {m.programmeIds.map((pid) => byId.get(pid) && <ProgrammeTag key={pid} name={byId.get(pid)!.name} color={byId.get(pid)!.color} />)}
                  </div>
                </div>
                <button className="btn icon ghost" onClick={onClose} aria-label="Close">✕</button>
              </div>
              <div className="stat-row">
                <div><b>{m.rate === null ? '—' : `${Math.round(m.rate * 100)}%`}</b><span>Attendance</span></div>
                <div><b>{m.missedInARow}</b><span>Missed in a row</span></div>
                <div><b>{m.attended}</b><span>Check-ins</span></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, gap: 10 }}>
                <span className="small muted">
                  Last seen {fmtDate(m.lastSeen)}{m.lastProgramme ? ` at ${m.lastProgramme}` : ''}
                </span>
                <ContactLinks phone={m.phone} />
              </div>
            </div>

            <div className="drawer-body">
              {data!.rooms.length > 0 && (
                <>
                  <div className="section-title" style={{ marginTop: 0 }}>Room</div>
                  {data!.rooms.map((r) => (
                    <p key={r.id} style={{ margin: '0 0 6px' }}>
                      <a href="/admin/rooms"><b>{r.name}</b></a>
                      {r.facilitator && <span className="muted"> · Facilitator: {r.facilitator}</span>}
                    </p>
                  ))}
                </>
              )}
              <div className="section-title" style={data!.rooms.length ? undefined : { marginTop: 0 }}>Attendance history (oldest → newest)</div>
              {data!.history.length === 0 ? (
                <p className="muted small">No sessions yet.</p>
              ) : (
                <div className="history">
                  {[...data!.history].reverse().map((h) => (
                    <span
                      key={h.id}
                      className={h.attended ? 'y' : ''}
                      style={css({ '--c': h.color })}
                      title={`${h.programme} · ${fmtDate(h.date)} · ${h.attended ? 'Present' : 'Absent'}`}
                    />
                  ))}
                </div>
              )}
              <p className="small muted">Coloured = present, pink = missed. Hover a square for details.</p>

              <div className="section-title">Details &amp; pastoral notes</div>
              <form onSubmit={save}>
                <div className="field">
                  <label className="lbl">Full name</label>
                  <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                </div>
                <div className="field">
                  <label className="lbl">Role</label>
                  <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="lbl">Phone</label>
                  <input className="input" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="field">
                  <label className="lbl">Notes <span className="muted">(only leaders can see these)</span></label>
                  <textarea className="textarea" rows={4} placeholder="e.g. Called 2 Nov: exams this month, will be back after." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                {error && <div className="error">{error}</div>}
                <button className="btn primary">Save changes</button>
              </form>

              <div className="section-title">Duplicate record?</div>
              <p className="small muted" style={{ marginTop: 0 }}>If they checked in under a different spelling, merge that record into this one.</p>
              <div className="toolbar">
                <select className="select" value={mergeId} onChange={(e) => setMergeId(e.target.value)} style={{ flex: 1, width: 'auto' }}>
                  <option value="">Choose the duplicate…</option>
                  {others.map((o) => <option key={o.id} value={o.id}>{o.full_name} ({o.attended} check-ins)</option>)}
                </select>
                <button className="btn" disabled={!mergeId} onClick={merge}>Merge</button>
              </div>

              <div className="section-title">Danger zone</div>
              <button className="btn danger" onClick={remove}>Delete member</button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
