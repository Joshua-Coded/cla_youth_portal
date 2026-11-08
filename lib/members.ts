import { sql } from './db';
import { nameKey } from './clean';
import type { Role } from './config';

export type MemberRow = { id: number; full_name: string; phone: string | null; role: Role };

/**
 * Match by phone first, then by name. A same-name record with a different phone is a different person.
 * Pass a role to update it (self check-in); leave it out when someone else is adding the person.
 */
export async function findOrCreateMember(fullName: string, phone: string | null, role?: Role): Promise<MemberRow> {
  const key = nameKey(fullName);
  let member: MemberRow | undefined;
  if (phone) [member] = (await sql`SELECT * FROM members WHERE phone = ${phone} ORDER BY id LIMIT 1`) as MemberRow[];
  if (!member) {
    [member] = (await sql`SELECT * FROM members WHERE name_key = ${key} ORDER BY id LIMIT 1`) as MemberRow[];
    if (member && phone && member.phone && member.phone !== phone) member = undefined;
  }
  if (!member) {
    const [created] = await sql`INSERT INTO members (full_name, name_key, phone, role)
                                VALUES (${fullName}, ${key}, ${phone}, ${role ?? 'member'}) RETURNING *`;
    return created as MemberRow;
  }
  const nextRole = role ?? member.role;
  // Fill in a missing phone and follow role changes (e.g. a young person who becomes a facilitator)
  if ((phone && !member.phone) || member.role !== nextRole) {
    await sql`UPDATE members SET phone = COALESCE(phone, ${phone}), role = ${nextRole} WHERE id = ${member.id}`;
  }
  return { ...member, role: nextRole };
}
