import { BALANCES } from ".";
import type { Order } from "./types/orderbook.types";
// Utility function for locking balances before an order is placed
function lockBalances(userId: string, assetId: string, amountToLock: number) {
  const userBalance = BALANCES[userId];
  // Check if the user has enough balance to be locked

  const userAsset = userBalance?.find((asset) => {
    asset.assetId === assetId;
  });
  if (userAsset?.amount! < amountToLock) {
    return false;
  } else {
    BALANCES[userId]?.map((asset) => {
      if (asset.assetId === assetId) {
        asset.amount -= amountToLock;
        asset.lockedAmount = amountToLock;
      }
    });
    return true;
  }
}

function executeSwap(trade: {
  buyerId: string;
  sellerId: string;
  baseAsset: string;
  quoteAsset: string;
  qty: number;
  price: number;
}) {
  const { buyerId, sellerId, baseAsset, quoteAsset, qty, price } = trade;
  const totalQuoteValue = qty * price;

  const buyerBalances = BALANCES[buyerId];
  const sellerBalances = BALANCES[sellerId];

  const buyerBase = buyerBalances?.find((b) => b.assetId === baseAsset)!;
  const buyerQuote = buyerBalances?.find((b) => b.assetId === quoteAsset)!;

  const sellerBase = sellerBalances?.find((b) => b.assetId === baseAsset)!;
  const sellerQuote = sellerBalances?.find((b) => b.assetId === quoteAsset)!;

  // Buyer gets the Base Asset
  buyerBase.amount += qty;
  // Buyer pays Quote Asset from their locked balance
  buyerQuote.amount -= totalQuoteValue;
  buyerQuote.lockedAmount -= totalQuoteValue;

  // Seller gets Quote Asset
  sellerQuote.amount += totalQuoteValue;
  // Seller gives Base Asset from their locked balance (it was locked when they placed the ASK)
  sellerBase.amount -= qty;
  sellerBase.lockedAmount -= qty;

  // TODO: Send an via Redis so the Express backend can write the trade history to db.
}

function insertBid(bids: Order[], order: Order) {
  // Sort descending by price. If prices are equal, sort by time (oldest first)
  bids.push(order);
  bids.sort((a, b) => {
    if (b.price === a.price) return a.createdAt - b.createdAt;
    return b.price - a.price;
  });
}

export { lockBalances, executeSwap, insertBid };
