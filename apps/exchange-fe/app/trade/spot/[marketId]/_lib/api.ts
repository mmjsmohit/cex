import type {
  Asset,
  Balance,
  Market,
  MarketDepth,
  SpotCandle,
  SpotOrder,
} from "./types";
import {
  extractBalances,
  extractCandles,
  extractSpotDepth,
  extractSpotOrders,
  parseResponse,
} from "./parsers";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";
const SPOT_MARKET_TYPE = "SPOT";

type HttpMethod = "GET" | "POST" | "DELETE";

type ApiOptions = {
  method?: HttpMethod;
  body?: Record<string, unknown>;
};

export async function getSpotMarketData(marketId: string) {
  const [assets, markets, depth, candles] = await Promise.all([
    apiFetch<Asset[]>("/assets"),
    apiFetch<Market[]>("/markets"),
    getSpotDepth(marketId),
    getSpotCandles(marketId),
  ]);

  return {
    assets: Array.isArray(assets) ? assets : [],
    markets: Array.isArray(markets) ? markets : [],
    depth,
    candles,
  };
}

export async function getSpotDepth(marketId: string): Promise<MarketDepth> {
  const response = await apiFetch(
    `/depth/${marketId}?marketType=${SPOT_MARKET_TYPE}`,
  );
  return extractSpotDepth(response);
}

export async function getSpotCandles(marketId: string): Promise<SpotCandle[]> {
  const to = new Date();
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
  const searchParams = new URLSearchParams({
    marketId,
    marketType: SPOT_MARKET_TYPE,
    interval: "1h",
    from: from.toISOString(),
    to: to.toISOString(),
  });

  const response = await apiFetch(`/candles?${searchParams}`);
  return extractCandles(response);
}

export async function getSpotOrders(): Promise<SpotOrder[]> {
  const response = await apiFetch(`/orders?marketType=${SPOT_MARKET_TYPE}`);
  return extractSpotOrders(response);
}

export async function getBalances(): Promise<Balance[]> {
  const response = await apiFetch("/balance");
  return extractBalances(response);
}

export async function addBalance(input: {
  assetId: string;
  assetAmount: number;
}) {
  return apiFetch("/balance", {
    method: "POST",
    body: {
      assetId: input.assetId,
      assetAmount: input.assetAmount,
    },
  });
}

export async function createSpotOrder(input: {
  marketId: string;
  price: number;
  quantity: number;
  side: "BUY" | "SELL";
  orderType: "LIMIT" | "MARKET";
}) {
  return apiFetch("/order", {
    method: "POST",
    body: {
      market_id: input.marketId,
      price: input.price,
      quantity: input.quantity,
      trade_side: input.side,
      order_type: input.orderType,
      market_type: SPOT_MARKET_TYPE,
    },
  });
}

async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: buildHeaders(options.body !== undefined),
    body: options.body
      ? JSON.stringify(pruneEmptyFields(options.body))
      : undefined,
    cache: "no-store",
  });

  const parsedResponse = parseResponse(await response.text());

  if (!response.ok) {
    throw new Error(getErrorMessage(parsedResponse, response.status));
  }

  return parsedResponse as T;
}

function buildHeaders(hasBody: boolean): HeadersInit {
  const headers: Record<string, string> = {};

  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  if (typeof window !== "undefined") {
    const token =
      window.localStorage.getItem("cex-jwt") ??
      window.localStorage.getItem("jwt") ??
      window.localStorage.getItem("token");

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
}

function pruneEmptyFields(body: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(body).filter(
      ([, value]) => value !== "" && value !== undefined,
    ),
  );
}

function getErrorMessage(response: unknown, status: number) {
  if (
    typeof response === "object" &&
    response !== null &&
    "message" in response &&
    typeof response.message === "string"
  ) {
    return response.message;
  }

  return `Request failed with status ${status}`;
}
