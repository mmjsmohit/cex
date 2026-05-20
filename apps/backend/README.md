# backend

HTTP API service for the CEX Turborepo. This app exposes authentication, asset, market, balance, order, fill, and order-book depth endpoints. It stores durable reference data in Postgres through `@repo/db` and delegates matching/balance operations to the in-memory engine over Redis queues.

## Responsibilities

- Register and authenticate users with bcrypt password hashes and JWTs.
- Manage assets and spot markets persisted by Prisma.
- Accept spot order and balance requests from authenticated users.
- Push asynchronous work to Redis queues consumed by `apps/engine`.
- Wait for correlated loopback responses from engine-specific response queues.
- Read historical open orders and fills from the database.

## Runtime

- Runtime: Bun
- Web framework: Express 5
- Database client: `@repo/db`
- Queue transport: Redis through Bun's `RedisClient`

## Environment variables

- `PORT`: HTTP port. Defaults to `3000`.
- `DATABASE_URL`: Postgres connection string used by `@repo/db`.
- `REDIS_URL`: Redis connection string used for queue publishing/listening.
- `JWT_SECRET`: Secret used to sign and verify auth tokens.

## Development

Install dependencies from the repository root with `bun install`, then run this app with `bun --filter backend dev` or `bun run dev` from `apps/backend`.

The `dev` script loads environment values from the root `.env` file.

## Main endpoints

### Health

- `GET /health`: Returns `OK` when the service is up.

### Authentication

- `POST /signup`: Creates a user. Body: `username`, `name`, `password`.
- `POST /signin`: Authenticates a user. Body: `username`, `password`. Returns a JWT.

Protected routes expect `Authorization: Bearer <jwt>`.

### Assets and markets

- `POST /assets`: Creates an asset. Body: `name`, `symbol`, `logo`.
- `GET /assets`: Lists assets.
- `POST /markets`: Creates a market. Body: `baseAssetId`, `quoteAssetId`.
- `GET /markets`: Lists markets.

### Balances

- `POST /balance`: Adds an in-memory engine balance. Body: `assetId`, `assetAmount`.
- `GET /balance`: Gets all in-memory engine balances for the signed-in user.
- `GET /balance/usd`: Gets the signed-in user's USD-style balance payload from the engine.

### Orders and depth

- `POST /order`: Creates an order through the engine. Body: `market_id`, `price`, `quantity`, `trade_side`, `order_type`.
- `GET /orders`: Gets all open in-memory engine orders for the signed-in user.
- `GET /orders/open`: Gets open persisted orders from the database.
- `GET /order/:orderId`: Gets one in-memory engine order for the signed-in user.
- `DELETE /order/:orderId`: Attempts to cancel one in-memory engine order for the signed-in user.
- `GET /depth/:marketId`: Gets aggregated order-book depth from the engine.
- `GET /fills`: Gets persisted fills for the signed-in user.
- `GET /candles`: Gets OHLCV candles from persisted fills. Query: `marketId`, `interval` (`1m`, `5m`, `15m`, `1h`, `1d`), `from`, `to`, optional `marketType` (`SPOT` or `PERP`).

## Redis queues

- Publishes order work to `incoming-orders`.
- Publishes balance work to `balance`.
- Listens on `response-queue-<QUEUE_ID>` for correlated engine responses.

`src/loopbackResponse.ts` owns the process-local `QUEUE_ID` and response resolver map.

## Related services

- `apps/engine`: Consumes spot order and balance queues.
- `apps/snapshot-service`: Persists order snapshots emitted by the engine.
- `apps/ws`: Broadcasts order-book updates to websocket clients.
- `packages/database`: Provides Prisma client and schema types.
