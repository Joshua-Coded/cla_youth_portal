export const ORG_NAME = process.env.NEXT_PUBLIC_ORG_NAME || 'CLA Youth';

export const ICONS = ['arrow', 'compass', 'spark', 'book', 'star', 'heart', 'music', 'users', 'flame', 'globe'] as const;
export const COLORS = ['#7c5cff', '#0ea5e9', '#f97316', '#10b981', '#ec4899', '#eab308', '#ef4444', '#6366f1'];

export type Programme = {
  id: number;
  name: string;
  tagline: string | null;
  schedule: string | null;
  color: string;
  icon: string;
  code: string;
  is_active: boolean;
  sort_order: number;
};

export type Status = 'active' | 'at-risk' | 'follow-up';
export const STATUS_LABEL: Record<Status, string> = {
  active: 'Consistent',
  'at-risk': 'Slipping',
  'follow-up': 'Needs follow-up',
};

export const ROLES = ['member', 'facilitator', 'leader'] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABEL: Record<Role, string> = { member: 'Young person', facilitator: 'Facilitator', leader: 'Leader' };
export const isRole = (v: unknown): v is Role => ROLES.includes(v as Role);

/** The dashboard looks at young people and the serving team separately */
export type Audience = 'youth' | 'team';
export const inAudience = (role: string, audience: Audience) => (audience === 'youth') === (role === 'member');

/** Only this programme is split into classes with a facilitator roll call */
export const CLASS_PROGRAMME_CODE = 'faith-forward';
