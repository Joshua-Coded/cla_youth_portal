import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { sql } from '@/lib/db';
import { ORG_NAME } from '@/lib/config';
import { qrSvg, siteOrigin } from '@/lib/qr';
import { Logo, ProgrammeIcon } from '@/components/Logo';
import PrintButton from '@/components/PrintButton';

export const metadata = { title: 'Check-in poster' };

export default async function Poster({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  if (!(await isAdmin())) redirect('/admin/login');
  const { code } = await searchParams;
  const [programme] = code ? await sql`SELECT name, tagline, schedule, color, icon FROM programmes WHERE code = ${code}` : [];
  const origin = await siteOrigin();
  const url = programme ? `${origin}/c/${code}` : `${origin}/`;
  const svg = await qrSvg(url);
  const all = programme ? [] : await sql`SELECT name, color FROM programmes WHERE is_active ORDER BY sort_order, id`;

  return (
    <div className="poster-page">
      <div>
        <div className="poster" style={{ '--c': programme?.color ?? '#6d4aff' } as React.CSSProperties}>
          <div className="poster-brand"><Logo size={36} />{ORG_NAME}</div>
          <div className="poster-kicker">{programme ? 'Check in to' : 'Youth check-in'}</div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' }}>
            {programme && <span style={{ color: programme.color, display: 'inline-flex' }}><ProgrammeIcon icon={programme.icon} size={44} /></span>}
            {programme ? programme.name : 'Check in here'}
          </h1>
          <div className="poster-sub">
            {programme
              ? programme.tagline || programme.schedule || 'Scan to let us know you came'
              : all.map((p) => p.name).join(' · ')}
          </div>
          <div className="poster-qr" dangerouslySetInnerHTML={{ __html: svg }} />
          <div className="poster-steps" style={{ marginTop: 'auto', paddingTop: 24 }}>
            <span><b>1</b>Open your camera</span>
            <span><b>2</b>Scan the code</span>
            <span><b>3</b>{programme ? 'Enter your name' : 'Pick your programme'}</span>
          </div>
        </div>
        <div className="poster-tools no-print">
          <PrintButton />
          <a className="btn" href="/admin/qr">Back to QR codes</a>
        </div>
      </div>
    </div>
  );
}
