import { memberStats, programmesList } from '@/lib/analytics';
import { FOLLOW_UP_AFTER } from '@/lib/db';
import { denyUnlessAdmin } from '@/lib/http';

export async function GET(req: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const threshold = Math.max(1, Number(new URL(req.url).searchParams.get('threshold')) || FOLLOW_UP_AFTER);
  const [members, programmes] = await Promise.all([memberStats(threshold), programmesList()]);
  return Response.json({ threshold, members, programmes });
}
