import { overview } from '@/lib/analytics';
import { FOLLOW_UP_AFTER } from '@/lib/db';
import { denyUnlessAdmin } from '@/lib/http';

export async function GET(req: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const params = new URL(req.url).searchParams;
  const programmeId = Number(params.get('programme')) || undefined;
  const threshold = Math.max(1, Number(params.get('threshold')) || FOLLOW_UP_AFTER);
  const audience = params.get('audience') === 'team' ? 'team' : 'youth';
  return Response.json(await overview({ programmeId, threshold, audience }));
}
