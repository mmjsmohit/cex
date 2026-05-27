type MarketId = string;

export type TradeSide = "LONG" | "SHORT";
export type OrderType = "LIMIT" | "MARKET";
export type OrderCompletion = "COMPLETED" | "PARTIAL" | "CANCELLED";

interface Market {
  id: string;
  name: string;
  baseAssetId: string;
  quoteAssetId: string;
}

interface Fill {
  orderId: string;
  price: number;
  quantity: number;
  filledAt: number;
}

interface PerpOrder {
  userId: string;
  orderId: string;
  market: Market;
  entryPrice: number | undefined; // In a MARKET order, price may not be given
  quantity: number;
  margin: number;
  filled: number;
  orderType: OrderType;
  tradeSide: TradeSide;
  createdAt: number;
  fills: Fill[];
  leverage: number;
  take_profit: number | undefined;
  stop_loss: number | undefined;
}

interface PerpAssetOrderBook {
  symbol: string;
  bids: PerpOrder[];
  asks: PerpOrder[];
  lastTradedPrice: number;
  indexPrice: number;
}

type PerpOrderBook = Record<MarketId, PerpAssetOrderBook>;

export type { PerpOrderBook, PerpOrder, PerpAssetOrderBook, MarketId, Market };
