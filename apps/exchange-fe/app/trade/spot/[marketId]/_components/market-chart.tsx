"use client";

import * as React from "react";
import {
  CandlestickSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SpotCandle } from "../_lib/types";

type MarketChartProps = {
  marketName: string;
  candles: SpotCandle[];
};

export function MarketChart({ marketName, candles }: MarketChartProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<IChartApi | null>(null);
  const seriesRef = React.useRef<ISeriesApi<"Candlestick"> | null>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      height: 420,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#4b5563",
      },
      grid: {
        vertLines: { color: "#eef2f7" },
        horzLines: { color: "#eef2f7" },
      },
      rightPriceScale: {
        borderColor: "#e5e7eb",
      },
      timeScale: {
        borderColor: "#e5e7eb",
        timeVisible: true,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    seriesRef.current?.setData(candles);

    if (candles.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [candles]);

  return (
    <Card className="rounded-lg border bg-background py-0 shadow-sm">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle>{marketName} · SPOT</CardTitle>
      </CardHeader>
      <CardContent className="px-0 py-0">
        {candles.length === 0 ? (
          <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
            No candle data yet. Candles are generated from fills.
          </div>
        ) : null}
        <div className={candles.length === 0 ? "hidden" : "h-[420px]"} ref={containerRef} />
      </CardContent>
    </Card>
  );
}
