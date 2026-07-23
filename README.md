# FRI Live Status

A clean Roblox status dashboard for FRI experiences and developer presence.

## Run

```bash
node server.js
```

Open http://localhost:3000.

The dashboard refreshes from Roblox every minute in the browser. The local API caches Roblox responses for 30 seconds so quick refreshes stay smooth.

The Current Tracker keeps the original six FRI experiences. The separate ER:LC Tracker page tracks nine private development and testing experiences, and the header switch moves between the two boards.

## Deploy

Vercel needs the `api/dashboard.js` serverless function. If `/api/dashboard` returns 404 after publishing, redeploy the project from the repository root so Vercel includes both `public/` and `api/`.
