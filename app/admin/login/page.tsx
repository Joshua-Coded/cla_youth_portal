'use client';

import { useState } from 'react';
import { ORG_NAME } from '@/lib/config';
import { api } from '@/components/ui';
import { Logo } from '@/components/Logo';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/admin/login', { method: 'POST', json: { password } });
      window.location.href = '/admin';
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="ci-bg">
      <div className="ci-orb ci-orb-a" />
      <div className="ci-orb ci-orb-b" />
      <div className="ci-orb ci-orb-c" />
      <main className="ci" style={{ justifyContent: 'center' }}>
        <div className="login-card">
          <div className="ci-brand" style={{ justifyContent: 'center', marginBottom: 26 }}>
            <Logo size={44} />
            <div>
              <div className="ci-brand-name">{ORG_NAME}</div>
              <div className="ci-brand-sub">Leaders’ dashboard</div>
            </div>
          </div>
          <form className="ci-sheet" onSubmit={submit}>
            <div className="ci-sheet-body" style={{ padding: 26 }}>
              <h1 style={{ fontSize: 30, fontWeight: 800 }}>Welcome back</h1>
              <p style={{ color: 'rgba(246,244,255,.65)', margin: '6px 0 22px' }}>Sign in to see attendance and who needs a call.</p>
              <div className="ci-field">
                <label className="ci-label" htmlFor="password">Password</label>
                <div className="ci-input">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>
                  <input id="password" type="password" autoFocus placeholder="Admin password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>
              {error && <div className="ci-error">{error}</div>}
              <button className="ci-submit" disabled={busy}>
                {busy && <span className="ci-spinner" />}
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </form>
          <p className="ci-privacy" style={{ marginTop: 18 }}><a href="/" style={{ color: 'inherit' }}>← Back to check-in</a></p>
        </div>
      </main>
    </div>
  );
}
