'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ORG_NAME, type Programme } from '@/lib/config';
import { api } from './ui';
import { Icon, Logo } from './Logo';

const LINKS = [
  { href: '/admin', label: 'Dashboard', icon: Icon.dashboard },
  { href: '/admin/programmes', label: 'Programmes', icon: Icon.programmes },
  { href: '/admin/members', label: 'People', icon: Icon.members },
  { href: '/admin/rooms', label: 'Rooms', icon: Icon.check },
  { href: '/admin/qr', label: 'QR codes', icon: Icon.qr },
];

async function logout() {
  await api('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin/login';
}

export default function Sidebar({ programmes }: { programmes: Pick<Programme, 'id' | 'name' | 'color'>[] }) {
  const path = usePathname();
  return (
    <>
      <aside className="sidebar">
        <Link href="/admin" className="sidebar-brand">
          <Logo size={38} />
          <div><b>{ORG_NAME}</b><span>Leaders’ dashboard</span></div>
        </Link>
        <div className="side-label">Menu</div>
        <nav className="side-nav">
          {LINKS.map(({ href, label, icon: I }) => (
            <Link key={href} href={href} className={path === href ? 'current' : ''}><I />{label}</Link>
          ))}
        </nav>
        <div className="side-label" style={{ marginTop: 24 }}>Serving team</div>
        <div className="side-progs">
          <Link href="/admin?audience=team"><i style={{ background: '#fbbf24' }} />Team dashboard</Link>
          <a href="/admin/members?role=facilitator"><i style={{ background: '#38bdf8' }} />Facilitators</a>
          <a href="/admin/members?role=leader"><i style={{ background: '#f59e0b' }} />Leaders</a>
        </div>
        <div className="side-label" style={{ marginTop: 24 }}>Programmes</div>
        <div className="side-progs">
          {programmes.map((p) => (
            <Link key={p.id} href={`/admin?programme=${p.id}`}><i style={{ background: p.color }} />{p.name}</Link>
          ))}
        </div>
        <div className="side-foot">
          <div className="side-card">
            <b>Check-in page</b>
            What young people see when they scan.
            <br />
            <a href="/" target="_blank">Open it <Icon.external size={13} /></a>
          </div>
          <button className="side-btn" onClick={logout}><Icon.logout />Sign out</button>
        </div>
      </aside>
      <nav className="mobilebar">
        <Logo size={30} />
        {LINKS.map(({ href, label, icon: I }) => (
          <Link key={href} href={href} className={path === href ? 'current' : ''}><I size={16} />{label}</Link>
        ))}
        <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}><Icon.logout size={16} /></a>
      </nav>
    </>
  );
}
