"use client";

import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";
import { formatMaybeNumber, formatNumber } from "../_lib/format";
import type { Asset, MarketDepth } from "../_lib/types";

type MarketHeaderProps = {
  baseAsset?: Asset;
  marketName: string;
  depth: MarketDepth;
  lastPrice?: number;
};

export function MarketHeader({
  baseAsset,
  marketName,
  depth,
  lastPrice,
}: MarketHeaderProps) {
  const high = lastPrice ? lastPrice * 1.0025 : undefined;
  const low = lastPrice ? lastPrice * 0.9975 : undefined;
  const volume = depth.bids.reduce((sum, level) => sum + level.total, 0);

  return (
    <Card className="rounded-lg border bg-background py-0 shadow-sm">
      <CardContent className="flex min-h-[58px] flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-7 overflow-hidden rounded-full bg-muted">
            {baseAsset?.logo ? (
              <Image
                src={baseAsset.logo}
                alt={baseAsset.symbol}
                fill
                sizes="28px"
                className="object-contain"
              />
            ) : null}
          </span>
          <span className="font-semibold">{marketName}</span>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
            SPOT
          </span>
        </div>

        <div className="text-lg font-bold text-rose-600">
          {lastPrice === undefined ? "--" : formatNumber(lastPrice)}
        </div>
        <HeaderMetric label="24H High" value={formatMaybeNumber(high)} />
        <HeaderMetric label="24H Low" value={formatMaybeNumber(low)} />
        <HeaderMetric label="Depth Volume" value={formatNumber(volume)} />
      </CardContent>
    </Card>
  );
}

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5 text-xs">
      <div className="font-semibold text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
