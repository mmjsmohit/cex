"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMaybeNumber } from "../_lib/format";
import type { Asset, Balance, SpotOrder } from "../_lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldGroup, Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchJson } from "@/lib/utils";
import { useState } from "react";
import { addBalance } from "../_lib/api";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

async function getAssets() {
  const assets: Asset[] = await fetchJson("/assets");

  return assets;
}

type AccountTabsProps = {
  balances: Balance[];
  orders: SpotOrder[];
  assetsById: Map<string, Asset>;
  onBalanceLoadedAction?: () => Promise<void>;
};

export function AccountTabs({
  balances,
  orders,
  assetsById,
  onBalanceLoadedAction,
}: AccountTabsProps) {
  const [assets, loadAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [assetAmount, setAssetAmount] = useState("1000");
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isSubmittingBalance, setIsSubmittingBalance] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDialogAssets() {
    setIsLoadingAssets(true);
    setError(null);

    try {
      const assets = await getAssets();
      loadAssets(assets);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoadingAssets(false);
    }
  }

  async function handleLoadBalance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(assetAmount);
    if (
      !selectedAssetId ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      setError("Select an asset and enter a valid amount.");
      return;
    }

    setIsSubmittingBalance(true);

    try {
      await addBalance({ assetId: selectedAssetId, assetAmount: parsedAmount });
      await onBalanceLoadedAction?.();
      setDialogOpen(false);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSubmittingBalance(false);
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleLoadBalance} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Add Asset Balance</DialogTitle>
            <DialogDescription>
              Add a new asset balance here to execute trades.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <Label htmlFor="name-1">Asset</Label>
              <Select
                value={selectedAssetId}
                onValueChange={setSelectedAssetId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an asset to load" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Assets</SelectLabel>
                    {assets.map((asset: Asset) => {
                      return (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.name}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <Label htmlFor="username-1">Amount</Label>
              <Input
                id="asset-amount"
                name="amount"
                type="number"
                min="0"
                step="any"
                value={assetAmount}
                onChange={(event) => setAssetAmount(event.target.value)}
              />
            </Field>
          </FieldGroup>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmittingBalance}>
              {isSubmittingBalance ? "Loading..." : "Load Asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <Card className="rounded-lg border bg-background py-0 shadow-sm">
        <Tabs defaultValue="balances" className="gap-0">
          <div>
            <CardHeader className="border-b px-4 py-3">
              <TabsList className="bg-transparent p-0 justify-between items-center flex flex-row grow w-full">
                <div className="grow">
                  <TabsTrigger
                    value="balances"
                    className="rounded-md data-active:bg-muted"
                  >
                    Balances
                  </TabsTrigger>
                  <TabsTrigger
                    value="open-orders"
                    className="rounded-md data-active:bg-muted"
                  >
                    Open Orders
                  </TabsTrigger>
                </div>
                <DialogTrigger
                  asChild
                  onClick={() => {
                    void loadDialogAssets();
                  }}
                >
                  <Button variant={"outline"} disabled={isLoadingAssets}>
                    {isLoadingAssets ? "Loading..." : "+ Add Balance"}
                  </Button>
                </DialogTrigger>
              </TabsList>
            </CardHeader>
          </div>
          <CardContent className="px-4 py-3">
            <TabsContent value="balances">
              <BalancesTable balances={balances} assetsById={assetsById} />
            </TabsContent>
            <TabsContent value="open-orders">
              <OrdersTable orders={orders} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </Dialog>
  );
}

function BalancesTable({
  balances,
  assetsById,
}: {
  balances: Balance[];
  assetsById: Map<string, Asset>;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Asset</TableHead>
          <TableHead className="text-right">Available</TableHead>
          <TableHead className="text-right">Locked</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {balances.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={3}
              className="text-center text-muted-foreground"
            >
              No balances loaded.
            </TableCell>
          </TableRow>
        ) : (
          balances.map((balance, index) => {
            const asset = balance.assetId
              ? assetsById.get(balance.assetId)
              : balance.asset;

            return (
              <TableRow key={`${balance.assetId ?? index}`}>
                <TableCell>
                  {asset?.symbol ?? balance.assetId ?? "Asset"}
                </TableCell>
                <TableCell className="text-right">
                  {formatMaybeNumber(balance.assetAmount ?? balance.amount)}
                </TableCell>
                <TableCell className="text-right">
                  {formatMaybeNumber(balance.lockedAmount)}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function OrdersTable({ orders }: { orders: SpotOrder[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Side</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={4}
              className="text-center text-muted-foreground"
            >
              No open orders.
            </TableCell>
          </TableRow>
        ) : (
          orders.map((order) => (
            <TableRow key={order.orderId}>
              <TableCell className="font-mono text-xs">
                {order.orderId}
              </TableCell>
              <TableCell>{order.tradeSide}</TableCell>
              <TableCell className="text-right">
                {formatMaybeNumber(order.price)}
              </TableCell>
              <TableCell className="text-right">
                {formatMaybeNumber(order.quantity)}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
