"use client";

import { getColumns, type MarketType } from "./columns";
import { DataTable } from "./data-table";
import type { MarketRow } from "./types";

export function MarketsTable({
  data,
  marketType,
}: {
  data: MarketRow[];
  marketType: MarketType;
}) {
  return <DataTable columns={getColumns(marketType)} data={data} />;
}
