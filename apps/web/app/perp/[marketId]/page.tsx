import { PerpConsolePage } from "../../debugConsole";

type PerpPageProps = {
  params: Promise<{
    marketId: string;
  }>;
};

export default async function PerpMarketPage({ params }: PerpPageProps) {
  const { marketId } = await params;
  return <PerpConsolePage marketId={marketId} />;
}
