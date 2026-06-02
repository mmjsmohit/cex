export type Asset = {
  id: string;
  name: string;
  symbol: string;
  logo: string;
};

export type Market = {
  id: string;
  name: string;
  baseAssetId: string;
  quoteAssetId: string;
};

export type MarketRow = Market & {
  baseAsset?: Asset;
  quoteAsset?: Asset;
};
