# ws

WebSocket broadcaster for realtime spot market depth updates. This app accepts websocket connections for a specific market and publishes Redis order-book updates to subscribed clients.

## Responsibilities

- Accept Bun websocket upgrades with a `marketId` query parameter.
- Subscribe each websocket connection to the requested market channel.
- Fetch and send initial depth from the backend when a client connects.
- Consume Redis `order-updates` messages from the engine.
- Broadcast each update to clients subscribed to the matching market ID.

## Runtime

- Runtime: Bun
- WebSocket server: `Bun.serve`
- Queue transport: Redis through Bun's `redis` global

## Environment variables

- `PORT`: WebSocket server port. Defaults to `4000`.
- `REDIS_URL`: Redis connection string used by Bun's Redis client.
- `BACKEND_URL`: Backend base URL used to fetch initial depth.

## Development

Install dependencies from the repository root with `bun install`, then run this app with `bun --filter ws dev` or `bun run dev` from `apps/ws`.

Start Redis, `apps/backend`, and `apps/engine` before using this service for live updates.

## Connection format

Connect to the server with a market ID query parameter:

- `ws://localhost:4000?marketId=<market-id>`

If `marketId` is missing, the server rejects the upgrade.

## Consumed queues

- `order-updates`: Messages emitted by `apps/engine` after order-book changes.

Each message is expected to include:

- `marketId`: Channel to broadcast to.
- `currentMarketDepth`: Updated depth payload.

## Backend dependency

On websocket open, the server calls `GET <BACKEND_URL>/depth/<marketId>` and sends the returned payload to the client as the initial book snapshot.
