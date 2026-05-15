import { COLLATERALS, PERP_POSITIONS } from ".";

import type {
  Market,
  OrderType,
  PerpOrder,
  TradeSide,
} from "./types/orderbook.types";
import { randomUUID } from "crypto";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForBackend(): Promise<
  {
    id: string;
    name: string;
    baseAssetId: string;
    quoteAssetId: string;
  }[]
> {
  const maxAttempts = 50;
  const delay = 500;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);

      if (response.ok) {
        console.log("Backend is up, fetching markets now");
        const marketsResponse = await fetch(`${BACKEND_URL}/markets`);
        return (await marketsResponse.json()) as {
          id: string;
          name: string;
          baseAssetId: string;
          quoteAssetId: string;
        }[];
      }

      console.log(
        `Waiting for backend with ${response.status}. Retrying ${i}/${maxAttempts}...`,
      );
    } catch (e) {
      console.log(
        `Error connecting to backend: ${e}. Retrying ${i}/${maxAttempts}...`,
      );
    }
    await sleep(delay);
  }

  throw new Error("Backend did not become available in time, exiting");
}

// Utility function for locking balances before an order is placed
export function lockCollateral(
  userId: string,
  assetId: string,
  amountToLock: number,
  marketId: string,
) {
  const userCollateral = getOrCreateAssetCollateral(userId, assetId);

  // Check if the user has enough balance to be locked.
  if (userCollateral.amount < amountToLock) {
    return false;
  }

  userCollateral.amount -= amountToLock;
  userCollateral.lockedAmount += amountToLock;
  return true;
}

export function consumeLockedCollateral(
  userId: string,
  assetId: string,
  amountToConsume: number,
) {
  const userCollateral = getOrCreateAssetCollateral(userId, assetId);
  if (userCollateral.lockedAmount < amountToConsume) {
    throw new Error("Insufficient locked collateral");
  }

  userCollateral.lockedAmount -= amountToConsume;
}

export function releaseLockedCollateral(
  userId: string,
  assetId: string,
  amountToRelease: number,
) {
  if (amountToRelease <= 0) return;

  const userCollateral = getOrCreateAssetCollateral(userId, assetId);
  const releasableAmount = Math.min(
    amountToRelease,
    userCollateral.lockedAmount,
  );
  userCollateral.lockedAmount -= releasableAmount;
  userCollateral.amount += releasableAmount;
}

export function matchPerpSwap(trade: {
  longerId: string;
  shorterId: string;
  quoteAsset: string;
  qty: number;
  price: number;
  orderType: OrderType;
  market: Market;
  longerLeverage: number;
  shorterLeverage: number;
}) {
  const {
    longerId,
    shorterId,
    quoteAsset,
    qty,
    price,
    market,
    longerLeverage,
    shorterLeverage,
  } = trade;

  const longerMargin = calculateInitialMargin(qty, price, longerLeverage);
  const shorterMargin = calculateInitialMargin(qty, price, shorterLeverage);

  consumeLockedCollateral(longerId, quoteAsset, longerMargin);
  consumeLockedCollateral(shorterId, quoteAsset, shorterMargin);

  // Entry price = matched price at the time of trade execution.
  const entryPrice = price;

  // TODO: Add maintenance margin requirement and fees to make liquidation math more realistic.
  const longerLiquidationPrice = entryPrice * (1 - 1 / longerLeverage);
  const shorterLiquidationPrice = entryPrice * (1 + 1 / shorterLeverage);

  upsertPosition({
    userId: longerId,
    market,
    tradeSide: "LONG",
    qty,
    margin: longerMargin,
    price,
    liquidationPrice: longerLiquidationPrice,
  });

  upsertPosition({
    userId: shorterId,
    market,
    tradeSide: "SHORT",
    qty,
    margin: shorterMargin,
    price,
    liquidationPrice: shorterLiquidationPrice,
  });

  // TODO: Send an event via Redis so the Express backend can write trade history to DB.
}

export function getOrCreateAssetCollateral(userId: string, assetId: string) {
  if (!COLLATERALS[userId]) COLLATERALS[userId] = [];

  let userCollateral = COLLATERALS[userId].find((collateral) => {
    return collateral.assetId === assetId;
  });

  if (!userCollateral) {
    userCollateral = {
      assetId: assetId,
      amount: 0,
      lockedAmount: 0,
    };
    COLLATERALS[userId].push(userCollateral);
  }

  return userCollateral;
}

export function getOrCreatePositions(marketId: string) {
  const marketPositions = PERP_POSITIONS[marketId];
  if (!marketPositions) {
    PERP_POSITIONS[marketId] = [];
    return PERP_POSITIONS[marketId];
  }
  return marketPositions;
}

export function calculateInitialMargin(
  quantity: number,
  price: number,
  leverage: number,
) {
  if (leverage <= 0) {
    throw new Error("Leverage must be greater than zero");
  }

  return (quantity * price) / leverage;
}

function upsertPosition({
  userId,
  market,
  tradeSide,
  qty,
  margin,
  price,
  liquidationPrice,
}: {
  userId: string;
  market: Market;
  tradeSide: TradeSide;
  qty: number;
  margin: number;
  price: number;
  liquidationPrice: number;
}) {
  const marketPositions = getOrCreatePositions(market.id);
  const existingPosition = marketPositions.find(
    (position) => position.userId === userId,
  );

  if (existingPosition && existingPosition.tradeSide !== tradeSide) {
    throw new Error(
      "Reducing or flipping an existing position is not implemented yet.",
    );
  }

  if (!existingPosition) {
    marketPositions.push({
      userId,
      positionId: randomUUID(),
      market,
      tradeSide,
      quantity: qty,
      margin,
      averagePrice: price,
      liquidationPrice,
      entryPrice: price,
    });
    return;
  }

  const nextQuantity = existingPosition.quantity + qty;
  existingPosition.averagePrice =
    (existingPosition.averagePrice * existingPosition.quantity + price * qty) /
    nextQuantity;
  existingPosition.quantity = nextQuantity;
  existingPosition.margin += margin;
  existingPosition.liquidationPrice = liquidationPrice;
}

export function insertBid(bids: PerpOrder[], order: PerpOrder) {
  // Sort descending by price. If prices are equal, sort by time (oldest first)
  bids.push(order);
  bids.sort((a, b) => {
    if (b.price === a.price) return a.createdAt - b.createdAt;
    return b.price! - a.price!;
  });
}
