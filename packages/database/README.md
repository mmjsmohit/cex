# @repo/db

Shared database package for the CEX Turborepo. It owns the Prisma schema, generated client output, and a reusable Prisma client instance configured for PostgreSQL through `@prisma/adapter-pg`.

## Responsibilities

- Define database models and enums in `prisma/schema.prisma`.
- Generate Prisma client code into `generated/prisma`.
- Export a shared `prisma` client from `src/client.ts`.
- Re-export generated Prisma types and enums from `src/index.ts`.
- Provide migration scripts for local development and deployment.

## Runtime

- Database: PostgreSQL
- ORM: Prisma 7
- Adapter: `@prisma/adapter-pg`
- Environment loader: `dotenv`

## Environment variables

- `DATABASE_URL`: Required PostgreSQL connection string.

`src/client.ts` throws at import time if `DATABASE_URL` is missing.

## Development

Install dependencies from the repository root with `bun install`.

Common commands from this package or through Turborepo filters:

- `bun --filter @repo/db db:generate`: Generate the Prisma client.
- `bun --filter @repo/db db:migrate`: Run development migrations.
- `bun --filter @repo/db db:deploy`: Apply migrations in deployment environments.

## Railway TimescaleDB setup

For a fresh Railway TimescaleDB service, enable Timescale before applying Prisma migrations:

```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

If the image includes Timescale Toolkit, this optional extension can also be enabled for future candlestick hyperfunctions:

```sql
CREATE EXTENSION IF NOT EXISTS timescaledb_toolkit;
```

Apply the schema from the repo root with the Railway public database URL:

```bash
DATABASE_URL="<railway-public-db-url>" bun --filter @repo/db db:deploy
DATABASE_URL="<railway-public-db-url>" bun --filter @repo/db db:generate
```

Confirm the fills table is a hypertable and keeps the time column in its primary key:

```sql
SELECT hypertable_name
FROM timescaledb_information.hypertables
WHERE hypertable_name = 'Fills';

SELECT indexdef
FROM pg_indexes
WHERE tablename = 'Fills' AND indexname = 'Fills_pkey';
```

The current migration history includes a fresh-instance hypertable overhaul that drops and recreates `OrderHistory`; do not apply it blindly to a populated production database.

## Exports

The package exports `src/index.ts`, which provides:

- `prisma`: Shared Prisma client instance.
- Generated Prisma types and enums, including `OrderStatus`, `OrderType`, `TradeSide`, and `LiquidType`.

Example internal import style: `import { prisma, OrderStatus } from "@repo/db"`.

## Schema overview

Main models:

- `User`: Authentication identity and relations to balances, orders, and fills.
- `Asset`: Tradable asset metadata.
- `Market`: Pair of base and quote assets.
- `userAssetBalance`: Persisted user asset balance model.
- `OrderHistory`: Persisted user order intent/history.
- `Fills`: Persisted execution records.

Main enums:

- `TradeSide`: `BUY`, `SELL`
- `OrderType`: `LIMIT`, `MARKET`
- `LiquidType`: `MAKER`, `TAKER`
- `OrderStatus`: `OPEN`, `FILLED`, `PARTIAL`, `CANCELLED`

## Consumers

- `apps/backend`: Reads/writes users, assets, markets, open orders, and fills.
- `apps/snapshot-service`: Persists order snapshots and fills from the engine.
