"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatNumber } from "../_lib/format";
import type { DepthLevel, MarketDepth } from "../_lib/types";

type OrderBookProps = {
  depth: MarketDepth;
  lastPrice?: number;
  isRefreshing: boolean;
  onRefresh: () => void;
};

export function OrderBook({
  depth,
  lastPrice,
  isRefreshing,
  onRefresh,
}: OrderBookProps) {
  const asks = [...depth.asks].sort((a, b) => b.price - a.price).slice(-8);
  const bids = [...depth.bids].sort((a, b) => b.price - a.price).slice(0, 8);
  const maxTotal = Math.max(
    ...asks.map((level) => level.total),
    ...bids.map((level) => level.total),
    1,
  );

  return (
    <Card className="rounded-lg border bg-background py-0 shadow-sm">
      <CardHeader className="flex-row items-center justify-between border-b px-4 py-3">
        <CardTitle>Order Book</CardTitle>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isRefreshing}
          onClick={onRefresh}
        >
          <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 px-4 py-3">
        <DepthRows levels={asks} side="ask" maxTotal={maxTotal} />
        <div className="text-lg font-bold text-rose-600">
          {lastPrice === undefined ? "--" : formatNumber(lastPrice)}
        </div>
        <DepthRows levels={bids} side="bid" maxTotal={maxTotal} />
      </CardContent>
    </Card>
  );
}

function DepthRows({
  levels,
  side,
  maxTotal,
}: {
  levels: DepthLevel[];
  side: "ask" | "bid";
  maxTotal: number;
}) {
  return (
    <div className="space-y-1 text-xs">
      <div className="grid grid-cols-3 text-muted-foreground">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>
      {levels.length === 0 ? (
        <div className="py-3 text-center text-muted-foreground">No {side}s</div>
      ) : (
        levels.map((level) => (
          <div
            key={`${side}-${level.price}-${level.quantity}`}
            className="relative grid grid-cols-3 overflow-hidden rounded-sm py-0.5 font-medium"
          >
            <span
              className={side === "bid" ? "text-emerald-600" : "text-rose-600"}
            >
              {formatNumber(level.price)}
            </span>
            <span className="text-right text-muted-foreground">
              {formatNumber(level.quantity)}
            </span>
            <span className="text-right text-muted-foreground">
              {formatNumber(level.total)}
            </span>
            <span
              className={cn(
                "absolute inset-y-0 right-0 -z-0 opacity-30",
                side === "bid" ? "bg-emerald-300" : "bg-rose-300",
              )}
              style={{ width: `${Math.min((level.total / maxTotal) * 100, 100)}%` }}
            />
          </div>
        ))
      )}
    </div>
  );
}
