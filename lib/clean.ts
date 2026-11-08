export const nameKey = (s: string) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

export function cleanName(s: unknown) {
  const name = String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  // Tidy up ALL CAPS or all lowercase entries; leave mixed case as typed (e.g. "McDonald")
  if (name === name.toLowerCase() || name === name.toUpperCase()) {
    return name.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (c) => c.toUpperCase());
  }
  return name;
}

/** null = not given, undefined = invalid */
export function cleanPhone(s: unknown): string | null | undefined {
  const raw = String(s ?? '').trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return undefined;
  return (raw.startsWith('+') ? '+' : '') + digits;
}

export const isColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
