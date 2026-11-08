import { cookies } from 'next/headers';
import { checkFacilitatorCode, newSession, FAC_COOKIE, FAC_SESSION_DAYS } from '@/lib/auth';
import { fail } from '@/lib/http';

// Simple per-instance brute-force brake
const attempts = new Map<string, number[]>();

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  const recent = (attempts.get(ip) ?? []).filter((t) => t > Date.now() - 15 * 60_000);
  if (recent.length >= 10) return fail('Too many attempts. Try again in 15 minutes.', 429);

  const { code } = await req.json().catch(() => ({}));
  if (!checkFacilitatorCode(String(code ?? ''))) {
    attempts.set(ip, [...recent, Date.now()]);
    return fail('That code isn’t right. Ask a leader for the facilitator code.', 401);
  }
  attempts.delete(ip);
  (await cookies()).set(FAC_COOKIE, newSession('fac'), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: FAC_SESSION_DAYS * 86400,
  });
  return Response.json({ ok: true });
}
