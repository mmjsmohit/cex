import { SpotTradeScreen } from "./_components/spot-trade-screen";

type SpotTradePageProps = {
  params: Promise<{
    marketId: string;
  }>;
};

export default async function SpotTradePage({ params }: SpotTradePageProps) {
  const { marketId } = await params;

  return <SpotTradeScreen marketId={marketId} />;
}
