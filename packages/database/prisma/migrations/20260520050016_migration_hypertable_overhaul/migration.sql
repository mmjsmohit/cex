-- 1. Safely drop the foreign key on Fills if it exists
ALTER TABLE IF EXISTS "Fills" DROP CONSTRAINT IF EXISTS "Fills_originalOrderId_originalOrderTimestamp_fkey";

-- 2. Drop the old OrderHistory table if it is sitting around as a hypertable/table
DROP TABLE IF EXISTS "OrderHistory" CASCADE;

-- 3. Recreate OrderHistory cleanly as a standard PostgreSQL table
CREATE TABLE "OrderHistory" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "type" "OrderType" NOT NULL,
    "side" "TradeSide" NOT NULL,
    "userId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderHistory_pkey" PRIMARY KEY ("id")
);

-- 4. Add the standard relationships cleanly
ALTER TABLE "OrderHistory" ADD CONSTRAINT "OrderHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderHistory" ADD CONSTRAINT "OrderHistory_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Re-align the Fills primary key mapping to support time partitioning
ALTER TABLE "Fills" DROP CONSTRAINT IF EXISTS "Fills_pkey";
ALTER TABLE "Fills" ADD CONSTRAINT "Fills_pkey" PRIMARY KEY ("id", "timestamp");

-- 6. Turn the clean Fills table into your tracking hypertable
SELECT create_hypertable('"Fills"', 'timestamp', if_not_exists => TRUE);
