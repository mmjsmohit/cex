"use client";

import * as React from "react";

import { AccountTabs } from "./account-tabs";
import { MarketChart } from "./market-chart";
import { MarketHeader } from "./market-header";
import { OrderBook } from "./order-book";
import { OrderForm } from "./order-form";
import {
  createSpotOrder,
  getBalances,
  getSpotDepth,
  getSpotMarketData,
  getSpotOrders,
} from "../_lib/api";
import { formatMarketName } from "../_lib/format";
import { extractDepthFromWsMessage } from "../_lib/parsers";
import type {
  Asset,
  Balance,
  Market,
  MarketDepth,
  OrderType,
  SpotCandle,
  SpotOrder,
  TradeSide,
} from "../_lib/types";

const DEFAULT_SPOT_WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000";

type SpotTradeScreenProps = {
  marketId: string;
};

export function SpotTradeScreen({ marketId }: SpotTradeScreenProps) {
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [markets, setMarkets] = React.useState<Market[]>([]);
  const [depth, setDepth] = React.useState<MarketDepth>({ bids: [], asks: [] });
  const [candles, setCandles] = React.useState<SpotCandle[]>([]);
  const [orders, setOrders] = React.useState<SpotOrder[]>([]);
  const [balances, setBalances] = React.useState<Balance[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshingDepth, setIsRefreshingDepth] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const assetsById = React.useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets],
  );
  const market = React.useMemo(
    () => markets.find((marketOption) => marketOption.id === marketId),
    [marketId, markets],
  );
  const baseAsset = market ? assetsById.get(market.baseAssetId) : undefined;
  const quoteAsset = market ? assetsById.get(market.quoteAssetId) : undefined;
  const marketName = formatMarketName(market, assetsById, marketId);
  const lastPrice = getBestAsk(depth) ?? getBestBid(depth);

  const loadInitialData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getSpotMarketData(marketId);
      setAssets(data.assets);
      setMarkets(data.markets);
      setDepth(data.depth);
      setCandles(data.candles);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }, [marketId]);

  const refreshDepth = React.useCallback(async () => {
    setIsRefreshingDepth(true);

    try {
      setDepth(await getSpotDepth(marketId));
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsRefreshingDepth(false);
    }
  }, [marketId]);

  const refreshAccountData = React.useCallback(async () => {
    try {
      const [nextOrders, nextBalances] = await Promise.all([
        getSpotOrders(),
        getBalances(),
      ]);
      setOrders(nextOrders);
      setBalances(nextBalances);
    } catch {
      // Auth-only data is optional for this public trading screen.
      setOrders([]);
      setBalances([]);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInitialData();
  }, [loadInitialData]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshAccountData();
  }, [refreshAccountData]);

  React.useEffect(() => {
    const socketUrl = resolveWebSocketUrl(DEFAULT_SPOT_WS_URL);
    socketUrl.searchParams.set("marketId", marketId);
    const socket = new WebSocket(socketUrl.toString());

    socket.addEventListener("message", (event) => {
      const nextDepth = extractDepthFromWsMessage(event.data, marketId);
      if (nextDepth) {
        setDepth(nextDepth);
      }
    });

    return () => socket.close();
  }, [marketId]);

  async function handleCreateOrder(order: {
    side: TradeSide;
    orderType: OrderType;
    price: number;
    quantity: number;
  }) {
    setIsSubmitting(true);
    setError(null);

    try {
      await createSpotOrder({ marketId, ...order });
      await Promise.all([refreshDepth(), refreshAccountData()]);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-muted/40 p-2 text-foreground">
      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-2">
          <MarketHeader
            baseAsset={baseAsset}
            marketName={marketName}
            depth={depth}
            lastPrice={lastPrice}
          />

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_300px]">
            <MarketChart marketName={marketName} candles={candles} />
            <OrderBook
              depth={depth}
              lastPrice={lastPrice}
              isRefreshing={isRefreshingDepth || isLoading}
              onRefresh={() => void refreshDepth()}
            />
          </div>

          <AccountTabs
            balances={balances}
            orders={orders}
            assetsById={assetsById}
            onBalanceLoadedAction={refreshAccountData}
          />
        </div>

        <OrderForm
          baseSymbol={baseAsset?.symbol ?? "BASE"}
          quoteSymbol={quoteAsset?.symbol ?? "QUOTE"}
          defaultPrice={lastPrice}
          isSubmitting={isSubmitting}
          onSubmit={handleCreateOrder}
        />
      </div>
    </main>
  );
}

function getBestAsk(depth: MarketDepth) {
  return depth.asks.reduce<number | undefined>(
    (best, level) =>
      best === undefined ? level.price : Math.min(best, level.price),
    undefined,
  );
}

function getBestBid(depth: MarketDepth) {
  return depth.bids.reduce<number | undefined>(
    (best, level) =>
      best === undefined ? level.price : Math.max(best, level.price),
    undefined,
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function resolveWebSocketUrl(defaultUrl: string) {
  const candidate = defaultUrl.trim();

  if (!candidate) {
    return getBrowserFallbackUrl();
  }

  try {
    return new URL(candidate);
  } catch {
    return getBrowserFallbackUrl();
  }
}

function getBrowserFallbackUrl() {
  if (typeof window === "undefined") {
    return new URL("ws://localhost:4000");
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return new URL(`${protocol}//${window.location.host}`);
}
