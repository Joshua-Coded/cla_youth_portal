import { headers } from 'next/headers';
import QRCode from 'qrcode';

export async function siteOrigin() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const h = await headers();
  return `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
}

export const qrSvg = (url: string, dark = '#15122b') =>
  QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'H', color: { dark, light: '#ffffff' } });

export const qrPng = (url: string) =>
  QRCode.toDataURL(url, { width: 1200, margin: 2, errorCorrectionLevel: 'H', color: { dark: '#15122b', light: '#ffffff' } });
