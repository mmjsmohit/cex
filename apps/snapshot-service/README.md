# snapshot-service

Background worker that persists order snapshots emitted by the spot matching engine. It consumes Redis messages from `snapshot-queue` and writes order history plus fill records through `@repo/db`.

## Responsibilities

- Listen for order snapshots from `apps/engine`.
- Check whether an order already exists in the database.
- Create `OrderHistory` records for new order snapshots.
- Create nested fill records for fills included in a snapshot payload.

## Runtime

- Runtime: Bun
- Database client: `@repo/db`
- Queue transport: Redis through Bun's `redis` global

## Environment variables

- `DATABASE_URL`: Postgres connection string used by `@repo/db`.
- `REDIS_URL`: Redis connection string used by Bun's Redis client.

## Development

Install dependencies from the repository root with `bun install`, then run this app with `bun --filter snapshot-service dev` or `bun run dev` from `apps/snapshot-service`.

The `dev` script loads values from the root `.env` file.

## Consumed queues

- `snapshot-queue`: Contains serialized order payloads from the matching engine.

Expected payload fields include:

- `orderId`
- `userId`
- `quantity`
- `price`
- `orderType`
- `tradeSide`
- `market.id`
- `createdAt`
- `fills`

## Database writes

For new orders, the worker creates an `OrderHistory` row and nested `Fills` rows derived from the order's `fills` array. The current `getOrderStatus` implementation always returns `FILLED`, so partial/open/cancelled status persistence should be revisited as the matching workflow matures.

## Related services

- `apps/engine`: Produces snapshots.
- `packages/database`: Provides Prisma schema, generated types, and client.
