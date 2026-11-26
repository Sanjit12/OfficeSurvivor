# Office Survivor

A 3D browser-playable corporate roguelite built with Three.js, Vite, and TypeScript. Survive a 5-day launch across a 10-room corporate tower using selectable office-item weapons, third-person or first-person views, and permanent upgrades.

## Local Development

```bash
npm install
npm run dev
```

Runs the Vite dev server on `http://localhost:3000`.

## Deploying to Cloudflare Workers

This project is configured for **Cloudflare Workers Static Assets** via `wrangler.jsonc`, serving the compiled Vite bundle (`./dist`) directly from Cloudflare's edge with SPA routing and caching/security headers (`public/_headers`).

### Option 1: Deploy via Wrangler CLI

```bash
npx wrangler login
npm run deploy
```

To test the production bundle locally in Cloudflare's Workers runtime before deploying:

```bash
npm run cf:dev
```

### Option 2: Cloudflare Dashboard Git Integration

Connect your repository in **Workers & Pages -> Create -> Workers** with:

- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`
- **Root directory:** `/`

## Scripts

- `npm run dev` — Start Vite dev server on port 3000
- `npm run build` — Build production bundle to `./dist`
- `npm run cf:dev` — Build and preview locally inside Wrangler
- `npm run deploy` — Build and deploy to Cloudflare Workers
- `npm run lint` — Run TypeScript typechecking (`tsc --noEmit`)
- `npm test` — Run game simulation unit tests
