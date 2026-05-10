type MarketId = string;

export type TradeSide = "BUY" | "SELL";
export type OrderType = "LIMIT" | "MARKET";

interface Order {
  orderId: string;
  userId: string;
  price: number;
  quantity: number;
  filled: number;
  tradeSide: TradeSide;
  createdAt: number;
}

interface AssetOrderBook {
  bids: Order[];
  asks: Order[];
  lastTradedAt: number;
}

type OrderBook = Record<MarketId, AssetOrderBook>;

export type { OrderBook, Order, MarketId, AssetOrderBook };
