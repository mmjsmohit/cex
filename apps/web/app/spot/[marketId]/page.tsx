import { SpotConsolePage } from "../../debugConsole";

type SpotPageProps = {
  params: Promise<{
    marketId: string;
  }>;
};

export default async function SpotMarketPage({ params }: SpotPageProps) {
  const { marketId } = await params;
  return <SpotConsolePage marketId={marketId} />;
}
