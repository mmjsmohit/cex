import type { Market, TradeSide } from "./orderbook.types";

interface Position {
  userId: string;
  positionId: string;
  orderId: string;
  market: Market;
  tradeSide: TradeSide;
  margin: number;
  averagePrice: number;
  quantity: number;
  liquidationPrice: number;
  entryPrice: number;
  upnl: number;
  take_profit: number | undefined;
  stop_loss: number | undefined;
  fundingDone: boolean;
}

export type { Position };
