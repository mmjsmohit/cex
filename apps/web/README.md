# web

Next.js web client for exercising and visualizing the CEX backend. The app provides a browser UI for authentication, asset and market creation, balance updates, order placement, order lookup, and realtime depth display.

## Responsibilities

- Render the main CEX debug/trading interface.
- Store the signed-in JWT in browser local storage.
- Proxy API calls to `apps/backend` through a Next.js route handler.
- Display assets, markets, orders, and market depth.
- Connect to `apps/ws` for realtime depth updates.

## Runtime

- Framework: Next.js 16 App Router
- React: 19
- Shared UI dependency: `@repo/ui`
- Shared lint/config dependencies: `@repo/eslint-config`, `@repo/typescript-config`

## Environment variables

- `BACKEND_URL`: Backend base URL used by `app/api/debug/[...path]/route.ts`. Defaults to `http://localhost:3000`.
- `NEXT_PUBLIC_WS_URL`: Public websocket URL used by the browser. Defaults in the app to `ws://localhost:4000`.

## Development

Install dependencies from the repository root with `bun install`, then run this app with `bun --filter web dev` or `bun run dev` from `apps/web`.

The development server listens on port `3001`.

## Scripts

- `dev`: Starts Next.js on port `3001`.
- `build`: Builds the production Next.js app.
- `start`: Starts the production server.
- `lint`: Runs ESLint with zero warnings allowed.
- `check-types`: Generates Next.js types and runs TypeScript with `--noEmit`.

## API proxy

The route handler at `app/api/debug/[...path]/route.ts` forwards requests to the backend while preserving:

- HTTP method
- Query string
- `Authorization` header
- `Content-Type` header
- Request body for non-GET/HEAD methods

This allows the frontend to call `/api/debug/<backend-path>` without hardcoding backend URLs in browser code.

## Realtime depth

The web app connects to the websocket server using the selected market ID. It fetches initial depth through the backend and then updates the displayed book from websocket messages published by `apps/ws`.

## Related services

- `apps/backend`: HTTP API target for the proxy route.
- `apps/ws`: WebSocket server for depth updates.
- `apps/engine`: Source of order-book state and updates.
