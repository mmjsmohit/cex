import type {
  Balance,
  DepthLevel,
  MarketDepth,
  SpotCandle,
  SpotOrder,
} from "./types";
import { numberFrom } from "./format";

export function parseResponse(text: string) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function extractSpotDepth(response: unknown): MarketDepth {
  if (
    isObject(response) &&
    isObject(response.loopbackResponse) &&
    isObject(response.loopbackResponse.depth)
  ) {
    return {
      bids: parseDepthLevels(response.loopbackResponse.depth.bids),
      asks: parseDepthLevels(response.loopbackResponse.depth.asks),
    };
  }

  if (isObject(response)) {
    return {
      bids: parseDepthLevels(response.bids),
      asks: parseDepthLevels(response.asks),
    };
  }

  return { bids: [], asks: [] };
}

export function extractDepthFromWsMessage(
  message: unknown,
  selectedMarketId: string,
): MarketDepth | null {
  const parsed = typeof message === "string" ? parseResponse(message) : message;

  if (
    !isObject(parsed) ||
    stringFrom(parsed.marketId) !== selectedMarketId ||
    !isObject(parsed.currentMarketDepth)
  ) {
    return null;
  }

  return {
    bids: aggregateOrderDepth(parsed.currentMarketDepth.bids, "bid"),
    asks: aggregateOrderDepth(parsed.currentMarketDepth.asks, "ask"),
  };
}

export function extractSpotOrders(response: unknown): SpotOrder[] {
  if (!isObject(response)) return [];

  if (Array.isArray(response.orders)) {
    return response.orders.flatMap((order) => parseSpotOrder(order));
  }

  if (!isObject(response.loopbackResponse)) return [];

  const rawOrders = response.loopbackResponse.orders;
  if (!Array.isArray(rawOrders)) return [];

  return rawOrders.flatMap((marketOrders) => {
    if (!isObject(marketOrders) || !Array.isArray(marketOrders.orders)) {
      return [];
    }

    return marketOrders.orders.flatMap((order) =>
      parseSpotOrder(order, stringFrom(marketOrders.marketId)),
    );
  });
}

export function extractBalances(response: unknown): Balance[] {
  if (Array.isArray(response)) return response.flatMap(parseBalance);

  if (isObject(response) && Array.isArray(response.balances)) {
    return response.balances.flatMap(parseBalance);
  }

  if (isObject(response) && isObject(response.loopbackResponse)) {
    const rawBalances =
      response.loopbackResponse.balance ?? response.loopbackResponse.balances;

    if (Array.isArray(rawBalances)) {
      return rawBalances.flatMap(parseBalance);
    }
  }

  return [];
}

export function extractCandles(response: unknown): SpotCandle[] {
  if (!isObject(response) || !Array.isArray(response.candles)) return [];

  return response.candles.flatMap((rawCandle) => {
    if (!isObject(rawCandle)) return [];

    const time = numberFrom(rawCandle.time);
    const open = numberFrom(rawCandle.open);
    const high = numberFrom(rawCandle.high);
    const low = numberFrom(rawCandle.low);
    const close = numberFrom(rawCandle.close);
    const volume = numberFrom(rawCandle.volume);

    if (
      time === undefined ||
      open === undefined ||
      high === undefined ||
      low === undefined ||
      close === undefined ||
      volume === undefined
    ) {
      return [];
    }

    return [{ time, open, high, low, close, volume } as SpotCandle];
  });
}

function aggregateOrderDepth(value: unknown, side: "bid" | "ask") {
  if (!Array.isArray(value)) return [];

  const quantityByPrice = new Map<number, number>();

  for (const order of value) {
    if (!isObject(order)) continue;

    const price = numberFrom(order.price) ?? numberFrom(order.entryPrice);
    const quantity = numberFrom(order.quantity);
    const filled = numberFrom(order.filled) ?? 0;

    if (price === undefined || quantity === undefined) continue;

    const remaining = quantity - filled;
    if (remaining > 0) {
      quantityByPrice.set(price, (quantityByPrice.get(price) ?? 0) + remaining);
    }
  }

  let total = 0;
  return Array.from(quantityByPrice.entries())
    .sort(([firstPrice], [secondPrice]) =>
      side === "bid" ? secondPrice - firstPrice : firstPrice - secondPrice,
    )
    .map(([price, quantity]) => {
      total += quantity;
      return { price, quantity, total };
    });
}

function parseDepthLevels(value: unknown): DepthLevel[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((level) => {
    if (!isObject(level)) return [];

    const price = numberFrom(level.price);
    const quantity = numberFrom(level.quantity);
    const total = numberFrom(level.total) ?? quantity;

    if (price === undefined || quantity === undefined || total === undefined) {
      return [];
    }

    return [{ price, quantity, total }];
  });
}

function parseSpotOrder(
  value: unknown,
  fallbackMarketId?: string,
): SpotOrder[] {
  if (!isObject(value)) return [];

  const orderId = stringFrom(value.orderId) || stringFrom(value.id);
  if (!orderId) return [];

  return [
    {
      orderId,
      marketId: isObject(value.market)
        ? stringFrom(value.market.id) || fallbackMarketId
        : fallbackMarketId,
      price: numberFrom(value.price),
      quantity: numberFrom(value.quantity),
      tradeSide: stringFrom(value.tradeSide) || stringFrom(value.trade_side),
    },
  ];
}

function parseBalance(value: unknown): Balance[] {
  if (!isObject(value)) return [];

  return [
    {
      assetId: stringFrom(value.assetId),
      amount: numberFrom(value.amount),
      assetAmount: numberFrom(value.assetAmount),
      lockedAmount: numberFrom(value.lockedAmount),
    },
  ];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringFrom(value: unknown) {
  return typeof value === "string" ? value : "";
}
