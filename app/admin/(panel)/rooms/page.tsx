'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon, ProgrammeIcon } from '@/components/Logo';
import { api, Avatar, css, fmtDate, RoleBadge, useToast } from '@/components/ui';
import type { Role } from '@/lib/config';

type Room = {
  id: number; name: string; room: string | null; facilitator_id: number | null; facilitator: string | null;
  facilitator_phone: string | null; roster: number; here_today: number; taken_at: string | null; rate: number | null;
};
type Data = {
  today: string;
  programme: { id: number; name: string; color: string; icon: string };
  classes: Room[];
  facilitatorCode: string | null;
  unassigned: { id: number; full_name: string }[];
  team: { id: number; full_name: string; role: Role }[];
};
type Draft = { id?: number; name: string; room: string; facilitator_id: string };
type Register = {
  class: { id: number; name: string };
  today: string;
  sessions: { id: number; date: string; taken_at: string | null }[];
  roster: { id: number; full_name: string; role: Role; marks: Record<number, 'self' | 'class'>; since: string; missedInARow: number; present: number; expected: number }[];
};

const time = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export default function Rooms() {
  const [data, setData] = useState<Data | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState<Room | null>(null);
  const [registerOf, setRegisterOf] = useState<Room | null>(null);
  const [error, setError] = useState('');
  const [toast, showToast] = useToast();

  const load = useCallback(async () => {
    setData(await api<Data>('/api/admin/classes'));
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  async function save() {
    if (!draft) return;
    setError('');
    try {
      const json = { name: draft.name, room: draft.room, facilitator_id: Number(draft.facilitator_id) || null };
      if (draft.id) await api(`/api/admin/classes/${draft.id}`, { method: 'PATCH', json });
      else await api('/api/admin/classes', { method: 'POST', json });
      showToast(draft.id ? 'Room updated' : 'Room added');
      setDraft(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(id: number, name: string) {
    if (!confirm(`Delete the room “${name}”? Attendance already taken stays in everyone’s history.`)) return;
    await api(`/api/admin/classes/${id}`, { method: 'DELETE' });
    setDraft(null);
    showToast('Room deleted');
    load();
  }

  async function assign(memberId: number, roomId: number) {
    await api(`/api/admin/classes/${roomId}/members`, { method: 'POST', json: { memberIds: [memberId] } });
    showToast('Added to room');
    load();
  }

  const p = data?.programme;
  const rooms = data?.classes ?? [];
  const taken = rooms.filter((r) => r.taken_at).length;
  const inRooms = rooms.reduce((a, r) => a + r.roster, 0);

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">{p?.name ?? 'Faith Forward'}</div>
          <h1>Rooms</h1>
          <p>Each room has a facilitator who calls the names and ticks who’s present. It counts as attendance.</p>
        </div>
        <div className="toolbar">
          <a className="btn" href="/rooms" target="_blank"><Icon.check size={16} />Open roll call</a>
          <button className="btn primary" onClick={() => { setError(''); setDraft({ name: '', room: '', facilitator_id: '' }); }}>+ New room</button>
        </div>
      </div>

      {error && !draft && <div className="error">{error}</div>}

      {!data ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <div className="banner" style={{ marginBottom: 18 }}>
            <div>
              <h2>Facilitators: {location.host}/rooms</h2>
              <p>
                Facilitators open this page on their phone, enter the code once, pick their room and tick names.
                {data.facilitatorCode ? ' Share the code privately with your facilitators.' : ' The facilitator code isn’t set up yet.'}
              </p>
            </div>
            <div className="banner-stats">
              {data.facilitatorCode && (
                <button className="banner-stat" style={{ cursor: 'pointer', textAlign: 'left', color: 'inherit', font: 'inherit' }}
                  onClick={() => { navigator.clipboard.writeText(data.facilitatorCode!); showToast('Code copied'); }}>
                  <b style={{ letterSpacing: '.12em' }}>{data.facilitatorCode}</b><span>Facilitator code · tap to copy</span>
                </button>
              )}
              <div className="banner-stat"><b>{taken}/{rooms.length}</b><span><i className="ci-live" />Rolls taken today</span></div>
            </div>
          </div>

          <div className="grid kpis">
            <Kpi label="Rooms" value={rooms.length} />
            <Kpi label="Names in rooms" value={inRooms} />
            <Kpi label="Present today (in rooms)" value={rooms.reduce((a, r) => a + r.here_today, 0)} tone="ok" />
            <Kpi label="Not in a room yet" value={data.unassigned.length} tone={data.unassigned.length ? 'warn' : undefined} />
          </div>

          {rooms.length === 0 ? (
            <div className="panel empty">
              <div className="empty-icon"><Icon.members /></div>
              <b>No rooms yet</b>
              <p>Add your first room (e.g. “Room A – Teens”), choose its facilitator, then load the names.</p>
              <button className="btn primary" onClick={() => setDraft({ name: '', room: '', facilitator_id: '' })}>+ New room</button>
            </div>
          ) : (
            <div className="prog-cards">
              {rooms.map((r) => (
                <article key={r.id} className="prog-card" style={css({ '--c': p!.color })}>
                  <div className="prog-card-head">
                    <div className="prog-card-icon"><ProgrammeIcon icon={p!.icon} size={22} /></div>
                    <div style={{ minWidth: 0 }}>
                      <div className="prog-card-title">{r.name}</div>
                      <div className="prog-card-sub">{[r.room, r.facilitator ? `Facilitator: ${r.facilitator}` : 'No facilitator yet'].filter(Boolean).join(' · ')}</div>
                    </div>
                  </div>
                  <div className="prog-card-stats">
                    <div><b>{r.roster}</b><span>Names</span></div>
                    <div><b>{r.here_today}</b><span>Here today</span></div>
                    <div><b>{r.rate === null ? '—' : `${r.rate}%`}</b><span>Attendance</span></div>
                  </div>
                  <div className="prog-card-body">
                    <div className="today-row">
                      <span>
                        <b>Today’s roll</b>
                        <br />
                        <span className="muted small">{r.taken_at ? `Taken at ${time(r.taken_at)}` : 'Not taken yet'}</span>
                      </span>
                      <span className={`badge ${r.taken_at ? 'active' : 'at-risk'}`}><i className="dot" />{r.taken_at ? 'Done' : 'Waiting'}</span>
                    </div>
                    <div className="toolbar">
                      <a className="btn sm primary" href={`/rooms/${r.id}`} target="_blank">Take roll</a>
                      <button className="btn sm" onClick={() => setRegisterOf(r)}>Register</button>
                      <button className="btn sm" onClick={() => setLoading(r)}>Add names</button>
                      <button className="btn sm ghost" onClick={() => { setError(''); setDraft({ id: r.id, name: r.name, room: r.room ?? '', facilitator_id: String(r.facilitator_id ?? '') }); }}>Edit</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {rooms.length > 0 && data.unassigned.length > 0 && (
            <div className="panel" style={{ marginTop: 18 }}>
              <div className="panel-head">
                <div>
                  <h2>Not in a room yet</h2>
                  <p>Young people who came to {p!.name} but aren’t on any room’s list.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <tbody>
                    {data.unassigned.map((m) => (
                      <tr key={m.id}>
                        <td><a className="person" href={`/admin/members?id=${m.id}`} style={{ color: 'inherit' }}><Avatar name={m.full_name} /><span className="person-name">{m.full_name}</span></a></td>
                        <td style={{ textAlign: 'right' }}>
                          <select className="select" style={{ width: 'auto' }} value="" onChange={(e) => assign(m.id, Number(e.target.value))}>
                            <option value="">Put in a room…</option>
                            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {draft && data && (
        <>
          <div className="scrim" onClick={() => setDraft(null)} />
          <div className="modal" role="dialog" aria-label="Room">
            <h2>{draft.id ? `Edit ${draft.name}` : 'New room'}</h2>
            <div className="field">
              <label className="lbl">Name</label>
              <input className="input" autoFocus value={draft.name} placeholder="e.g. Room A – Teens" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="field">
              <label className="lbl">Where it meets <span className="muted">(optional)</span></label>
              <input className="input" value={draft.room} placeholder="e.g. Upstairs hall" onChange={(e) => setDraft({ ...draft, room: e.target.value })} />
            </div>
            <div className="field">
              <label className="lbl">Facilitator</label>
              <select className="select" value={draft.facilitator_id} onChange={(e) => setDraft({ ...draft, facilitator_id: e.target.value })}>
                <option value="">Not chosen yet</option>
                {data.team.map((t) => <option key={t.id} value={t.id}>{t.full_name} ({t.role})</option>)}
              </select>
              <p className="small muted" style={{ margin: '6px 0 0' }}>
                Only facilitators and leaders are listed. Someone missing? Set their role on the People page. The facilitator is marked present whenever they save the roll.
              </p>
            </div>
            {error && <div className="error">{error}</div>}
            <div className="modal-actions">
              {draft.id && <button className="btn danger" style={{ marginRight: 'auto' }} onClick={() => remove(draft.id!, draft.name)}>Delete</button>}
              <button className="btn" onClick={() => setDraft(null)}>Cancel</button>
              <button className="btn primary" onClick={save}>{draft.id ? 'Save' : 'Add room'}</button>
            </div>
          </div>
        </>
      )}

      {loading && data && (
        <AddNames room={loading} people={data.unassigned} onClose={() => setLoading(null)} onDone={(m) => { setLoading(null); showToast(m); load(); }} />
      )}
      {registerOf && <RegisterDrawer room={registerOf} color={p?.color ?? '#7c5cff'} onClose={() => setRegisterOf(null)} onChanged={(m) => { showToast(m); load(); }} />}
      {toast}
    </main>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'warn' }) {
  return (
    <div className={`kpi ${tone ?? ''}`}>
      <div className="kpi-top"><span className="label">{label}</span></div>
      <div className="value">{value}</div>
    </div>
  );
}

function AddNames({ room, people, onClose, onDone }: { room: Room; people: Data['unassigned']; onClose: () => void; onDone: (message: string) => void }) {
  const [names, setNames] = useState('');
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const r = await api<{ added: number; skipped: string[] }>(`/api/admin/classes/${room.id}/members`, {
        method: 'POST', json: { names, memberIds: [...picked] },
      });
      onDone(`${r.added} added to ${room.name}${r.skipped.length ? ` · skipped ${r.skipped.join(', ')} (need first and last name)` : ''}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-label="Add names">
        <h2>Add names to {room.name}</h2>
        <div className="field">
          <label className="lbl">Paste the room list <span className="muted">(one full name per line)</span></label>
          <textarea className="textarea" rows={8} autoFocus placeholder={'Ada Okafor\nTunde Bello\nGrace Eze'} value={names} onChange={(e) => setNames(e.target.value)} />
          <p className="small muted" style={{ margin: '6px 0 0' }}>Names we already have are matched to their records; new names are added. Anyone in another room moves here.</p>
        </div>
        {people.length > 0 && (
          <div className="field">
            <label className="lbl">Or pick from people not in a room yet</label>
            <div className="pick-list">
              {people.map((m) => (
                <label key={m.id}>
                  <input type="checkbox" checked={picked.has(m.id)} onChange={() => {
                    const next = new Set(picked);
                    if (next.has(m.id)) next.delete(m.id); else next.add(m.id);
                    setPicked(next);
                  }} />
                  {m.full_name}
                </label>
              ))}
            </div>
          </div>
        )}
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy || (!names.trim() && !picked.size)} onClick={submit}>
            {busy ? 'Adding…' : 'Add to room'}
          </button>
        </div>
      </div>
    </>
  );
}

function RegisterDrawer({ room, color, onClose, onChanged }: { room: Room; color: string; onClose: () => void; onChanged: (m: string) => void }) {
  const [reg, setReg] = useState<Register | null>(null);

  const load = useCallback(async () => {
    setReg(await api<Register>(`/api/admin/classes/${room.id}`));
  }, [room.id]);

  useEffect(() => {
    load();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [load, onClose]);

  async function takeOut(id: number, name: string) {
    if (!confirm(`Take ${name} out of ${room.name}? Their attendance history stays.`)) return;
    await api(`/api/admin/classes/${room.id}/members?member=${id}`, { method: 'DELETE' });
    onChanged(`${name} taken out of ${room.name}`);
    load();
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer wide" role="dialog" aria-label={`${room.name} register`} style={css({ '--c': color })}>
        <div className="drawer-hero">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Register</div>
              <h2 style={{ fontSize: 24 }}>{room.name}</h2>
              <div className="small muted" style={{ marginTop: 4 }}>{room.facilitator ? `Facilitator: ${room.facilitator}` : 'No facilitator yet'}</div>
            </div>
            <button className="btn icon ghost" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>
        <div className="drawer-body">
          {!reg ? (
            <p className="muted">Loading…</p>
          ) : reg.roster.length === 0 ? (
            <p className="muted">No names in this room yet. Use “Add names” to load the list.</p>
          ) : (
            <>
              <div className="table-wrap">
                <table className="register">
                  <thead>
                    <tr>
                      <th>Name</th>
                      {reg.sessions.map((s) => (
                        <th key={s.id} title={s.taken_at ? 'Roll taken' : 'Roll not taken'} className={s.taken_at ? '' : 'untaken'}>
                          {fmtDate(s.date, { day: 'numeric', month: 'short' })}
                        </th>
                      ))}
                      <th className="num">Rate</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {reg.roster.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <a className="person" href={`/admin/members?id=${m.id}`} style={{ color: 'inherit', minWidth: 160 }}>
                            <span>
                              <span className="person-name">{m.full_name}</span> <RoleBadge role={m.role} />
                              {m.missedInARow >= 2 && <span className="person-sub" style={{ color: 'var(--danger)', display: 'block' }}>Missed {m.missedInARow} in a row</span>}
                            </span>
                          </a>
                        </td>
                        {reg.sessions.map((s) => {
                          const mark = m.marks[s.id];
                          const before = s.date < m.since;
                          const pending = !mark && s.date === reg.today && !s.taken_at;
                          return (
                            <td key={s.id} className="reg-cell">
                              {mark ? <span className="reg y" title={mark === 'self' ? 'Scanned in' : 'Marked by facilitator'}>✓</span>
                                : before || pending ? <span className="reg na">·</span>
                                : <span className="reg n" title="Missed">✕</span>}
                            </td>
                          );
                        })}
                        <td className="num small">{m.expected ? `${Math.round((m.present / m.expected) * 100)}%` : '—'}</td>
                        <td><button className="btn sm ghost" onClick={() => takeOut(m.id, m.full_name)} title="Take out of room">✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="small muted">✓ present · ✕ missed · dot = before they joined, or today’s roll isn’t taken yet. Faded dates had no roll taken for this room.</p>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
