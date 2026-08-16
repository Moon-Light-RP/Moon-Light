# MOON LIGHT — Vercel + Supabase

## Vercel Environment Variables

Set these for Production (and Preview if needed):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; never commit it to GitHub.
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET` — server-only; never commit it to GitHub.
- `DISCORD_REDIRECT_URI` — exact callback URL, for example `https://YOUR-DOMAIN.vercel.app/auth/discord/callback`.
- `SESSION_SECRET` — random, at least 32 characters.

Do not put `.env` in GitHub.

## Supabase

Run `supabase-schema.sql` once in Supabase SQL Editor.

The Vercel server talks to Supabase with the service-role key. The browser never receives that key.

## Discord

Add the exact value of `DISCORD_REDIRECT_URI` under the Discord application's OAuth2 Redirects.

## Deployment

This project uses an Express app exported for Vercel. Vercel can deploy Express with zero configuration; `vercel.json` only declares the config version.
