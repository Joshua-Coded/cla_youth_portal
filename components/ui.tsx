'use client';

import { useCallback, useState } from 'react';
import { ROLE_LABEL, STATUS_LABEL, type Role, type Status } from '@/lib/config';
import { Icon } from './Logo';

export async function api<T = any>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.json !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  if (res.status === 401 && url.startsWith('/api/admin') && !url.endsWith('/login')) {
    window.location.href = '/admin/login';
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong'), { status: res.status });
  return data;
}

export const css = (vars: Record<string, string | number>) => vars as React.CSSProperties;

export function fmtDate(d: string | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!d) return '—';
  return new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString(undefined, opts);
}

export function daysAgo(d: string | null) {
  if (!d) return '';
  const days = Math.round((Date.now() - new Date(`${d}T12:00:00`).getTime()) / 864e5);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : days < 14 ? `${days} days ago` : `${Math.round(days / 7)} weeks ago`;
}

export function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return fmtDate(iso, { day: 'numeric', month: 'short' });
}

const AVATAR_COLORS = ['#7c5cff', '#0ea5e9', '#f97316', '#10b981', '#ec4899', '#6366f1', '#eab308', '#14b8a6'];
export function Avatar({ name, large }: { name: string; large?: boolean }) {
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const c = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  return (
    <span className={`avatar ${large ? 'lg' : ''}`} style={{ background: `linear-gradient(145deg, ${c}, color-mix(in srgb, ${c} 60%, #1a0f4a))` }}>
      {initials}
    </span>
  );
}

export function ProgrammeTag({ name, color }: { name: string; color: string }) {
  return <span className="p-tag" style={css({ '--c': color })}><i />{name}</span>;
}

export function RoleBadge({ role }: { role: Role }) {
  if (role === 'member') return null;
  return <span className={`badge role-${role}`}>{ROLE_LABEL[role]}</span>;
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge ${status}`}><i className="dot" />{STATUS_LABEL[status]}</span>;
}

export function RateBar({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="muted">—</span>;
  const pct = Math.round(rate * 100);
  const color = pct >= 75 ? 'var(--ok)' : pct >= 50 ? 'var(--warn)' : 'var(--danger)';
  return (
    <div className="rate">
      <div className="rate-bar"><i style={{ width: `${Math.max(pct, 3)}%`, background: color }} /></div>
      <span className="small num" style={{ minWidth: 36, fontWeight: 650 }}>{pct}%</span>
    </div>
  );
}

export function Streak({ missed }: { missed: number }) {
  if (!missed) return <span className="muted small">—</span>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span className="streak">{Array.from({ length: Math.min(missed, 6) }, (_, i) => <i key={i} />)}</span>
      <b className="small">{missed}</b>
    </span>
  );
}

export function ContactLinks({ phone }: { phone: string | null }) {
  if (!phone) return <span className="muted small">No phone</span>;
  const wa = phone.startsWith('+') ? phone.slice(1) : phone.replace(/^0/, '234');
  return (
    <span className="contact" onClick={(e) => e.stopPropagation()}>
      <a href={`tel:${phone}`} title={`Call ${phone}`}><Icon.phone size={15} /></a>
      <a className="wa" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" title="WhatsApp"><Icon.chat size={15} /></a>
    </span>
  );
}

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const show = useCallback((m: string) => {
    setMessage(m);
    setTimeout(() => setMessage(null), 2400);
  }, []);
  const node = message ? <div className="toast">{message}</div> : null;
  return [node, show] as const;
}
