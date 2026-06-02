import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketsTable } from "./markets-table";
import type { Asset, Market, MarketRow } from "./types";
import { fetchJson } from "@/lib/utils";

async function getMarkets(): Promise<MarketRow[]> {
  const [markets, assets] = await Promise.all([
    fetchJson<Market[]>("/markets"),
    fetchJson<Asset[]>("/assets"),
  ]);

  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));

  return markets.map((market) => ({
    ...market,
    baseAsset: assetsById.get(market.baseAssetId),
    quoteAsset: assetsById.get(market.quoteAssetId),
  }));
}

export default async function MarketsPage() {
  const markets = await getMarkets();

  return (
    <main className="flex-1 bg-gray-50 px-4 py-10 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trade markets</h1>
        </div>

        <div className="rounded-3xl border bg-background p-4 shadow-sm sm:p-6">
          <Tabs defaultValue="spot">
            <TabsList className="my-4">
              <TabsTrigger
                value="spot"
                className="rounded-md py-1 px-3 mx-1 text-foreground text-md"
              >
                Spot
              </TabsTrigger>
              <TabsTrigger
                value="futures"
                className="rounded-xl px-4 py-1 text-foreground text-md"
              >
                Futures
              </TabsTrigger>
            </TabsList>
            <TabsContent value="spot">
              <MarketsTable data={markets} marketType="spot" />
            </TabsContent>
            <TabsContent value="futures">
              <MarketsTable data={markets} marketType="futures" />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
  );
}
