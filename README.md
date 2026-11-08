# CLA Youth Portal

QR check-in for youth programmes, with an admin dashboard that tracks attendance and shows leadership who to follow up with.

**Programmes:** Faith Forward · True North · Campus Fusion · 119

Built with Next.js (App Router) and Neon Postgres. Live at https://cla-youth-portal.vercel.app

## How it works

1. A young person scans the **main QR code**, which lists every programme, or a **programme's own QR code**.
2. They tap their programme, then enter their name and, if they want to, a phone number. Their phone remembers them, so next time it's one tap.
3. The first check-in of the day creates that day's **session** for the programme. No leader has to set anything up.
4. The **dashboard** updates live.

Printable QR codes are in `qr-codes/` and under **Admin → QR codes**, which also has poster versions.

Leaders can add, rename, recolour or retire programmes under **Admin → Programmes**, and can close today's check-in for a programme with the switch on its card.

## What the dashboard tells you

| Metric | Meaning |
| --- | --- |
| **Attendance %** | Sessions attended ÷ sessions of *their* programmes since they first came to each. Newcomers don't look absent from things before they joined. |
| **Missed in a row** | How many of the latest sessions of their programmes they've missed. This is the main signal for follow-up and counselling. |
| **Consistent / Slipping / Needs follow-up** | Based on missed-in-a-row against the threshold (default 3). "Slipping" is one short of the threshold. |
| **Here today** | Live count of check-ins today. |

Leaders can also add pastoral **notes**, **call or WhatsApp** a person in one tap, **merge** duplicate records, and **export to CSV**.

## Setup

### 1. Create the Neon database
1. Create a project at [neon.tech](https://neon.tech).
2. Copy the **pooled connection string** from *Connection Details*.

### 2. Configure
```bash
cp .env.example .env.local
# then edit .env.local: DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET (openssl rand -hex 32)
```

### 3. Install, create the tables, and run
```bash
npm install
npm run db:migrate
npm run dev
```
- Check-in page: http://localhost:3000
- Admin: http://localhost:3000/admin

To test on a phone on the same Wi-Fi, open `http://<your-computer's-IP>:3000`. QR codes use whatever address you opened the admin with, or `SITE_URL` if you set it.

## Deploying (Vercel)

1. Push this repo to GitHub and import it into Vercel.
2. Add the environment variables from `.env.example` in Vercel's project settings. Set `SITE_URL` to your live address so printed QR codes always point there.
3. Run `npm run db:migrate` once against the production `DATABASE_URL`.

You can also connect Neon through Vercel's Neon integration, which sets `DATABASE_URL` for you.

## Project layout

```
app/
  page.tsx, c/[code]/page.tsx   check-in (general / per-programme)
  admin/login                    leader sign-in
  admin/(panel)/                 dashboard, programmes, members, QR poster
  api/checkin                    public check-in endpoint
  api/admin/*                    admin endpoints (all require sign-in)
components/                      CheckIn form, admin nav, shared UI bits
lib/
  analytics.ts                   attendance %, missed-in-a-row, status
  db.ts                          Neon client
  auth.ts                        signed-cookie admin session
db/schema.sql                    tables (applied by npm run db:migrate)
```

## Changing things

- **Programmes:** Admin → Programmes (name, description, schedule, colour, icon)
- **When someone gets flagged:** `FOLLOW_UP_AFTER` in env (the dashboard dropdown can also change it on the fly)
- **Timezone used for "today":** `APP_TIMEZONE` (default `Africa/Lagos`)
