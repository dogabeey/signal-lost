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
hosting provider. Future multiplayer rooms and analytics endpoints belong under
`server/src/`.
