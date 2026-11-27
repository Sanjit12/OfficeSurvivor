# Contributing to Office Survivor

Thanks for contributing to Office Survivor!

## Development Setup

1. Install dependencies (Node.js 20+ recommended):

```bash
npm install
```

2. Start the local dev server on `http://localhost:3000`:

```bash
npm run dev
```

3. Optional: preview the production build locally inside Cloudflare Workers:

```bash
npm run cf:dev
```

## Before Opening a Pull Request

Run all checks locally so CI passes cleanly:

```bash
npm run lint
npm test
npm run build
```

- Keep game simulation logic inside `src/game/` pure and unit-tested (`src/game/rules.test.ts`).
- Keep Three.js rendering and procedural 3D models inside `src/scene/`.
- Keep HUD/UI state and custom SVG assets inside `src/ui/`.
- Do not commit secrets, `.env` files, `dist/`, or `.wrangler/`.
