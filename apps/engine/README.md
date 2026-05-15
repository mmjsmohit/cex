# engine

In-memory spot matching engine for the CEX Turborepo. The engine consumes Redis requests from the backend, maintains process-local balances and order books, executes matching logic, and emits responses and order-book updates.

## Responsibilities

- Maintain spot order books by market in memory.
- Maintain user asset balances and locked balances in memory.
- Process limit and market buy/sell orders.
- Aggregate market depth for HTTP and websocket consumers.
- Respond to backend loopback queues with request results.
- Emit order snapshots to `apps/snapshot-service` for persistence.
- Emit order-book updates to `apps/ws` for realtime broadcasting.

## Runtime

- Runtime: Bun
- Queue transport: Redis through Bun's `RedisClient`
- Persistence: none directly; snapshot events are emitted for `apps/snapshot-service`

## Environment variables

- `REDIS_URL`: Redis connection string.

## Development

Install dependencies from the repository root with `bun install`, then run this app with `bun --filter engine dev` or `bun run dev` from `apps/engine`.

Start Redis before launching this service. The backend should also be running for request production and loopback responses.

## In-memory state

- `BALANCES`: Maps user IDs to asset balance arrays. Each balance tracks available and locked amounts.
- `ORDERBOOK`: Maps market IDs to bid/ask books and `lastTradedPrice`.

This state is process-local and is lost on restart. Durable order snapshots are delegated to `snapshot-queue`.

## Consumed queues

The engine blocks on Redis with `BRPOP` against:

- `incoming-orders`: Order lifecycle and depth requests.
- `balance`: Balance mutation and lookup requests.

Supported `requestType` values include:

- `create_order`
- `get_depth`
- `get_order`
- `delete_order`
- `get_all_orders`
- `get_balance`
- `get_usd_balance`
- `add_balance`

## Published queues

- `response-queue-<queue_id>`: Sends correlated responses back to the backend process that submitted the request.
- `snapshot-queue`: Sends completed or accepted order payloads for database persistence.
- `order-updates`: Sends current market depth updates for websocket broadcasting.

## Matching behavior

`src/matching.ts` contains the matching entry points:

- `processLimitBuy`
- `processLimitSell`
- `processMarketBuy`
- `processMarketSell`

Limit orders lock the required asset before matching. Unfilled limit order quantity rests on the relevant side of the book. Market orders require enough opposite-side liquidity before execution.

## Depth generation

`src/depth.ts` groups bids and asks by price, sorts them, and calculates cumulative totals for display in the web app and websocket updates.

## Related services

- `apps/backend`: Produces engine requests and waits for responses.
- `apps/snapshot-service`: Persists snapshots from `snapshot-queue`.
- `apps/ws`: Broadcasts `order-updates` to websocket subscribers.
