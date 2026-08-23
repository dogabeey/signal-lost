# Asteroid Belt multiplayer foundation

This folder is deliberately server-only. The browser build does not currently
include a multiplayer button, matchmaking, room handling, or networked gameplay.

## Run locally

```powershell
cd server
npm install
npm run dev
```

The server listens on port `2567` by default. Set `PORT` when deploying it to a
hosting provider.

## Product analytics

The `POST /analytics/event` endpoint accepts the currently supported
`tier_started` event and forwards it to PostHog. Keep the PostHog project token
server-side in `server/.env`:

```env
POSTHOG_PROJECT_TOKEN=phc_your_project_token
POSTHOG_HOST=https://eu.i.posthog.com
ANALYTICS_ALLOWED_ORIGINS=http://localhost:5173,https://html-classic.itch.zone
```

Set `VITE_ANALYTICS_ENDPOINT` to the deployed endpoint before building the
browser game, for example:

```powershell
$env:VITE_ANALYTICS_ENDPOINT = 'https://your-server.example.com/analytics/event'
npm run build
```

The browser only sends an anonymous per-tab session ID, tier, build version and
platform. It never receives the PostHog project token.
