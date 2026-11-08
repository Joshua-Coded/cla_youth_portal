import { programmesList } from '@/lib/analytics';
import { qrPng, qrSvg, siteOrigin } from '@/lib/qr';
import { Icon, ProgrammeIcon } from '@/components/Logo';
import CopyButton from '@/components/CopyButton';

export const metadata = { title: 'QR codes' };
export const dynamic = 'force-dynamic';

export default async function QrCodes() {
  const origin = await siteOrigin();
  const programmes = (await programmesList()).filter((p) => p.is_active);
  const mainUrl = `${origin}/`;
  const [mainSvg, mainPng, cards] = await Promise.all([
    qrSvg(mainUrl),
    qrPng(mainUrl),
    Promise.all(programmes.map(async (p) => {
      const url = `${origin}/c/${p.code}`;
      return { ...p, url, svg: await qrSvg(url), png: await qrPng(url) };
    })),
  ]);

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">QR codes</div>
          <h1>Scan to check in</h1>
          <p>Print these, put them on the projector, or share them in the WhatsApp group.</p>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: 22, padding: 28 }}>
        <div className="qr-hero">
          <div className="qr-frame" dangerouslySetInnerHTML={{ __html: mainSvg }} />
          <div>
            <span className="badge live" style={{ marginBottom: 12 }}><i className="dot" />Main QR · recommended</span>
            <h2 style={{ fontSize: 28, marginTop: 10 }}>One code for everything</h2>
            <p className="muted" style={{ maxWidth: 520 }}>
              Shows all {programmes.length} programmes. People tap the one they’re attending. Print it once and leave it up at the entrance for good.
            </p>
            <p className="small muted" style={{ wordBreak: 'break-all' }}>{mainUrl}</p>
            <div className="toolbar" style={{ marginTop: 16 }}>
              <a className="btn primary" href="/admin/poster" target="_blank"><Icon.print />Print poster</a>
              <a className="btn" href={mainPng} download="cla-youth-checkin-qr.png"><Icon.download />Download PNG</a>
              <CopyButton text={mainUrl} />
            </div>
          </div>
        </div>
      </section>

      <div className="panel-head"><div><h2>Programme QR codes</h2><p>Each one takes people straight to that programme’s check-in.</p></div></div>
      <div className="qr-grid">
        {cards.map((p) => (
          <article key={p.id} className="qr-card" style={{ '--c': p.color } as React.CSSProperties}>
            <div className="qr-card-top">
              <div className="qr-frame" dangerouslySetInnerHTML={{ __html: p.svg }} />
              <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ color: p.color, display: 'inline-flex' }}><ProgrammeIcon icon={p.icon} size={18} /></span>
                {p.name}
              </h3>
            </div>
            <div className="qr-card-url">{p.url}</div>
            <div className="qr-card-actions">
              <a className="btn sm primary" href={`/admin/poster?code=${p.code}`} target="_blank"><Icon.print />Poster</a>
              <a className="btn sm" href={p.png} download={`${p.code}-qr.png`}><Icon.download />PNG</a>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
