"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatNumber, numberFrom } from "../_lib/format";
import type { OrderType, TradeSide } from "../_lib/types";

type OrderFormProps = {
  baseSymbol: string;
  quoteSymbol: string;
  defaultPrice?: number;
  isSubmitting: boolean;
  onSubmit: (order: {
    side: TradeSide;
    orderType: OrderType;
    price: number;
    quantity: number;
  }) => Promise<void>;
};

export function OrderForm({
  baseSymbol,
  quoteSymbol,
  defaultPrice,
  isSubmitting,
  onSubmit,
}: OrderFormProps) {
  const [side, setSide] = React.useState<TradeSide>("BUY");
  const [orderType, setOrderType] = React.useState<OrderType>("LIMIT");
  const [price, setPrice] = React.useState(defaultPrice?.toString() ?? "");
  const [quantity, setQuantity] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);

  const parsedPrice = numberFrom(price) ?? defaultPrice ?? 0;
  const parsedQuantity = numberFrom(quantity) ?? 0;
  const orderValue = parsedPrice * parsedQuantity;
  const isBuy = side === "BUY";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!parsedQuantity || (orderType === "LIMIT" && !parsedPrice)) {
      setMessage("Enter a valid price and quantity.");
      return;
    }

    await onSubmit({
      side,
      orderType,
      price: parsedPrice,
      quantity: parsedQuantity,
    });

    setQuantity("");
    setMessage(`${side} order submitted.`);
  }

  return (
    <Card className="rounded-lg border bg-background py-0 shadow-sm">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle>Place Order</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-4">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
            <Button
              type="button"
              variant={isBuy ? "default" : "ghost"}
              className={cn(
                "rounded-md",
                isBuy && "bg-emerald-200 text-emerald-900 hover:bg-emerald-200",
              )}
              onClick={() => setSide("BUY")}
            >
              Buy
            </Button>
            <Button
              type="button"
              variant={!isBuy ? "default" : "ghost"}
              className={cn(
                "rounded-md",
                !isBuy && "bg-rose-200 text-rose-900 hover:bg-rose-200",
              )}
              onClick={() => setSide("SELL")}
            >
              Sell
            </Button>
          </div>

          <Tabs
            value={orderType.toLowerCase()}
            onValueChange={(value) =>
              setOrderType(value.toUpperCase() as OrderType)
            }
          >
            <TabsList className="bg-transparent p-0">
              <TabsTrigger
                value="limit"
                className="rounded-md data-active:bg-muted"
              >
                Limit
              </TabsTrigger>
              <TabsTrigger
                value="market"
                className="rounded-md data-active:bg-muted"
              >
                Market
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <OrderInput
            label="Price"
            value={price}
            onChange={setPrice}
            suffix={quoteSymbol}
            placeholder={defaultPrice ? formatNumber(defaultPrice) : undefined}
            disabled={orderType === "MARKET"}
          />
          <OrderInput
            label="Quantity"
            value={quantity}
            onChange={setQuantity}
            suffix={baseSymbol}
          />
          <OrderInput
            label="Order Value"
            value={formatNumber(orderValue)}
            onChange={() => undefined}
            suffix={quoteSymbol}
            readOnly
          />

          <Button
            type="submit"
            className={cn(
              "h-11 w-full rounded-lg",
              isBuy
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-rose-600 hover:bg-rose-700",
            )}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            {isBuy ? "Buy" : "Sell"} {baseSymbol}
          </Button>

          {message ? (
            <p className="text-xs text-muted-foreground">{message}</p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function OrderInput({
  label,
  value,
  onChange,
  suffix,
  disabled,
  readOnly,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1 text-xs font-semibold text-muted-foreground">
      <span>{label}</span>
      <div className="relative">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={placeholder}
          className="h-11 rounded-lg bg-muted pr-16 text-base font-semibold"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground">
          {suffix}
        </span>
      </div>
    </label>
  );
}
