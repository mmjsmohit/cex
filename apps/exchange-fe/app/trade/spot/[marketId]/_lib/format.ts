import type { Asset, Market } from "./types";

export function formatMarketName(
  market: Market | undefined,
  assetsById: Map<string, Asset>,
  fallback: string,
) {
  if (!market) return fallback;

  const base = assetsById.get(market.baseAssetId);
  const quote = assetsById.get(market.quoteAssetId);

  if (base && quote) {
    return `${base.symbol}/${quote.symbol}`;
  }

  return market.name.replace("_", "/");
}

export function formatNumber(value: number, maximumFractionDigits = 8) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value || 0);
}

export function formatMaybeNumber(value: number | undefined) {
  return value === undefined ? "--" : formatNumber(value);
}

export function numberFrom(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
