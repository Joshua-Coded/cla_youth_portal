import { isAdmin, isFacilitator } from './auth';

export const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

/** Returns a 401 response when the caller isn't signed in, otherwise null. */
export async function denyUnlessAdmin() {
  return (await isAdmin()) ? null : fail('Please sign in', 401);
}

export async function denyUnlessFacilitator() {
  return (await isFacilitator()) ? null : fail('Please enter the facilitator code', 401);
}

export function publicOrigin(req: Request) {
  return (process.env.SITE_URL || new URL(req.url).origin).replace(/\/$/, '');
}
