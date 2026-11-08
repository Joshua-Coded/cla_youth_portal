import { cookies } from 'next/headers';
import { checkPassword, newSession, COOKIE, SESSION_DAYS } from '@/lib/auth';
import { fail } from '@/lib/http';

// Simple per-instance brute-force brake
const attempts = new Map<string, number[]>();

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  const recent = (attempts.get(ip) ?? []).filter((t) => t > Date.now() - 15 * 60_000);
  if (recent.length >= 10) return fail('Too many attempts. Try again in 15 minutes.', 429);

  const { password } = await req.json().catch(() => ({}));
  if (!checkPassword(String(password ?? ''))) {
    attempts.set(ip, [...recent, Date.now()]);
    return fail('Wrong password', 401);
  }
  attempts.delete(ip);
  (await cookies()).set(COOKIE, newSession(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 86400,
  });
  return Response.json({ ok: true });
}
