"use client";

import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import Link from "next/link";

import type { MarketRow } from "./types";

export type MarketType = "spot" | "futures";

function formatMarketName(market: MarketRow) {
  if (market.baseAsset?.symbol && market.quoteAsset?.symbol) {
    return `${market.baseAsset.symbol}-${market.quoteAsset.symbol}`;
  }

  return market.name.replace("_", "-");
}

export function getColumns(marketType: MarketType): ColumnDef<MarketRow>[] {
  const tradeType = marketType === "futures" ? "perp" : "spot";
  const marketLabel = marketType === "futures" ? "PERP" : "SPOT";

  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const market = row.original;
        const marketName = formatMarketName(market);

        return (
          <Link
            href={`/trade/${tradeType}/${market.id}`}
            className="inline-flex items-center gap-3 font-semibold text-foreground transition-colors hover:text-primary"
          >
            <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
              {market.baseAsset?.logo ? (
                <Image
                  src={market.baseAsset.logo}
                  alt={`${market.baseAsset.symbol} logo`}
                  fill
                  sizes="40px"
                  className="object-contain p-1"
                />
              ) : (
                <span className="text-xs text-muted-foreground">
                  {marketName.slice(0, 2)}
                </span>
              )}
            </span>
            <span>
              {marketName}
              <span className="ml-1 text-muted-foreground">{marketLabel}</span>
            </span>
          </Link>
        );
      },
    },
    {
      id: "baseAsset",
      header: "Base Asset",
      cell: ({ row }) => {
        const asset = row.original.baseAsset;

        return asset ? (
          <div className="font-medium">
            {asset.name}
            <span className="ml-2 text-muted-foreground">{asset.symbol}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">Unknown</span>
        );
      },
    },
    {
      id: "quoteAsset",
      header: "Quote Asset",
      cell: ({ row }) => {
        const asset = row.original.quoteAsset;

        return asset ? (
          <div className="font-medium">
            {asset.name}
            <span className="ml-2 text-muted-foreground">{asset.symbol}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">Unknown</span>
        );
      },
    },
  ];
}
