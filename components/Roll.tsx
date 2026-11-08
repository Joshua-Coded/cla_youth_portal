'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, fmtDate } from './ui';
import { ProgrammeIcon } from './Logo';
import { CodeGate, RollShell } from './Rooms';

type Mark = 'self' | 'class';
type Person = { id: number; full_name: string; role: string; marks: Record<number, Mark>; since: string; missedInARow: number; today: Mark | null };
type Data = {
  class: { name: string; room: string | null; facilitator: string | null };
  programme: { name: string; color: string; icon: string };
  today: string;
  takenAt: string | null;
  sessions: { id: number; date: string }[];
  roster: Person[];
};
type Found = { id: number; full_name: string; class_name: string | null; here: boolean | null };

const css = (vars: Record<string, string | number>) => vars as React.CSSProperties;
const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
const time = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export default function Roll({ id }: { id: number }) {
  const [data, setData] = useState<Data | null>(null);
  const [present, setPresent] = useState<Set<number>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState(false);
  const [needCode, setNeedCode] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async (keep?: Set<number>) => {
    try {
      const d = await api<Data>(`/api/rooms/${id}`);
      setData(d);
      const next = new Set(d.roster.filter((p) => p.today).map((p) => p.id));
      // Keep ticks the facilitator hasn't saved yet
      keep?.forEach((id) => next.add(id));
      setPresent(next);
      setLoadError('');
    } catch (e) {
      if ((e as { status?: number }).status === 401) setNeedCode(true);
      else setLoadError((e as Error).message);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(''), 2400);
  }

  function toggle(p: Person) {
    if (p.today === 'self' || editing) return;
    const next = new Set(present);
    if (next.has(p.id)) next.delete(p.id);
    else next.add(p.id);
    setPresent(next);
    setDirty(true);
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      await api(`/api/rooms/${id}`, { method: 'POST', json: { present: [...present] } });
      setDirty(false);
      flash('Roll saved, thank you!');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function added(id: number, name: string) {
    const keep = new Set(present).add(id);
    setDirty(true);
    flash(`${name.split(' ')[0]} added and marked present`);
    await load(keep);
  }

  async function remove(p: Person) {
    if (!confirm(`Take ${p.full_name} out of this room? Their past attendance is kept.`)) return;
    await api(`/api/rooms/${id}/people?member=${p.id}`, { method: 'DELETE' });
    flash(`${p.full_name.split(' ')[0]} removed from the room`);
    const keep = new Set(present);
    keep.delete(p.id);
    await load(dirty ? keep : undefined);
  }

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (data?.roster ?? []).filter((p) => !q || p.full_name.toLowerCase().includes(q));
  }, [data, filter]);

  const accent = data?.programme.color ?? '#7c5cff';
  const total = data?.roster.length ?? 0;
  const here = data ? data.roster.filter((p) => present.has(p.id)).length : 0;
  const past = data?.sessions.filter((s) => s.date < data.today).slice(-4) ?? [];

  if (needCode) return <CodeGate onDone={() => { setNeedCode(false); load(); }} />;

  return (
    <RollShell accent={accent} day={data?.today}>
        {loadError ? (
          <div className="ci-state">
            <h1>This link isn’t working</h1>
            <p>{loadError}</p>
          </div>
        ) : !data ? (
          <div>
            <div className="ci-skel" style={{ height: 120, borderRadius: 24 }} />
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="ci-skel" style={{ height: 64, borderRadius: 18 }} />)}
          </div>
        ) : (
          <>
            <a className="roll-back" href="/rooms">← All rooms</a>
            <section className="roll-head">
              <div className="ci-prog-icon"><ProgrammeIcon icon={data.programme.icon} size={24} /></div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="ci-brand-sub">{data.programme.name}{data.class.room ? ` · ${data.class.room}` : ''}</div>
                <h1>{data.class.name}</h1>
                {data.class.facilitator && <div className="roll-fac">Facilitator: {data.class.facilitator}</div>}
              </div>
              <div className="roll-count">
                <b>{here}<span>/{total}</span></b>
                <small>present</small>
              </div>
            </section>
            <div className="roll-meter"><i style={{ width: `${total ? (here / total) * 100 : 0}%` }} /></div>

            <p className="roll-status">
              {dirty
                ? <>You have changes that aren’t saved yet.</>
                : data.takenAt
                  ? <><span className="ci-live" /> Roll saved at {time(data.takenAt)}. You can update it any time today.</>
                  : <>Call each name and tap the people who are here, then save.</>}
            </p>

            {total > 8 && (
              <div className="ci-input roll-search">
                <SearchGlyph />
                <input placeholder="Find a name" value={filter} onChange={(e) => setFilter(e.target.value)} />
              </div>
            )}

            {total === 0 ? (
              <div className="roll-empty">
                <b>No names in this room yet.</b>
                <span>Add the names below, or ask an admin to load the room list.</span>
              </div>
            ) : (
              <>
              <div className="roll-tools">
                <span className="ci-brand-sub">{editing ? 'Tap × to take someone out of this room' : 'Tap a name to mark them present'}</span>
                <button type="button" className="ci-link" onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Edit names'}</button>
              </div>
              <ul className={`roll-list ${editing ? 'editing' : ''}`}>
                {shown.map((p, i) => {
                  const on = present.has(p.id);
                  return (
                    <li key={p.id} className={`${on ? 'on' : ''} ${p.today === 'self' ? 'locked' : ''}`} style={css({ '--i': Math.min(i, 12) })}>
                      <button type="button" className="roll-row" onClick={() => toggle(p)} aria-pressed={on}>
                        <span className="ci-avatar">{initials(p.full_name)}</span>
                        <span className="roll-name">
                          <b>{p.full_name}</b>
                          <span className="roll-meta">
                            <span className="roll-dots" aria-label="Last few weeks">
                              {past.map((s) => (
                                <i key={s.id} className={p.marks[s.id] ? 'y' : s.date < p.since ? 'na' : 'n'} title={fmtDate(s.date)} />
                              ))}
                            </span>
                            {p.today === 'self' ? 'Scanned in themselves'
                              : p.missedInARow >= 2 ? <em>Missed {p.missedInARow} in a row</em>
                              : p.role !== 'member' ? p.role[0].toUpperCase() + p.role.slice(1) : ''}
                          </span>
                        </span>
                        <span className="roll-check" aria-hidden="true">
                          <svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9" /></svg>
                        </span>
                      </button>
                      {editing && (
                        <button type="button" className="roll-x" onClick={() => remove(p)} aria-label={`Remove ${p.full_name} from this room`}>×</button>
                      )}
                    </li>
                  );
                })}
              </ul>
              </>
            )}

            {adding ? (
              <AddPerson id={id} onAdded={added} onClose={() => setAdding(false)} />
            ) : (
              <button type="button" className="ci-ghost roll-add" onClick={() => setAdding(true)}>+ Add a name to this room</button>
            )}

            {error && <div className="ci-error" style={{ marginTop: 14 }}>{error}</div>}

            <div className="roll-bar">
              <button className="ci-submit" onClick={save} disabled={busy || (!dirty && Boolean(data.takenAt))}>
                {busy && <span className="ci-spinner" />}
                {busy ? 'Saving…' : !dirty && data.takenAt ? `Saved · ${here} present` : `Save roll · ${here} present`}
              </button>
            </div>
          </>
        )}
        {toast && <div className="roll-toast">{toast}</div>}
    </RollShell>
  );
}

function AddPerson({ id, onAdded, onClose }: { id: number; onAdded: (id: number, name: string) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [found, setFound] = useState<Found[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (name.trim().length < 2) return setFound([]);
    const t = setTimeout(() => {
      api<Found[]>(`/api/rooms/${id}/people?q=${encodeURIComponent(name)}`).then(setFound).catch(() => setFound([]));
    }, 250);
    return () => clearTimeout(t);
  }, [name, id]);

  async function add(json: { memberId?: number; fullName?: string; phone?: string }, label: string) {
    setBusy(true);
    setError('');
    try {
      const added = await api<{ id: number }>(`/api/rooms/${id}/people`, { method: 'POST', json });
      setName('');
      setPhone('');
      onAdded(added.id, label);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const exact = found.some((f) => f.full_name.toLowerCase() === name.trim().toLowerCase());

  return (
    <div className="ci-sheet roll-addbox">
      <div className="ci-sheet-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <b>Add a name</b>
          <button type="button" className="ci-back" onClick={onClose}>Done</button>
        </div>
        <div className="ci-input" style={{ marginBottom: 10 }}>
          <SearchGlyph />
          <input autoFocus placeholder="First and last name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {found.length > 0 && (
          <ul className="roll-found">
            {found.map((f) => (
              <li key={f.id}>
                <span>
                  <b>{f.full_name}</b>
                  <small>{f.here ? 'Already in this room' : f.class_name ? `In ${f.class_name} – adding moves them here` : 'Already in our records'}</small>
                </span>
                {!f.here && <button type="button" className="ci-back" disabled={busy} onClick={() => add({ memberId: f.id }, f.full_name)}>Add</button>}
              </li>
            ))}
          </ul>
        )}
        {name.trim().split(/\s+/).length >= 2 && !exact && (
          <>
            <div className="ci-input" style={{ margin: '10px 0' }}>
              <input type="tel" inputMode="tel" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <button type="button" className="ci-ghost" style={{ width: '100%' }} disabled={busy} onClick={() => add({ fullName: name, phone }, name)}>
              Add “{name.trim()}” as a new person
            </button>
          </>
        )}
        {error && <div className="ci-error" style={{ marginTop: 12, marginBottom: 0 }}>{error}</div>}
      </div>
    </div>
  );
}

const SearchGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
);
