# web

Next.js web client for exercising and visualizing the CEX backend. The app provides a browser UI for authentication, a market-picker hub, a routed SPOT console, and a routed PERP console with mock price controls.

## Responsibilities

- Render the auth hub and market-picker interface.
- Render the SPOT market console at `/spot/[marketId]`.
- Render the PERP market console at `/perp/[marketId]`.
- Store the signed-in JWT in browser local storage.
- Proxy API calls to `apps/backend` through a Next.js route handler.
- Proxy mock price updates to `apps/exchange-price-mocker`.
- Display assets, markets, orders, collateral/equity, and market depth.
- Connect to `apps/ws` and `apps/perps-ws` for realtime depth updates.

## Runtime

- Framework: Next.js 16 App Router
- React: 19
- Shared UI dependency: `@repo/ui`
- Shared lint/config dependencies: `@repo/eslint-config`, `@repo/typescript-config`

## Environment variables

- `BACKEND_URL`: Backend base URL used by `app/api/debug/[...path]/route.ts`. Defaults to `http://localhost:3000`.
- `NEXT_PUBLIC_WS_URL`: Public websocket URL used by the browser. Defaults in the app to `ws://localhost:4000`.
- `NEXT_PUBLIC_PERPS_WS_URL`: Public PERP websocket URL used by the browser. Defaults in the app to `ws://localhost:4001`.
- `EXCHANGE_PRICE_MOCKER_URL`: Backend URL used by `app/api/mocker/forward-price/route.ts`. Defaults to `http://localhost:6000`.

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

The route handler at `app/api/mocker/forward-price/route.ts` proxies `POST /forward-price` to the exchange-price-mocker so the browser can update PERP mock prices through the same origin.

## Realtime depth

The web app connects to the websocket server using the selected market ID. It fetches initial depth through the backend and then updates the displayed book from websocket messages published by `apps/ws` for SPOT and `apps/perps-ws` for PERP.

## Related services

- `apps/backend`: HTTP API target for the proxy route.
- `apps/ws`: WebSocket server for depth updates.
- `apps/perps-ws`: WebSocket server for PERP depth updates.
- `apps/exchange-price-mocker`: Mock exchange feed used to update PERP index prices.
- `apps/engine`: Source of order-book state and updates.
