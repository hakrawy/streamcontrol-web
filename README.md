# StreamControl Web

`StreamControl Web` is a standalone web project that mirrors the current StreamControl application across its public pages, tabs, admin sections, content detail screens, player, login, profile, watchlist, live channels, and watch room flows.

This repository is intentionally separated from the mobile app so it can live in its own private GitHub repository while deploying a public website from the same codebase.

## Included Screens

- Home
- Search
- Live
- Watchlist
- Profile
- Login
- Player
- Watch Room
- Content details
- Settings pages
- Admin dashboard
- Admin users
- Admin movies
- Admin series
- Admin channels
- Admin banners
- Admin settings

## Local Development

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run lint
npm run export:web
```

## Environment Variables

Create `.env` based on `.env.example`:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

## GitHub Pages Deployment

This repository already includes a GitHub Actions workflow that exports the Expo web build and deploys the generated `dist` output to GitHub Pages.

Required GitHub Actions secrets:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Notes

- The UI and feature structure intentionally stay aligned with the current app.
- Some internal template modules still use the original upstream naming, but the web project itself is configured and documented as `StreamControl Web`.
