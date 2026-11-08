'use client';

import { useCallback, useEffect, useState } from 'react';
import { ORG_NAME, ROLE_LABEL, ROLES, type Role } from '@/lib/config';
import { api, fmtDate } from './ui';
import { ProgrammeIcon, Logo } from './Logo';

type Programme = {
  name: string;
  tagline: string | null;
  schedule: string | null;
  color: string;
  icon: string;
  code: string;
  is_open: boolean;
  is_active?: boolean;
  here_today: number;
};
type Saved = { fullName: string; phone: string; role: Role };
type Done = { name: string; programme: string; already: boolean; visits: number; role: Role };

const STORAGE_KEY = 'yp_me';
const EMPTY: Saved = { fullName: '', phone: '', role: 'member' };
const css = (vars: Record<string, string | number>) => vars as React.CSSProperties;

function loadSaved(): Saved | null {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function CheckIn({ code }: { code?: string }) {
  const [programmes, setProgrammes] = useState<Programme[] | null>(null);
  const [day, setDay] = useState('');
  const [selected, setSelected] = useState<Programme | null>(null);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState<Saved>(EMPTY);
  const [remembered, setRemembered] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [hello, setHello] = useState('Welcome');

  const load = useCallback(async () => {
    try {
      if (code) {
        const { today, programme } = await api<{ today: string; programme: Programme }>(`/api/public/programmes/${code}`);
        setDay(today);
        if (!programme.is_active) throw new Error('This programme is no longer taking check-ins.');
        setProgrammes([programme]);
        setSelected(programme);
      } else {
        const { today, programmes } = await api<{ today: string; programmes: Programme[] }>('/api/public/programmes');
        setDay(today);
        setProgrammes(programmes);
      }
      setLoadError('');
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [code]);

  useEffect(() => {
    setHello(greeting());
    const saved = loadSaved();
    if (saved?.fullName) {
      setForm({ fullName: saved.fullName, phone: saved.phone ?? '', role: ROLES.includes(saved.role) ? saved.role : 'member' });
      setRemembered(true);
    }
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError('');
    if (form.fullName.trim().split(/\s+/).length < 2) return setError('Please enter your first and last name.');
    setBusy(true);
    try {
      const result = await api<Done>('/api/checkin', { method: 'POST', json: { ...form, code: selected.code } });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
      } catch {}
      setRemembered(true);
      setDone(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function forget() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setForm(EMPTY);
    setRemembered(false);
  }

  function reset(other: boolean) {
    if (other) forget();
    setDone(null);
    setError('');
    if (!code) setSelected(null);
    load();
  }

  const accent = selected?.color ?? '#7c5cff';

  return (
    <div className="ci-bg">
      <div className="ci-orb ci-orb-a" style={selected ? { background: accent } : undefined} />
      <div className="ci-orb ci-orb-b" />
      <div className="ci-orb ci-orb-c" />

      <main className="ci">
        <header className="ci-top">
          <a href="/" className="ci-brand" style={{ color: 'inherit', textDecoration: 'none' }}>
            <Logo size={40} />
            <div>
              <div className="ci-brand-name">{ORG_NAME}</div>
              <div className="ci-brand-sub">Youth Ministry</div>
            </div>
          </a>
          {day && <div className="ci-today">{fmtDate(day, { weekday: 'short', day: 'numeric', month: 'short' })}</div>}
        </header>

        {done && selected ? (
          <Success done={done} color={accent} onAgain={() => reset(false)} onOther={() => reset(true)} />
        ) : loadError ? (
          <StateCard title="This link isn’t working" text={`${loadError} Please scan the main QR code or ask a leader.`} />
        ) : programmes === null ? (
          <div>
            <div className="ci-skel" style={{ width: '40%' }} />
            <div className="ci-skel" style={{ width: '85%', height: 48, marginBottom: 30 }} />
            <div className="ci-grid">
              {[0, 1, 2, 3].map((i) => <div key={i} className="ci-skel" style={{ height: 150, borderRadius: 22, margin: 0 }} />)}
            </div>
          </div>
        ) : selected ? (
          <form className="ci-sheet" style={css({ '--c': accent })} onSubmit={submit} noValidate>
            <div className="ci-sheet-head">
              <div className="ci-prog-icon" style={css({ '--c': accent })}><ProgrammeIcon icon={selected.icon} size={24} /></div>
              <div style={{ minWidth: 0 }}>
                <div className="ci-brand-sub" style={{ marginBottom: 3 }}>Checking in to</div>
                <div className="ci-sheet-title">{selected.name}</div>
              </div>
              {!code && <button type="button" className="ci-back" onClick={() => { setSelected(null); setError(''); }}>Change</button>}
            </div>

            <div className="ci-sheet-body">
              {!selected.is_open ? (
                <div className="ci-error">Check-in for {selected.name} has closed for today.</div>
              ) : (
                <>
                  {remembered ? (
                    <div className="ci-me">
                      <div className="ci-avatar">{initials(form.fullName)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="ci-me-label">Welcome back</div>
                        <div className="ci-me-name">{form.fullName}</div>
                      </div>
                      <button type="button" className="ci-link" onClick={forget}>Not you?</button>
                    </div>
                  ) : (
                    <>
                      <div className="ci-field">
                        <label className="ci-label" htmlFor="name">Your full name</label>
                        <div className="ci-input">
                          <PersonGlyph />
                          <input
                            id="name"
                            autoComplete="name"
                            autoFocus
                            placeholder="First and last name"
                            value={form.fullName}
                            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="ci-field">
                        <label className="ci-label" htmlFor="phone">
                          Phone number <span className="ci-optional">Optional</span>
                        </label>
                        <div className="ci-input">
                          <PhoneGlyph />
                          <input
                            id="phone"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="0803 123 4567"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          />
                        </div>
                        <p className="ci-help">So a leader can check on you if we miss you.</p>
                      </div>
                    </>
                  )}

                  <div className="ci-field">
                    <span className="ci-label">I’m here as</span>
                    <div className="ci-roles" role="radiogroup" aria-label="Attending as">
                      {ROLES.map((r) => (
                        <label key={r} className={form.role === r ? 'on' : ''}>
                          <input type="radio" name="role" value={r} checked={form.role === r} onChange={() => setForm({ ...form, role: r })} />
                          <RoleGlyph role={r} />
                          {ROLE_LABEL[r]}
                        </label>
                      ))}
                    </div>
                  </div>

                  {error && <div className="ci-error">{error}</div>}
                  <button className="ci-submit" disabled={busy}>
                    {busy && <span className="ci-spinner" />}
                    {busy ? 'Checking you in…' : remembered ? `Check in as ${form.fullName.split(' ')[0]}` : 'Check me in'}
                  </button>
                  <p className="ci-privacy"><LockGlyph /> Only church leaders can see your details.</p>
                </>
              )}
            </div>
          </form>
        ) : programmes.length === 0 ? (
          <StateCard title="Check-in is resting" text="There are no programmes taking check-ins right now. Please ask a leader." />
        ) : (
          <>
            <section className="ci-hero">
              <p className="ci-eyebrow"><span className="ci-live" /> {hello}{remembered ? `, ${form.fullName.split(' ')[0]}` : ''}</p>
              <h1>Welcome home.</h1>
              <p>Tap the programme you’re attending to check in.</p>
            </section>

            <div className="ci-grid">
              {programmes.map((p, i) => (
                <button
                  key={p.code}
                  type="button"
                  className={`ci-prog ${p.is_open ? '' : 'closed'}`}
                  style={css({ '--c': p.color, '--i': i })}
                  onClick={() => p.is_open && setSelected(p)}
                  aria-disabled={!p.is_open}
                >
                  <div className="ci-prog-icon"><ProgrammeIcon icon={p.icon} size={22} /></div>
                  <div>
                    <div className="ci-prog-name">{p.name}</div>
                    {(p.tagline || p.schedule) && <div className="ci-prog-meta">{p.tagline || p.schedule}</div>}
                  </div>
                  <div className="ci-prog-foot">
                    <span className="ci-here">
                      <i />
                      {!p.is_open ? 'Closed today' : p.here_today ? `${p.here_today} here today` : 'Be the first today'}
                    </span>
                    <span className="ci-go"><ArrowGlyph /></span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        <footer className="ci-foot">
          © {new Date().getFullYear()} {ORG_NAME} · Made with love for our young people
          <br />
          <a href="/rooms">Facilitators: take your room’s roll →</a>
        </footer>
      </main>
    </div>
  );
}

function Success({ done, color, onAgain, onOther }: { done: Done; color: string; onAgain: () => void; onOther: () => void }) {
  const first = done.name.split(' ')[0];
  const palette = [color, '#ffffff', '#fbbf24', '#38bdf8', '#f472b6', '#34d399'];
  return (
    <div className="ci-success" style={css({ '--c': color })}>
      <div className="ci-confetti" aria-hidden="true">
        {Array.from({ length: 18 }, (_, i) => (
          <i key={i} style={css({ '--i': i, background: palette[i % palette.length] })} />
        ))}
      </div>
      <div className="ci-tick">
        <svg viewBox="0 0 52 52" aria-hidden="true">
          <circle cx="26" cy="26" r="25" />
          <path d="M15 27l7 7 15-16" />
        </svg>
      </div>
      <h1>{done.already ? `Already in, ${first}!` : `You’re in, ${first}!`}</h1>
      <p className="ci-success-text">
        {done.already ? 'We already have you down for' : 'You’re checked in to'} <b>{done.programme}</b>.
      </p>
      <div className="ci-stats">
        <div className="ci-stat"><b>{done.visits}</b><span>{done.visits === 1 ? 'First visit, welcome!' : 'Total check-ins'}</span></div>
        <div className="ci-stat"><b>{new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</b><span>Checked in at</span></div>
      </div>
      <p className="ci-blessing">
        {done.role === 'member' ? 'So glad you’re here. Have a blessed time 💜' : `Thank you for serving today as a ${ROLE_LABEL[done.role].toLowerCase()} 🙏`}
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="ci-ghost" onClick={onAgain}>Done</button>
        <button className="ci-ghost" onClick={onOther}>Check in someone else</button>
      </div>
    </div>
  );
}

function StateCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="ci-state">
      <div className="ci-illus">
        <div className="ci-illus-ring" />
        <div className="ci-illus-ring ci-illus-ring-2" />
        <div className="ci-illus-core">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
        </div>
      </div>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}

const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

const glyph = { width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const PersonGlyph = () => <svg {...glyph}><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" /></svg>;
const PhoneGlyph = () => <svg {...glyph}><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M11 18h2" /></svg>;
const ArrowGlyph = () => <svg {...glyph} width={16} height={16}><path d="M5 12h13M12.5 6l6 6-6 6" /></svg>;
function RoleGlyph({ role }: { role: Role }) {
  if (role === 'leader') return <svg {...glyph} width={16} height={16}><path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z" /></svg>;
  if (role === 'facilitator') return <svg {...glyph} width={16} height={16}><path d="M4 5.8c2.6-1 5.4-.9 8 .6 2.6-1.5 5.4-1.6 8-.6v12.8c-2.6-1-5.4-.9-8 .6-2.6-1.5-5.4-1.6-8-.6zM12 6.4v13" /></svg>;
  return <svg {...glyph} width={16} height={16}><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" /></svg>;
}
const LockGlyph = () => <svg {...glyph} width={13} height={13}><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>;
