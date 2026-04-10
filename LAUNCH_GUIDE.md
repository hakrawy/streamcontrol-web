# StreamControl Web Launch Guide

This repository is the standalone web version of StreamControl. It keeps the same routes, sections, and product flows as the current app while staying isolated in its own deployable project.

## 1. Environment

Create `.env` from [`.env.example`](C:/Users/ALI/Desktop/StreamControl-web/.env.example):

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Notes:

- `EXPO_PUBLIC_SUPABASE_ANON_KEY` is client-safe and required by the web app.
- `SUPABASE_SERVICE_ROLE_KEY` is only needed for local content import scripts and must never be exposed publicly.
- `.env` stays ignored by git.

## 2. Install And Run

```bash
npm install
npm run lint
npm run dev
```

If PowerShell blocks `npm`, use:

```bash
npm.cmd install
npm.cmd run lint
npm.cmd run dev
```

## 3. Export Static Web Build

```bash
npm run export:web
```

The generated site is written to `dist/`.

## 4. GitHub Pages Deployment

This repository includes [deploy-pages.yml](C:/Users/ALI/Desktop/StreamControl-web/.github/workflows/deploy-pages.yml).

Before pushing to GitHub:

1. Create a private repository for this project.
2. Add these repository secrets in `Settings > Secrets and variables > Actions`:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. In `Settings > Pages`, choose `GitHub Actions` as the source.

After every push to `main` or `master`, GitHub Actions will export the site and deploy it publicly.

## 5. Supabase SQL Files

Use these files if you are provisioning a fresh backend:

- [`supabase/schema.sql`](C:/Users/ALI/Desktop/StreamControl-web/supabase/schema.sql)
- [`supabase/seed.sql`](C:/Users/ALI/Desktop/StreamControl-web/supabase/seed.sql)

## 6. Included Product Areas

- Public home and discovery pages
- Search and browsing
- Live channels
- Watchlist
- User profile
- Login and auth flows
- Content detail pages
- Player
- Watch rooms
- Admin dashboard and admin sections

## 7. Content Templates

- [`content-templates/README.md`](C:/Users/ALI/Desktop/StreamControl-web/content-templates/README.md)
- [`content-templates/movies.csv`](C:/Users/ALI/Desktop/StreamControl-web/content-templates/movies.csv)
- [`content-templates/series.csv`](C:/Users/ALI/Desktop/StreamControl-web/content-templates/series.csv)
- [`content-templates/episodes.csv`](C:/Users/ALI/Desktop/StreamControl-web/content-templates/episodes.csv)
- [`content-templates/channels.csv`](C:/Users/ALI/Desktop/StreamControl-web/content-templates/channels.csv)
- [`content-templates/banners.csv`](C:/Users/ALI/Desktop/StreamControl-web/content-templates/banners.csv)

Import commands:

```bash
npm run import:content:dry
npm run import:content
```
