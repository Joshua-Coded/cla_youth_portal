import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export const COOKIE = 'yp_admin';
export const SESSION_DAYS = 14;
/** Facilitators sign in with a shared code that only opens the room roll call */
export const FAC_COOKIE = 'yp_fac';
export const FAC_SESSION_DAYS = 60;

const SECRET = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'dev-secret';
const sign = (value: string) => crypto.createHmac('sha256', SECRET).update(value).digest('base64url');

export function sameText(a: string, b: string) {
  const hash = (s: string) => crypto.createHash('sha256').update(s).digest();
  return crypto.timingSafeEqual(hash(a), hash(b));
}

export function checkPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error('ADMIN_PASSWORD is not set.');
  return sameText(password, expected);
}

export function checkFacilitatorCode(code: string) {
  const expected = process.env.FACILITATOR_CODE;
  return Boolean(expected) && sameText(code.trim(), expected!);
}

// Facilitator sessions are signed with a prefix so they can't pass as admin sessions
export function newSession(kind: 'admin' | 'fac' = 'admin') {
  const expires = String(Date.now() + (kind === 'fac' ? FAC_SESSION_DAYS : SESSION_DAYS) * 864e5);
  return `${expires}.${sign(kind === 'fac' ? `fac:${expires}` : expires)}`;
}

function valid(value: string | undefined, prefix = '') {
  if (!value) return false;
  const [expires, sig] = value.split('.');
  return Boolean(sig) && sameText(sig, sign(prefix + expires)) && Number(expires) > Date.now();
}

export async function isAdmin() {
  return valid((await cookies()).get(COOKIE)?.value);
}

/** Admins can do everything a facilitator can */
export async function isFacilitator() {
  const jar = await cookies();
  return valid(jar.get(FAC_COOKIE)?.value, 'fac:') || valid(jar.get(COOKIE)?.value);
}
