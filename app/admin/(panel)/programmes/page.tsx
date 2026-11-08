'use client';

import { useCallback, useEffect, useState } from 'react';
import { COLORS, ICONS } from '@/lib/config';
import { Icon, ProgrammeIcon } from '@/components/Logo';
import { api, Avatar, css, fmtDate, useToast } from '@/components/ui';

type Row = {
  id: number; name: string; tagline: string | null; schedule: string | null; color: string; icon: string;
  code: string; is_active: boolean; sessions: number; checkins: number; people: number;
  here_today: number; today_open: boolean; url: string; qr: string;
};
type Session = { id: number; date: string; is_open: boolean; attendance: number };
type Attendee = { id: number; full_name: string; phone: string | null; created_at: string };
type Draft = { id?: number; name: string; tagline: string; schedule: string; color: string; icon: string; is_active: boolean };

const blank: Draft = { name: '', tagline: '', schedule: '', color: COLORS[4], icon: 'star', is_active: true };

export default function Programmes() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [toast, showToast] = useToast();

  const load = useCallback(async () => {
    const data = await api<{ programmes: Row[] }>('/api/admin/programmes');
    setRows(data.programmes);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  async function save() {
    if (!draft) return;
    setError('');
    try {
      if (draft.id) await api(`/api/admin/programmes/${draft.id}`, { method: 'PATCH', json: draft });
      else await api('/api/admin/programmes', { method: 'POST', json: draft });
      showToast(draft.id ? 'Programme updated' : 'Programme added: it’s now on the check-in page');
      setDraft(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(id: number, name: string) {
    if (!confirm(`Delete ${name} and ALL of its attendance history? This can’t be undone.\n\nTip: switch it off instead to hide it but keep the history.`)) return;
    await api(`/api/admin/programmes/${id}`, { method: 'DELETE' });
    setDraft(null);
    showToast('Programme deleted');
    load();
  }

  async function setToday(p: Row, open: boolean) {
    await api(`/api/admin/programmes/${p.id}/today`, { method: 'POST', json: { open } });
    showToast(open ? `${p.name} check-in reopened` : `${p.name} check-in closed for today`);
    load();
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    showToast('Check-in link copied');
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Programmes</div>
          <h1>Your programmes</h1>
          <p>Every active programme shows on the check-in page. Each one gets its own QR code.</p>
        </div>
        <button className="btn primary" onClick={() => { setError(''); setDraft({ ...blank }); }}>+ New programme</button>
      </div>

      {error && !draft && <div className="error">{error}</div>}

      {rows === null ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="prog-cards">
          {rows.map((p) => (
            <ProgrammeCard
              key={p.id}
              p={p}
              onEdit={() => { setError(''); setDraft({ id: p.id, name: p.name, tagline: p.tagline ?? '', schedule: p.schedule ?? '', color: p.color, icon: p.icon, is_active: p.is_active }); }}
              onToday={(open) => setToday(p, open)}
              onCopy={() => copy(p.url)}
            />
          ))}
        </div>
      )}

      {draft && (
        <>
          <div className="scrim" onClick={() => setDraft(null)} />
          <div className="modal" role="dialog" aria-label="Programme">
            <h2>{draft.id ? `Edit ${draft.name}` : 'New programme'}</h2>
            <div className="field">
              <label className="lbl">Name</label>
              <input className="input" autoFocus value={draft.name} placeholder="e.g. Sunday Service" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="field">
              <label className="lbl">Short description <span className="muted">(optional, shown on the card)</span></label>
              <input className="input" value={draft.tagline} placeholder="e.g. For university students" onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} />
            </div>
            <div className="field">
              <label className="lbl">When it meets <span className="muted">(optional)</span></label>
              <input className="input" value={draft.schedule} placeholder="e.g. Saturdays · 4pm" onChange={(e) => setDraft({ ...draft, schedule: e.target.value })} />
            </div>
            <div className="field">
              <label className="lbl">Colour</label>
              <div className="swatches">
                {COLORS.map((c) => (
                  <button key={c} type="button" className={`swatch ${draft.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setDraft({ ...draft, color: c })} aria-label={c} />
                ))}
              </div>
            </div>
            <div className="field">
              <label className="lbl">Icon</label>
              <div className="icon-pick">
                {ICONS.map((i) => (
                  <button key={i} type="button" className={draft.icon === i ? 'on' : ''} onClick={() => setDraft({ ...draft, icon: i })} aria-label={i}>
                    <ProgrammeIcon icon={i} size={18} />
                  </button>
                ))}
              </div>
            </div>
            {draft.id && (
              <div className="today-row" style={{ marginBottom: 16 }}>
                <span><b>Show on check-in page</b><br /><span className="muted small">Switch off to retire it but keep its history.</span></span>
                <button type="button" className={`switch ${draft.is_active ? 'on' : ''}`} onClick={() => setDraft({ ...draft, is_active: !draft.is_active })} aria-label="Active" />
              </div>
            )}
            {error && <div className="error">{error}</div>}
            <div className="modal-actions">
              {draft.id && <button className="btn danger" style={{ marginRight: 'auto' }} onClick={() => remove(draft.id!, draft.name)}>Delete</button>}
              <button className="btn" onClick={() => setDraft(null)}>Cancel</button>
              <button className="btn primary" onClick={save}>{draft.id ? 'Save' : 'Add programme'}</button>
            </div>
          </div>
        </>
      )}
      {toast}
    </main>
  );
}

function ProgrammeCard({ p, onEdit, onToday, onCopy }: { p: Row; onEdit: () => void; onToday: (open: boolean) => void; onCopy: () => void }) {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [openSession, setOpenSession] = useState<number | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);

  async function toggleSessions() {
    if (sessions) return setSessions(null);
    setSessions(await api<Session[]>(`/api/admin/programmes/${p.id}/sessions`));
  }

  async function toggleSession(id: number) {
    if (openSession === id) return setOpenSession(null);
    setAttendees(await api<Attendee[]>(`/api/admin/sessions/${id}/attendees`));
    setOpenSession(id);
  }

  return (
    <article className={`prog-card ${p.is_active ? '' : 'inactive'}`} style={css({ '--c': p.color })}>
      <div className="prog-card-head">
        <div className="prog-card-icon"><ProgrammeIcon icon={p.icon} size={22} /></div>
        <div style={{ minWidth: 0 }}>
          <div className="prog-card-title">{p.name}</div>
          <div className="prog-card-sub">{p.tagline || p.schedule || (p.is_active ? 'On the check-in page' : 'Hidden from check-in')}</div>
        </div>
        <a className="prog-card-qr" href={`/admin/poster?code=${p.code}`} target="_blank" title="Open printable poster" dangerouslySetInnerHTML={{ __html: p.qr }} />
      </div>

      <div className="prog-card-stats">
        <div><b>{p.people}</b><span>People</span></div>
        <div><b>{p.sessions}</b><span>Sessions</span></div>
        <div><b>{p.checkins}</b><span>Check-ins</span></div>
      </div>

      <div className="prog-card-body">
        <div className="today-row">
          <span>
            <b>Today</b> · {p.here_today} checked in
            <br />
            <span className="muted small">{p.today_open ? 'Check-in is open' : 'Check-in is closed'}</span>
          </span>
          <button className={`switch ${p.today_open ? 'on' : ''}`} onClick={() => onToday(!p.today_open)} aria-label="Today’s check-in" title={p.today_open ? 'Close today’s check-in' : 'Reopen today’s check-in'} />
        </div>

        <div className="toolbar">
          <a className="btn sm primary" href={`/admin/poster?code=${p.code}`} target="_blank"><Icon.print />Poster</a>
          <button className="btn sm" onClick={onCopy}>Copy link</button>
          <button className="btn sm" onClick={toggleSessions}>{sessions ? 'Hide history' : 'History'}</button>
          <button className="btn sm ghost" onClick={onEdit}>Edit</button>
        </div>

        {sessions && (
          sessions.length === 0 ? (
            <p className="muted small" style={{ margin: 0 }}>No sessions yet. One is created automatically when the first person checks in on a day.</p>
          ) : (
            <ul className="sessions">
              {sessions.map((s) => (
                <li key={s.id}>
                  <button className="row" onClick={() => toggleSession(s.id)}>
                    <span>{fmtDate(s.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <b>{s.attendance}</b>
                  </button>
                  {openSession === s.id && (
                    <div className="attendees">
                      {attendees.map((a) => (
                        <div key={a.id}>
                          <a href={`/admin/members?id=${a.id}`} style={{ color: 'inherit', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                            <Avatar name={a.full_name} />{a.full_name}
                          </a>
                          <span className="muted">{new Date(a.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </article>
  );
}
