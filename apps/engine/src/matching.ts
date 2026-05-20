import { redis } from "bun";
import { ORDERBOOK } from ".";
import type { Order, OrderBook } from "./types/orderbook.types";
import { lockBalances, executeSwap, insertBid, insertAsk } from "./utils";

function getOrCreateBook(marketId: string): OrderBook[string] {
  let book = ORDERBOOK[marketId];
  if (!book) {
    ORDERBOOK[marketId] = {
      bids: [],
      asks: [],
      lastTradedPrice: 0,
    };
    book = ORDERBOOK[marketId];
  }

  return book;
}

export function processLimitBuy(
  marketId: string,
  incomingOrder: Order,
  baseAsset: string,
  quoteAsset: string,
) {
  const book = getOrCreateBook(marketId);
  let remainingQty = incomingOrder.quantity - incomingOrder.filled;

  // 1. Lock the required Quote Asset for the BUYER
  const requiredQuote = remainingQty * incomingOrder.price!;
  if (!lockBalances(incomingOrder.userId, quoteAsset, requiredQuote)) {
    throw new Error("Insufficient funds");
  }
  // Start with an empty fills array
  incomingOrder.fills = [];

  // 2. Try to match with existing Asks (Sellers)
  while (remainingQty > 0 && book!.asks.length > 0) {
    const bestAsk = book?.asks[0]; // Lowest price seller

    // If the seller wants more than the buyer is willing to pay, stop matching
    if (bestAsk!.price! > incomingOrder.price!) {
      break;
    }

    // Determine how much we can actually trade right now
    const askRemainingQty = bestAsk!.quantity - bestAsk!.filled;
    const matchQty = Math.min(remainingQty, askRemainingQty);
    const matchPrice = bestAsk!.price; // Trade happens at the Maker's (Ask) price

    // 3. Settle the Trade (The Swap)
    executeSwap({
      buyerId: incomingOrder.userId,
      sellerId: bestAsk!.userId,
      baseAsset,
      quoteAsset,
      qty: matchQty,
      price: matchPrice!,
      orderType: incomingOrder.orderType,
    });

    // 4. Update Order States
    incomingOrder.filled += matchQty;
    bestAsk!.filled += matchQty;
    remainingQty -= matchQty;
    book!.lastTradedPrice = matchPrice!;

    // Maintain an array of fills in the order
    const fill = {
      orderId: bestAsk!.orderId,
      price: matchPrice!,
      quantity: matchQty,
      filledAt: incomingOrder.createdAt,
    };
    incomingOrder.fills.push(fill);

    // 5. Remove fully filled maker orders from the book
    if (bestAsk!.filled === bestAsk!.quantity) {
      book!.asks.shift();
    }

    console.log("Fill pushed to DB");
    // Push the order to the Snapshot Queue so that it is stored in DB
    redis.lpush(
      "snapshot-queue",
      JSON.stringify({
        takerUserId: incomingOrder.userId,
        makerUserId: bestAsk!.userId,
        amount: incomingOrder.quantity,
        price: incomingOrder.price,
        marketType: "SPOT",
        side: incomingOrder.tradeSide,
        liquidType: "TAKER",
        originalOrderId: incomingOrder.orderId,
        originalOrderTimestamp: incomingOrder.createdAt,
        marketId: incomingOrder.market.id,
        type: incomingOrder.orderType,
      }),
    );
  }

  // 6. If the incoming buy order wasn't fully filled, add it to the Bids book
  if (remainingQty > 0) {
    insertBid(book!.bids, incomingOrder);
  }
}

export function processLimitSell(
  marketId: string,
  incomingOrder: Order,
  baseAsset: string,
  quoteAsset: string,
) {
  const book = getOrCreateBook(marketId);
  let remainingQty = incomingOrder.quantity - incomingOrder.filled;

  // 1. Lock the required Base Asset for the SELLER
  if (!lockBalances(incomingOrder.userId, baseAsset, remainingQty)) {
    throw new Error("Insufficient funds");
  }

  // Start with an empty fills array
  incomingOrder.fills = [];

  // 2. Try to match with existing Bids (Buyers)
  while (remainingQty > 0 && book.bids.length > 0) {
    const bestBid = book.bids[0]!; // Highest price buyer

    // If the buyer is not willing to pay the seller's limit price, stop matching
    if (bestBid.price! < incomingOrder.price!) {
      break;
    }

    const bidRemainingQty = bestBid.quantity - bestBid.filled;
    const matchQty = Math.min(remainingQty, bidRemainingQty);
    const matchPrice = bestBid.price; // Trade happens at the Maker's (Bid) price

    executeSwap({
      buyerId: bestBid.userId,
      sellerId: incomingOrder.userId,
      baseAsset,
      quoteAsset,
      qty: matchQty,
      price: matchPrice!,
      orderType: incomingOrder.orderType,
    });

    incomingOrder.filled += matchQty;
    bestBid.filled += matchQty;
    remainingQty -= matchQty;
    book.lastTradedPrice = matchPrice!;

    const fill = {
      orderId: bestBid!.orderId,
      price: matchPrice!,
      quantity: matchQty,
      filledAt: incomingOrder.createdAt,
    };

    incomingOrder.fills.push(fill);

    if (bestBid.filled === bestBid.quantity) {
      book.bids.shift();
    }

    // Push the order to the Snapshot Queue so that it is stored in DB
    redis.lpush(
      "snapshot-queue",
      JSON.stringify({
        takerUserId: incomingOrder.userId,
        makerUserId: bestBid!.userId,
        amount: incomingOrder.quantity,
        price: incomingOrder.price,
        marketType: "SPOT",
        side: incomingOrder.tradeSide,
        liquidType: "MAKER",
        originalOrderId: incomingOrder.orderId,
        originalOrderTimestamp: incomingOrder.createdAt,
        marketId: incomingOrder.market.id,
        type: incomingOrder.orderType,
      }),
    );
  }
  console.log("Fill pushed to DB");
  // 3. If the incoming sell order wasn't fully filled, add it to the Asks book
  if (remainingQty > 0) {
    insertAsk(book.asks, incomingOrder);
  }
}

export function processMarketBuy(
  marketId: string,
  incomingOrder: Order,
  baseAsset: string,
  quoteAsset: string,
) {
  const book = getOrCreateBook(marketId);
  let remainingQty = incomingOrder.quantity - incomingOrder.filled;

  // 0. For MARKET order, there is no need to start locking balance.
  // Start by checking if the market has enough to sell

  let totalSellQuantity = 0;
  book!.asks.map((ask) => (totalSellQuantity += ask.quantity));
  if (totalSellQuantity < incomingOrder.quantity) {
    throw new Error(
      "Market does not have enough sellers to fulfill your order.",
    );
  }
  // 1. Start with an empty fills array if order is possible
  incomingOrder.fills = [];

  // 2. Match the order with the best possible existing ask (most favourable seller)
  while (remainingQty > 0 && book!.asks.length > 0) {
    const bestAsk = book?.asks[0];
    const askRemainingQty = bestAsk!.quantity - bestAsk!.filled;
    const matchQty = Math.min(remainingQty, askRemainingQty);
    const matchPrice = bestAsk!.price;

    // 3. Settle the trade (The Swap)
    executeSwap({
      buyerId: incomingOrder.userId,
      sellerId: bestAsk!.userId,
      baseAsset,
      quoteAsset,
      qty: matchQty,
      price: matchQty,
      orderType: incomingOrder.orderType,
    });

    // 4. Update Order Status
    incomingOrder.filled += matchQty;
    bestAsk!.filled += matchQty;
    remainingQty -= matchQty;
    book!.lastTradedPrice = matchPrice!;

    // Maintain an array of fills in the order
    const fill = {
      orderId: bestAsk!.orderId,
      price: matchPrice!,
      quantity: matchQty,
      filledAt: incomingOrder.createdAt,
    };
    incomingOrder.fills.push(fill);

    // 5. Remove fully filled maker orders from the book
    if (bestAsk!.filled === bestAsk!.quantity) {
      book!.asks.shift();
    }

    redis.lpush(
      "snapshot-queue",
      JSON.stringify({
        takerUserId: incomingOrder.userId,
        makerUserId: bestAsk!.userId,
        amount: incomingOrder.quantity,
        price: incomingOrder.price,
        marketType: "SPOT",
        side: incomingOrder.tradeSide,
        liquidType: "MAKER",
        originalOrderId: incomingOrder.orderId,
        originalOrderTimestamp: incomingOrder.createdAt,
        marketId: incomingOrder.market.id,
        type: incomingOrder.orderType,
      }),
    );
  }

  // Push the order to the Snapshot Queue so that it is stored in DB
  redis.lpush("snapshot-queue", JSON.stringify(incomingOrder));
}

export function processMarketSell(
  marketId: string,
  incomingOrder: Order,
  baseAsset: string,
  quoteAsset: string,
) {
  const book = getOrCreateBook(marketId);
  let remainingQty = incomingOrder.quantity - incomingOrder.filled;

  // 0. For MARKET order, there is no need to start locking balance.
  // Start by checking if the market has enough to buy

  let totalBidQuantity = 0;
  book!.bids.map((bid) => (totalBidQuantity += bid.quantity));
  if (totalBidQuantity < incomingOrder.quantity) {
    throw new Error(
      "Market does not have enough buyers to fulfill your order.",
    );
  }
  // 1. Start with an empty fills array if order is possible
  incomingOrder.fills = [];

  // 2. Match the order with the best possible existing bid (most favourable buyer)
  while (remainingQty > 0 && book!.bids.length > 0) {
    const bestBid = book?.bids[0];
    const bidRemainingQty = bestBid!.quantity - bestBid!.filled;
    const matchQty = Math.min(remainingQty, bidRemainingQty);
    const matchPrice = bestBid!.price;

    // 3. Settle the trade (The Swap)
    executeSwap({
      buyerId: incomingOrder.userId,
      sellerId: bestBid!.userId,
      baseAsset,
      quoteAsset,
      qty: matchQty,
      price: matchQty,
      orderType: incomingOrder.orderType,
    });

    // 4. Update Order Status
    incomingOrder.filled += matchQty;
    bestBid!.filled += matchQty;
    remainingQty -= matchQty;
    book!.lastTradedPrice = matchPrice!;

    // Maintain an array of fills in the order
    const fill = {
      orderId: bestBid!.orderId,
      price: matchPrice!,
      quantity: matchQty,
      filledAt: incomingOrder.createdAt,
    };
    incomingOrder.fills.push(fill);

    // 5. Remove fully filled maker orders from the book
    if (bestBid!.filled === bestBid!.quantity) {
      book!.bids.shift();
    }

    redis.lpush(
      "snapshot-queue",
      JSON.stringify({
        takerUserId: incomingOrder.userId,
        makerUserId: bestBid!.userId,
        amount: incomingOrder.quantity,
        price: incomingOrder.price,
        marketType: "SPOT",
        side: incomingOrder.tradeSide,
        liquidType: "MAKER",
        originalOrderId: incomingOrder.orderId,
        originalOrderTimestamp: incomingOrder.createdAt,
        marketId: incomingOrder.market.id,
        type: incomingOrder.orderType,
      }),
    );
  }

  // Push the order to the Snapshot Queue so that it is stored in DB
  redis.lpush("snapshot-queue", JSON.stringify(incomingOrder));
}
