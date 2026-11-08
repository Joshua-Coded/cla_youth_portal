'use client';

import { useCallback, useEffect, useState } from 'react';
import { ORG_NAME } from '@/lib/config';
import { api, fmtDate } from './ui';
import { Logo, ProgrammeIcon } from './Logo';

type Room = { id: number; name: string; room: string | null; facilitator: string | null; roster: number; here_today: number; taken_at: string | null };
type Data = { today: string; programme: { name: string; color: string; icon: string }; rooms: Room[] };

const css = (vars: Record<string, string | number>) => vars as React.CSSProperties;

/** The dark check-in backdrop used by the facilitator screens */
export function RollShell({ accent = '#7c5cff', day, children }: { accent?: string; day?: string; children: React.ReactNode }) {
  return (
    <div className="ci-bg" style={css({ '--c': accent })}>
      <div className="ci-orb ci-orb-a" style={{ background: accent }} />
      <div className="ci-orb ci-orb-b" />
      <main className="ci roll">
        <header className="ci-top">
          <a href="/rooms" className="ci-brand" style={{ color: 'inherit', textDecoration: 'none' }}>
            <Logo size={40} />
            <div>
              <div className="ci-brand-name">{ORG_NAME}</div>
              <div className="ci-brand-sub">Room roll call</div>
            </div>
          </a>
          {day && <div className="ci-today">{fmtDate(day, { weekday: 'short', day: 'numeric', month: 'short' })}</div>}
        </header>
        {children}
      </main>
    </div>
  );
}

/** Asks for the shared facilitator code once; the phone remembers it for two months. */
export function CodeGate({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/rooms/login', { method: 'POST', json: { code } });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <RollShell>
      <form className="ci-sheet" onSubmit={submit}>
        <div className="ci-sheet-body" style={{ padding: 26 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Facilitators</h1>
          <p style={{ color: 'rgba(246,244,255,.65)', margin: '6px 0 22px' }}>Enter the facilitator code to take the roll for your room. You’ll only need to do this once on this phone.</p>
          <div className="ci-field">
            <label className="ci-label" htmlFor="code">Facilitator code</label>
            <div className="ci-input">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>
              <input id="code" inputMode="numeric" autoComplete="off" autoFocus placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
          </div>
          {error && <div className="ci-error">{error}</div>}
          <button className="ci-submit" disabled={busy || !code.trim()}>
            {busy && <span className="ci-spinner" />}
            {busy ? 'Checking…' : 'Continue'}
          </button>
        </div>
      </form>
    </RollShell>
  );
}

export default function Rooms() {
  const [data, setData] = useState<Data | null>(null);
  const [needCode, setNeedCode] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await api<Data>('/api/rooms'));
    } catch (e) {
      if ((e as { status?: number }).status === 401) setNeedCode(true);
      else setError((e as Error).message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (needCode) return <CodeGate onDone={() => { setNeedCode(false); load(); }} />;

  return (
    <RollShell accent={data?.programme.color} day={data?.today}>
      {error ? (
        <div className="ci-state"><h1>Something went wrong</h1><p>{error}</p></div>
      ) : !data ? (
        [0, 1, 2, 3].map((i) => <div key={i} className="ci-skel" style={{ height: 96, borderRadius: 22 }} />)
      ) : (
        <>
          <section className="ci-hero">
            <p className="ci-eyebrow"><span className="ci-live" /> {data.programme.name}</p>
            <h1>Pick your room.</h1>
            <p>Call each name, tick who’s here, and save. It goes straight into attendance.</p>
          </section>
          {data.rooms.length === 0 ? (
            <div className="roll-empty">
              <b>No rooms have been set up yet.</b>
              <span>An admin can add rooms from the dashboard under Rooms.</span>
            </div>
          ) : (
            <div className="ci-grid">
              {data.rooms.map((r, i) => (
                <a key={r.id} href={`/rooms/${r.id}`} className="ci-prog room-pick" style={css({ '--c': data.programme.color, '--i': i })}>
                  <div className="ci-prog-icon"><ProgrammeIcon icon={data.programme.icon} size={22} /></div>
                  <div>
                    <div className="ci-prog-name">{r.name}</div>
                    <div className="ci-prog-meta">{[r.room, r.facilitator].filter(Boolean).join(' · ') || `${r.roster} names`}</div>
                  </div>
                  <div className="ci-prog-foot">
                    <span className="ci-here">
                      <i />
                      {r.taken_at ? `Roll taken · ${r.here_today}/${r.roster} here` : `${r.roster} names · roll not taken yet`}
                    </span>
                    <span className="ci-go">→</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </RollShell>
  );
}
