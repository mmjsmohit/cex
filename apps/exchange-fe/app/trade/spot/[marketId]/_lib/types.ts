import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import type { Asset, Market } from "@/app/markets/types";

export type { Asset, Market };

export type DepthLevel = {
  price: number;
  quantity: number;
  total: number;
};

export type MarketDepth = {
  bids: DepthLevel[];
  asks: DepthLevel[];
};

export type SpotOrder = {
  orderId: string;
  marketId?: string;
  price?: number;
  quantity?: number;
  tradeSide?: string;
};

export type Balance = {
  assetId?: string;
  asset?: Asset;
  amount?: number;
  assetAmount?: number;
  lockedAmount?: number;
};

export type SpotCandle = CandlestickData<UTCTimestamp> & {
  volume: number;
};

export type TradeSide = "BUY" | "SELL";
export type OrderType = "LIMIT" | "MARKET";
