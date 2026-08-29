# iPhone Order Console

A small internal tool for managing second-hand/new iPhone orders: search, filter,
inline status edits, add/edit/delete orders, all backed by Supabase (Postgres + Auth).

Stack: plain HTML/CSS/JS (no build step) + Supabase. Deployed as a static site on
Vercel. This is intentionally "boring" tech — no framework to install, no build
pipeline to break, easy to review in a hiring-manager demo, and every piece maps
directly onto something you can explain in a security review.

## 1. Create the Supabase project (~10 min)

1. Go to https://supabase.com → New project (free tier).
2. Once it's up, open **SQL Editor → New query**, paste the contents of
   `schema.sql`, and run it. This creates the `orders` table, the audit log,
   Row Level Security policies, and seeds 100 demo orders.
3. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon / public key** (NOT the `service_role` key — never use that one here)
4. Paste both into `public/config.js`.
5. Go to **Authentication → Providers → Email** and turn on "Email" sign-in.
   Turn OFF "Confirm email" only if you want to create test accounts instantly;
   leave it ON for anything resembling production.
6. Go to **Authentication → Users** and manually create 1–2 staff accounts
   (or use the sign-up flow) so you have something to log in with for the demo.

## 2. Turn on bot protection (Cloudflare Turnstile, free)

1. Go to https://dash.cloudflare.com/?to=/:account/turnstile → add a site,
   get a **Site key** and **Secret key**.
2. In `public/index.html`, replace `YOUR_TURNSTILE_SITE_KEY` with your site key.
3. In Supabase: **Authentication → Attack Protection → Enable Captcha protection**,
   choose Turnstile, paste in the **Secret key**. This makes Supabase verify the
   token server-side before allowing sign-in — the frontend widget alone isn't
   enough protection on its own.

## 3. Deploy (Vercel, free tier, ~5 min)

```bash
npm i -g vercel      # one-time
cd iphone-orders
vercel --prod
```
Point Vercel's project root at this folder (it will auto-detect `public/` as
static output). Vercel gives you HTTPS automatically and redirects HTTP → HTTPS,
so no extra config is needed there.

Send your hiring manager the resulting `https://your-project.vercel.app` URL.

## 4. Turn on backups & alerts (Supabase + Vercel dashboards, ~5 min)

- **Supabase → Project Settings → Backups**: daily backups are on by default
  on paid plans; the free tier keeps ~7 days of point-in-time data but doesn't
  let you restore automatically — for anything beyond a demo, upgrade to Pro
  ($25/mo) for real daily backups + PITR, or add a scheduled `pg_dump` via a
  GitHub Action as a free workaround.
- **Supabase → Reports / Billing → set a spend cap and usage alert** (so you're
  emailed if traffic spikes unexpectedly — often the first sign of an attack).
- **Vercel → Project → Settings → Usage Alerts**: same idea, for bandwidth/requests.

---

## Security checklist — what's implemented and where

| Requirement | Implementation |
|---|---|
| Force HTTPS | Vercel serves everything over HTTPS and redirects HTTP automatically; `vercel.json` also sets `Strict-Transport-Security` so browsers refuse to fall back to HTTP even if someone types it. |
| Passwords hashed, not plaintext | Handled entirely by Supabase Auth (GoTrue) — passwords are hashed with bcrypt server-side; the app never sees or stores a plaintext password. |
| Bot protection on signup/login | Cloudflare Turnstile widget on the login form, verified server-side by Supabase's Attack Protection setting (see step 2). |
| Sessions expire (stolen token doesn't work forever) | Supabase issues short-lived JWT access tokens (default 1 hour) plus a refresh token; `autoRefreshToken` keeps a real user logged in, but a copied access token alone goes stale within the hour. Session lifetime is tunable in Supabase Auth settings. |
| CSRF protection | Supabase Auth uses bearer tokens in the `Authorization` header (not cookies) for API calls, which are immune to classic CSRF (a malicious site can't attach your token to its own request). The login form itself only ever runs same-origin JS. |
| Password reset links expire and work once | Built into Supabase Auth — recovery links are single-use and time-limited (default 1 hour), no custom code needed. |
| Database key is limited, not master key | `public/config.js` only ever contains the **anon/public** key. All real access control is enforced by Postgres Row Level Security in `schema.sql` — the anon key can't read or write anything the RLS policies don't explicitly allow, even if someone copies it out of the page source (which they're meant to be able to do). |
| Logs don't leak secrets | `app.js` never logs request bodies, tokens, or form values — only generic error text (`error.message`) from Supabase, which doesn't include credentials. Turn off "verbose" logging in Vercel for production. |
| Billing/attack alerts | Usage alerts + spend cap on both Supabase and Vercel (step 4) — a traffic or cost spike gets emailed to you, which is often the first sign of scraping or a credential-stuffing attempt. |
| Automated backups | Supabase's built-in daily backup (Pro tier) or a scheduled GitHub Action running `pg_dump` on the free tier. |
| Audit trail | `orders_audit` table + trigger in `schema.sql` records every insert/update/delete with who and when — useful both for security review and for "who changed this order" questions. |
| Input handling | All user-entered text is HTML-escaped before rendering (`esc()` in `app.js`) to prevent stored XSS from a name or address field; a `Content-Security-Policy` header on both pages restricts what scripts/frames can run at all. |
| Account enumeration | Login errors always say "Invalid email or password" rather than revealing whether the email exists. |

### Known limitations, worth naming to your hiring manager

- RLS policies currently allow **any authenticated user** to edit/delete
  **any** order (there's no per-role restriction yet). For a real deployment,
  add a `staff` table with roles and tighten the `using`/`with check` clauses
  in `schema.sql` — the comment is already there showing where.
- Rate limiting on login attempts is handled by Supabase's built-in Attack
  Protection, but for a production app you'd also want a WAF (Cloudflare in
  front of Vercel is a common, free-tier-friendly choice).
- This is a demo-scale app (100 orders, a handful of staff users) — it hasn't
  been load-tested or penetration-tested.
