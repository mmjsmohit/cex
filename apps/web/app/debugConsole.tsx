"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
import styles from "./page.module.css";

type HttpMethod = "GET" | "POST" | "DELETE";
type MarketType = "SPOT" | "PERP";
type ConsoleKind = "SPOT" | "PERP";

type ApiResult = {
  method: HttpMethod;
  path: string;
  requestBody?: unknown;
  status?: number;
  ok?: boolean;
  response?: unknown;
  error?: string;
};

type DepthLevel = {
  price: number;
  quantity: number;
  total: number;
};

type MarketDepth = {
  bids: DepthLevel[];
  asks: DepthLevel[];
};

type WsStatus = "idle" | "connecting" | "connected" | "closed" | "error";

type AssetOption = {
  id: string;
  name: string;
  symbol: string;
};

type MarketOption = {
  id: string;
  name: string;
  baseAssetId: string;
  quoteAssetId: string;
  marketType?: MarketType;
};

type SpotOrderOption = {
  orderId: string;
  marketId?: string;
  price?: number;
  quantity?: number;
  tradeSide?: string;
};

type PerpOrderOption = {
  orderId: string;
  marketId?: string;
  price?: number;
  quantity?: number;
  tradeSide?: string;
  leverage?: number;
  margin?: number;
};

type PerpDepthSnapshot = MarketDepth & {
  indexPrice?: number;
  lastTradedPrice?: number;
};

type CollateralBalance = {
  marketId: string;
  amount?: number;
  lockedAmount?: number;
};

const tokenStorageKey = "cex-debug-jwt";
const defaultSpotWsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000";
const defaultPerpsWsUrl =
  process.env.NEXT_PUBLIC_PERPS_WS_URL ?? "ws://localhost:4001";
const spotMarketType: MarketType = "SPOT";
const perpMarketType: MarketType = "PERP";

const initialAuth = {
  username: "debug@example.com",
  name: "Debug User",
  password: "password123",
};

const initialAsset = {
  name: "US Dollar",
  symbol: "USD",
  logo: "https://example.com/usd.png",
};

const initialMarketCreate = {
  baseAssetId: "",
  quoteAssetId: "",
};

const initialBalance = {
  assetId: "",
  assetAmount: "1000",
};

const initialSpotOrder = {
  price: "100",
  quantity: "1",
  trade_side: "BUY",
  order_type: "LIMIT",
};

const initialPerpOrder = {
  price: "100",
  quantity: "1",
  margin: "100",
  leverage: "2",
  trade_side: "LONG",
  order_type: "LIMIT",
};

const initialOrderLookup = {
  orderId: "",
};

const initialCollateral = {
  amount: "1000",
};

const initialPriceUpdate = {
  price: "100",
};

type CallApiOptions = {
  jwt?: string;
  method: HttpMethod;
  path: string;
  body?: Record<string, unknown>;
  setResult: Dispatch<SetStateAction<ApiResult | null>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  onSignedIn?: (token: string) => void;
  onSync?: (normalizedPath: string, response: unknown) => void;
};

type CurrentMarketSummaryProps = {
  market: MarketOption | undefined;
  assetsById: Map<string, AssetOption>;
  marketId: string;
  kind: ConsoleKind;
};

export function MarketHubPage() {
  const { jwt, setJwt, isHydrated, isSignedIn } = useStoredJwt();
  const [auth, setAuth] = useState(initialAuth);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [markets, setMarkets] = useState<MarketOption[]>([]);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const assetsById = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets],
  );
  const marketPairs = useMemo(() => {
    return markets.map((market) => {
      const baseAsset = assetsById.get(market.baseAssetId);
      const quoteAsset = assetsById.get(market.quoteAssetId);

      return {
        market,
        title: formatMarketName(market, assetsById),
        subtitle: [
          baseAsset ? `${baseAsset.symbol} · ${baseAsset.name}` : undefined,
          quoteAsset ? `${quoteAsset.symbol} · ${quoteAsset.name}` : undefined,
        ]
          .filter(Boolean)
          .join(" / "),
      };
    });
  }, [assetsById, markets]);
  const resultJson = useMemo(() => {
    if (!result) return "No request sent yet.";
    return JSON.stringify(result.response ?? result.error, null, 2);
  }, [result]);

  const loadHubData = useEffectEvent(() => {
    void refreshAssets();
    void refreshMarkets();
  });

  useEffect(() => {
    if (!isHydrated || !isSignedIn) return;

    loadHubData();
    // loadHubData is a useEffectEvent and is intentionally omitted from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, isSignedIn]);

  async function callApi(
    method: HttpMethod,
    path: string,
    body?: Record<string, unknown>,
  ) {
    return callDebugApi({
      jwt,
      method,
      path,
      body,
      setResult,
      setIsLoading,
      onSignedIn: setJwt,
      onSync: (normalizedPath, response) => {
        if (normalizedPath === "/assets") {
          const nextAssets = extractAssets(response);
          if (nextAssets.length > 0) {
            setAssets((current) => mergeById(current, nextAssets));
          }
        }

        if (normalizedPath === "/markets") {
          const nextMarkets = extractMarkets(response);
          if (nextMarkets.length > 0) {
            setMarkets((current) => mergeById(current, nextMarkets));
          }
        }
      },
    });
  }

  async function refreshAssets() {
    await callApi("GET", "/assets");
  }

  async function refreshMarkets() {
    await callApi("GET", "/markets");
  }

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>CEX Debug App</p>
          <h1>Market Console Hub</h1>
        </div>
        <div className={styles.status}>
          <span
            className={isSignedIn ? styles.statusDotOn : styles.statusDot}
          />
          {isSignedIn ? "JWT loaded" : "Sign in required"}
        </div>
      </section>

      {!isHydrated ? (
        <section className={styles.loadingState}>Loading session…</section>
      ) : null}

      {isHydrated && !isSignedIn ? (
        <section className={styles.authShell}>
          <Panel title="Sign In / Sign Up">
            <AuthForm
              auth={auth}
              setAuth={setAuth}
              isLoading={isLoading}
              onSignUp={() =>
                callApi("POST", "/signup", {
                  username: auth.username,
                  name: auth.name,
                  password: auth.password,
                })
              }
              onSignIn={() =>
                callApi("POST", "/signin", {
                  username: auth.username,
                  password: auth.password,
                })
              }
            />
          </Panel>

          <section className={styles.responsePanel}>
            <div className={styles.responseHeader}>
              <div>
                <p className={styles.eyebrow}>Latest response</p>
                <h2>{result ? `${result.method} ${result.path}` : "Idle"}</h2>
              </div>
              {result?.status ? (
                <span
                  className={result.ok ? styles.okBadge : styles.errorBadge}
                >
                  {result.status}
                </span>
              ) : null}
            </div>

            {result?.requestBody ? (
              <>
                <h3>Request body</h3>
                <pre>{JSON.stringify(result.requestBody, null, 2)}</pre>
              </>
            ) : null}

            <h3>Response</h3>
            <pre>{resultJson}</pre>
          </section>
        </section>
      ) : null}

      {isHydrated && isSignedIn ? (
        <section className={styles.hubLayout}>
          <div className={styles.hubPanels}>
            <Panel title="Session">
              <div className={styles.stack}>
                <p className={styles.hintNeutral}>
                  Choose a market pair to open the SPOT or PERP console.
                </p>
                <div className={styles.buttonRow}>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      void refreshAssets();
                      void refreshMarkets();
                    }}
                  >
                    Refresh hub
                  </button>
                  <button type="button" onClick={() => setJwt("")}>
                    Reset JWT
                  </button>
                </div>
              </div>
            </Panel>

            <Panel title="Assets">
              {assets.length === 0 ? (
                <p className={styles.hint}>
                  List or create assets from the SPOT console if this is a fresh
                  environment.
                </p>
              ) : (
                <div className={styles.marketChipGrid}>
                  {assets.map((asset) => (
                    <div key={asset.id} className={styles.marketChip}>
                      <strong>{asset.symbol}</strong>
                      <span>{asset.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Market Pairs">
              <div className={styles.marketCardList}>
                {marketPairs.length === 0 ? (
                  <p className={styles.hint}>
                    No markets found yet. Create one from a SPOT console first.
                  </p>
                ) : (
                  marketPairs.map(({ market, title, subtitle }) => (
                    <article key={market.id} className={styles.marketCard}>
                      <div className={styles.marketCardHeader}>
                        <div>
                          <h3>{title}</h3>
                          <p>{subtitle || market.id}</p>
                        </div>
                        <span className={styles.marketCardId}>{market.id}</span>
                      </div>

                      <div className={styles.marketActionRow}>
                        <Link
                          href={`/spot/${market.id}`}
                          className={styles.primaryLinkButton}
                        >
                          Open SPOT
                        </Link>
                        <Link
                          href={`/perp/${market.id}`}
                          className={styles.secondaryLinkButton}
                        >
                          Open PERP
                        </Link>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </Panel>
          </div>

          <section className={styles.responsePanel}>
            <div className={styles.responseHeader}>
              <div>
                <p className={styles.eyebrow}>Latest response</p>
                <h2>{result ? `${result.method} ${result.path}` : "Idle"}</h2>
              </div>
              {result?.status ? (
                <span
                  className={result.ok ? styles.okBadge : styles.errorBadge}
                >
                  {result.status}
                </span>
              ) : null}
            </div>

            {result?.requestBody ? (
              <>
                <h3>Request body</h3>
                <pre>{JSON.stringify(result.requestBody, null, 2)}</pre>
              </>
            ) : null}

            <h3>Response</h3>
            <pre>{resultJson}</pre>
          </section>
        </section>
      ) : null}
    </main>
  );
}

export function SpotConsolePage({ marketId }: { marketId: string }) {
  const router = useRouter();
  const { jwt, setJwt, isHydrated, isSignedIn } = useStoredJwt();
  const [asset, setAsset] = useState(initialAsset);
  const [marketCreate, setMarketCreate] = useState(initialMarketCreate);
  const [balance, setBalance] = useState(initialBalance);
  const [order, setOrder] = useState(initialSpotOrder);
  const [orderLookup, setOrderLookup] = useState(initialOrderLookup);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [markets, setMarkets] = useState<MarketOption[]>([]);
  const [orders, setOrders] = useState<SpotOrderOption[]>([]);
  const [depth, setDepth] = useState<MarketDepth>({ bids: [], asks: [] });
  const [wsStatus, setWsStatus] = useState<WsStatus>("idle");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const assetsById = useMemo(
    () => new Map(assets.map((assetOption) => [assetOption.id, assetOption])),
    [assets],
  );
  const currentMarket = useMemo(
    () => markets.find((market) => market.id === marketId),
    [marketId, markets],
  );
  const resultJson = useMemo(() => {
    if (!result) return "No request sent yet.";
    return JSON.stringify(result.response ?? result.error, null, 2);
  }, [result]);

  const initializeSpotConsole = useEffectEvent(() => {
    void refreshAssets();
    void refreshMarkets();
    void fetchDepthForMarket(marketId);
  });

  useEffect(() => {
    if (!isHydrated) return;
    if (!isSignedIn) {
      router.replace("/");
      return;
    }

    initializeSpotConsole();
    // initializeSpotConsole is a useEffectEvent and is intentionally omitted from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, isSignedIn, marketId, router]);

  useEffect(() => {
    if (!isSignedIn) return;

    const socketUrl = new URL(defaultSpotWsUrl);
    socketUrl.searchParams.set("marketId", marketId);

    const socket = new WebSocket(socketUrl.toString());
    setWsStatus("connecting");

    socket.addEventListener("open", () => {
      setWsStatus("connected");
    });

    socket.addEventListener("message", (event) => {
      const parsedDepth = extractDepthFromWsMessage(event.data, marketId);

      if (parsedDepth) {
        setDepth(parsedDepth);
      }
    });

    socket.addEventListener("error", () => {
      setWsStatus("error");
    });

    socket.addEventListener("close", () => {
      setWsStatus("closed");
    });

    return () => {
      socket.close();
    };
  }, [isSignedIn, marketId]);

  async function callApi(
    method: HttpMethod,
    path: string,
    body?: Record<string, unknown>,
  ) {
    return callDebugApi({
      jwt,
      method,
      path,
      body,
      setResult,
      setIsLoading,
      onSync: (normalizedPath, response) => {
        if (normalizedPath === "/assets") {
          const nextAssets = extractAssets(response);
          if (nextAssets.length > 0) {
            setAssets((current) => mergeById(current, nextAssets));
          }
        }

        if (normalizedPath === "/markets") {
          const nextMarkets = extractMarkets(response);
          if (nextMarkets.length > 0) {
            setMarkets((current) => mergeById(current, nextMarkets));
          }
        }

        if (normalizedPath === "/orders") {
          setOrders(extractSpotOrders(response));
        }

        if (normalizedPath === "/order") {
          const createdOrder = extractCreatedSpotOrder(response);
          if (createdOrder) {
            setOrders((current) => mergeByOrderId(current, [createdOrder]));
          }
        }
      },
    });
  }

  async function fetchDepthForMarket(targetMarketId: string) {
    const depthResult = await callApi(
      "GET",
      withMarketType(`/depth/${targetMarketId}`, spotMarketType),
    );
    const parsedDepth = extractSpotDepth(depthResult.response);

    if (parsedDepth) {
      setDepth(parsedDepth);
    }
  }

  async function refreshAssets() {
    await callApi("GET", "/assets");
  }

  async function refreshMarkets() {
    await callApi("GET", "/markets");
  }

  async function refreshOrders() {
    await callApi("GET", withMarketType("/orders", spotMarketType));
  }

  if (!isHydrated || !isSignedIn) {
    return (
      <main className={styles.page}>
        <section className={styles.loadingState}>Redirecting to sign in…</section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>CEX SPOT API</p>
          <h1>SPOT Debug Console</h1>
        </div>
        <div className={styles.status}>
          <span className={styles.statusDotOn} />
          Market {formatMarketName(currentMarket, assetsById, marketId)}
        </div>
      </section>

      <div className={styles.consoleNavRow}>
        <Link href="/" className={styles.secondaryLinkButton}>
          Switch market
        </Link>
        <button type="button" onClick={() => setJwt("")}>
          Reset JWT
        </button>
      </div>

      <section className={styles.layout}>
        <div className={styles.controls}>
          <Panel title="Assets">
            <form
              className={styles.form}
              onSubmit={handleSubmit(() =>
                callApi("POST", "/assets", {
                  name: asset.name,
                  symbol: asset.symbol,
                  logo: asset.logo,
                })
              )}
            >
              <Field
                label="Name"
                value={asset.name}
                onChange={(value) => updateFields(setAsset, asset, "name", value)}
              />
              <Field
                label="Symbol"
                value={asset.symbol}
                onChange={(value) =>
                  updateFields(setAsset, asset, "symbol", value.toUpperCase())
                }
              />
              <Field
                label="Logo"
                value={asset.logo}
                onChange={(value) => updateFields(setAsset, asset, "logo", value)}
              />
              <div className={styles.buttonRow}>
                <button type="submit" disabled={!isSignedIn || isLoading}>
                  Create asset
                </button>
                <button
                  type="button"
                  disabled={!isSignedIn || isLoading}
                  onClick={() => {
                    void refreshAssets();
                  }}
                >
                  List assets
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="SPOT Markets">
            <form
              className={styles.form}
              onSubmit={handleSubmit(() =>
                callApi("POST", "/markets", {
                  baseAssetId: marketCreate.baseAssetId,
                  quoteAssetId: marketCreate.quoteAssetId,
                })
              )}
            >
              <CurrentMarketSummary
                market={currentMarket}
                assetsById={assetsById}
                marketId={marketId}
                kind="SPOT"
              />
              <SelectField
                label="Base asset"
                value={marketCreate.baseAssetId}
                onChange={(value) =>
                  updateFields(
                    setMarketCreate,
                    marketCreate,
                    "baseAssetId",
                    value,
                  )
                }
                options={assets.map((assetOption) => ({
                  value: assetOption.id,
                  label: formatAssetOption(assetOption),
                }))}
                placeholder="Load assets first"
              />
              <SelectField
                label="Quote asset"
                value={marketCreate.quoteAssetId}
                onChange={(value) =>
                  updateFields(
                    setMarketCreate,
                    marketCreate,
                    "quoteAssetId",
                    value,
                  )
                }
                options={assets.map((assetOption) => ({
                  value: assetOption.id,
                  label: formatAssetOption(assetOption),
                }))}
                placeholder="Load assets first"
              />
              {assets.length === 0 ? (
                <p className={styles.hint}>
                  List assets to populate asset dropdowns.
                </p>
              ) : null}
              <div className={styles.buttonRow}>
                <button type="submit" disabled={!isSignedIn || isLoading}>
                  Create SPOT market
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    void refreshMarkets();
                  }}
                >
                  List SPOT markets
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    void fetchDepthForMarket(marketId);
                  }}
                >
                  Get SPOT depth
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="Balances">
            <form
              className={styles.form}
              onSubmit={handleSubmit(() =>
                callApi("POST", "/balance", {
                  assetId: balance.assetId,
                  assetAmount: Number(balance.assetAmount),
                })
              )}
            >
              <SelectField
                label="Asset"
                value={balance.assetId}
                onChange={(value) =>
                  updateFields(setBalance, balance, "assetId", value)
                }
                options={assets.map((assetOption) => ({
                  value: assetOption.id,
                  label: formatAssetOption(assetOption),
                }))}
                placeholder="Load assets first"
              />
              <Field
                label="Amount"
                type="number"
                value={balance.assetAmount}
                onChange={(value) =>
                  updateFields(setBalance, balance, "assetAmount", value)
                }
              />
              {assets.length === 0 ? (
                <p className={styles.hint}>
                  List assets to populate this dropdown.
                </p>
              ) : null}
              <div className={styles.buttonRow}>
                <button type="submit" disabled={!isSignedIn || isLoading}>
                  Add balance
                </button>
                <button
                  type="button"
                  disabled={!isSignedIn || isLoading}
                  onClick={() => {
                    void callApi("GET", "/balance");
                  }}
                >
                  Get balance
                </button>
                <button
                  type="button"
                  disabled={!isSignedIn || isLoading}
                  onClick={() => {
                    void callApi("GET", "/balance/usd");
                  }}
                >
                  Get USD
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="SPOT Orders">
            <form
              className={styles.form}
              onSubmit={handleSubmit(async () => {
                const created = await callApi("POST", "/order", {
                  market_id: marketId,
                  price: Number(order.price),
                  quantity: Number(order.quantity),
                  trade_side: order.trade_side,
                  order_type: order.order_type,
                  market_type: spotMarketType,
                });

                if (created.ok) {
                  await fetchDepthForMarket(marketId);
                }
              })}
            >
              <CurrentMarketSummary
                market={currentMarket}
                assetsById={assetsById}
                marketId={marketId}
                kind="SPOT"
              />
              <div className={styles.inlineGrid}>
                <Field
                  label="Price"
                  type="number"
                  value={order.price}
                  onChange={(value) => updateFields(setOrder, order, "price", value)}
                />
                <Field
                  label="Quantity"
                  type="number"
                  value={order.quantity}
                  onChange={(value) =>
                    updateFields(setOrder, order, "quantity", value)
                  }
                />
              </div>
              <div className={styles.inlineGrid}>
                <label className={styles.field}>
                  <span>Side</span>
                  <select
                    value={order.trade_side}
                    onChange={(event) =>
                      updateFields(
                        setOrder,
                        order,
                        "trade_side",
                        event.target.value,
                      )
                    }
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Type</span>
                  <select
                    value={order.order_type}
                    onChange={(event) =>
                      updateFields(
                        setOrder,
                        order,
                        "order_type",
                        event.target.value,
                      )
                    }
                  >
                    <option value="LIMIT">LIMIT</option>
                    <option value="MARKET">MARKET</option>
                  </select>
                </label>
              </div>
              <SelectField
                label="Order"
                value={orderLookup.orderId}
                onChange={(value) =>
                  updateFields(setOrderLookup, orderLookup, "orderId", value)
                }
                options={orders.map((orderOption) => ({
                  value: orderOption.orderId,
                  label: formatSpotOrderOption(orderOption),
                }))}
                placeholder="List orders first"
              />
              {orders.length === 0 ? (
                <p className={styles.hint}>
                  List orders to populate order dropdowns.
                </p>
              ) : null}
              <div className={styles.buttonRow}>
                <button type="submit" disabled={!isSignedIn || isLoading}>
                  Create SPOT order
                </button>
                <button
                  type="button"
                  disabled={!isSignedIn || isLoading}
                  onClick={() => {
                    void refreshOrders();
                  }}
                >
                  List SPOT orders
                </button>
                <button
                  type="button"
                  disabled={!isSignedIn || isLoading || !orderLookup.orderId}
                  onClick={() => {
                    if (!orderLookup.orderId) return;

                    void callApi(
                      "GET",
                      withMarketType(`/order/${orderLookup.orderId}`, spotMarketType),
                    );
                  }}
                >
                  Get SPOT order
                </button>
                <button
                  type="button"
                  disabled={!isSignedIn || isLoading || !orderLookup.orderId}
                  onClick={async () => {
                    if (!orderLookup.orderId) return;

                    const deleted = await callApi(
                      "DELETE",
                      `/order/${orderLookup.orderId}`,
                      {
                        market_type: spotMarketType,
                      },
                    );

                    if (deleted.ok) {
                      await refreshOrders();
                      await fetchDepthForMarket(marketId);
                    }
                  }}
                >
                  Delete SPOT order
                </button>
              </div>
            </form>
          </Panel>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.depthPanel}>
            <div className={styles.responseHeader}>
              <div>
                <p className={styles.eyebrow}>SPOT depth</p>
                <h2>{formatMarketName(currentMarket, assetsById, marketId)}</h2>
              </div>
              <div className={styles.depthActions}>
                <span className={styles.wsStatus} data-status={wsStatus}>
                  WS {wsStatus}
                </span>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    void fetchDepthForMarket(marketId);
                  }}
                  className={styles.refreshButton}
                >
                  Refresh
                </button>
              </div>
            </div>

            <DepthView depth={depth} />
          </section>

          <section className={styles.responsePanel}>
            <div className={styles.responseHeader}>
              <div>
                <p className={styles.eyebrow}>Latest response</p>
                <h2>{result ? `${result.method} ${result.path}` : "Idle"}</h2>
              </div>
              {result?.status ? (
                <span
                  className={result.ok ? styles.okBadge : styles.errorBadge}
                >
                  {result.status}
                </span>
              ) : null}
            </div>

            {result?.requestBody ? (
              <>
                <h3>Request body</h3>
                <pre>{JSON.stringify(result.requestBody, null, 2)}</pre>
              </>
            ) : null}

            <h3>Response</h3>
            <pre>{resultJson}</pre>
          </section>
        </aside>
      </section>
    </main>
  );
}

export function PerpConsolePage({ marketId }: { marketId: string }) {
  const router = useRouter();
  const { jwt, setJwt, isHydrated, isSignedIn } = useStoredJwt();
  const [markets, setMarkets] = useState<MarketOption[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [order, setOrder] = useState(initialPerpOrder);
  const [orderLookup, setOrderLookup] = useState(initialOrderLookup);
  const [collateral, setCollateral] = useState(initialCollateral);
  const [priceUpdate, setPriceUpdate] = useState(initialPriceUpdate);
  const [orders, setOrders] = useState<PerpOrderOption[]>([]);
  const [equity, setEquity] = useState<CollateralBalance[]>([]);
  const [depth, setDepth] = useState<PerpDepthSnapshot>({
    bids: [],
    asks: [],
  });
  const [wsStatus, setWsStatus] = useState<WsStatus>("idle");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const assetsById = useMemo(
    () => new Map(assets.map((assetOption) => [assetOption.id, assetOption])),
    [assets],
  );
  const currentMarket = useMemo(
    () => markets.find((market) => market.id === marketId),
    [marketId, markets],
  );
  const resultJson = useMemo(() => {
    if (!result) return "No request sent yet.";
    return JSON.stringify(result.response ?? result.error, null, 2);
  }, [result]);
  const currentStreamName = currentMarket ? `bookTicker.${currentMarket.name}` : "";

  const initializePerpConsole = useEffectEvent(() => {
    void refreshMarkets();
    void refreshAssets();
    void fetchDepthForMarket(marketId);
    void refreshAvailableEquity();
  });

  useEffect(() => {
    if (!isHydrated) return;
    if (!isSignedIn) {
      router.replace("/");
      return;
    }

    initializePerpConsole();
    // initializePerpConsole is a useEffectEvent and is intentionally omitted from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, isSignedIn, marketId, router]);

  useEffect(() => {
    if (!isSignedIn) return;

    const socketUrl = new URL(defaultPerpsWsUrl);
    socketUrl.searchParams.set("marketId", marketId);

    const socket = new WebSocket(socketUrl.toString());
    setWsStatus("connecting");

    socket.addEventListener("open", () => {
      setWsStatus("connected");
    });

    socket.addEventListener("message", (event) => {
      const parsedDepth = extractDepthFromWsMessage(event.data, marketId);

      if (parsedDepth) {
        setDepth((current) => ({
          ...current,
          bids: parsedDepth.bids,
          asks: parsedDepth.asks,
        }));
      }
    });

    socket.addEventListener("error", () => {
      setWsStatus("error");
    });

    socket.addEventListener("close", () => {
      setWsStatus("closed");
    });

    return () => {
      socket.close();
    };
  }, [isSignedIn, marketId]);

  async function callApi(
    method: HttpMethod,
    path: string,
    body?: Record<string, unknown>,
  ) {
    return callDebugApi({
      jwt,
      method,
      path,
      body,
      setResult,
      setIsLoading,
      onSync: (normalizedPath, response) => {
        if (normalizedPath === "/markets") {
          const nextMarkets = extractMarkets(response);
          if (nextMarkets.length > 0) {
            setMarkets((current) => mergeById(current, nextMarkets));
          }
        }

        if (normalizedPath === "/assets") {
          const nextAssets = extractAssets(response);
          if (nextAssets.length > 0) {
            setAssets((current) => mergeById(current, nextAssets));
          }
        }

        if (normalizedPath === "/orders") {
          setOrders(extractPerpOrders(response));
        }

        if (normalizedPath === "/order") {
          const createdOrder = extractCreatedPerpOrder(response);
          if (createdOrder) {
            setOrders((current) => mergeByOrderId(current, [createdOrder]));
          }
        }

        if (normalizedPath === "/equity/available" || normalizedPath === "/onramp") {
          setEquity(extractCollaterals(response));
        }
      },
    });
  }

  async function refreshMarkets() {
    await callApi("GET", "/markets");
  }

  async function refreshAssets() {
    await callApi("GET", "/assets");
  }

  async function refreshOrders() {
    await callApi("GET", withMarketType("/orders", perpMarketType));
  }

  async function refreshAvailableEquity() {
    await callApi("GET", "/equity/available");
  }

  async function fetchDepthForMarket(targetMarketId: string) {
    const depthResult = await callApi(
      "GET",
      withMarketType(`/depth/${targetMarketId}`, perpMarketType),
    );
    const parsedDepth = extractPerpDepth(depthResult.response);

    if (parsedDepth) {
      setDepth(parsedDepth);
    }
  }

  async function forwardPrice() {
    if (!currentMarket) return;

    setIsLoading(true);
    const requestBody = {
      marketId: currentMarket.name,
      price: Number(priceUpdate.price),
    };
    const requestSummary: ApiResult = {
      method: "POST",
      path: "/api/mocker/forward-price",
      requestBody,
    };
    setResult(requestSummary);

    try {
      const response = await fetch("/api/mocker/forward-price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      const text = await response.text();
      const parsedResponse = parseResponse(text);
      setResult({
        ...requestSummary,
        status: response.status,
        ok: response.ok,
        response: parsedResponse,
      });

      if (response.ok) {
        await waitFor(150);
        await fetchDepthForMarket(marketId);
      }
    } catch (error) {
      setResult({
        ...requestSummary,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!isHydrated || !isSignedIn) {
    return (
      <main className={styles.page}>
        <section className={styles.loadingState}>Redirecting to sign in…</section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>CEX PERP API</p>
          <h1>PERP Debug Console</h1>
        </div>
        <div className={styles.status}>
          <span className={styles.statusDotOn} />
          Market {formatMarketName(currentMarket, assetsById, marketId)}
        </div>
      </section>

      <div className={styles.consoleNavRow}>
        <Link href="/" className={styles.secondaryLinkButton}>
          Switch market
        </Link>
        <button type="button" onClick={() => setJwt("")}>
          Reset JWT
        </button>
      </div>

      <section className={styles.layout}>
        <div className={styles.controls}>
          <Panel title="PERP Market">
            <div className={styles.form}>
              <CurrentMarketSummary
                market={currentMarket}
                assetsById={assetsById}
                marketId={marketId}
                kind="PERP"
              />
              <div className={styles.metricGrid}>
                <MetricCard
                  label="Index price"
                  value={formatMaybeNumber(depth.indexPrice)}
                />
                <MetricCard
                  label="Last traded"
                  value={formatMaybeNumber(depth.lastTradedPrice)}
                />
              </div>
              <p className={styles.hintNeutral}>
                Mock exchange stream:{" "}
                <strong>{currentStreamName || "Load markets first"}</strong>
              </p>
            </div>
          </Panel>

          <Panel title="Mock Underlying Price">
            <form
              className={styles.form}
              onSubmit={handleSubmit(() => {
                void forwardPrice();
              })}
            >
              <Field
                label="Mock price"
                type="number"
                value={priceUpdate.price}
                onChange={(value) =>
                  updateFields(setPriceUpdate, priceUpdate, "price", value)
                }
              />
              <div className={styles.buttonRow}>
                <button
                  type="submit"
                  disabled={isLoading || !currentMarket || !priceUpdate.price}
                >
                  Forward price
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    void fetchDepthForMarket(marketId);
                  }}
                >
                  Refresh PERP depth
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="Collateral">
            <form
              className={styles.form}
              onSubmit={handleSubmit(async () => {
                const onramp = await callApi("POST", "/onramp", {
                  marketId,
                  amount: Number(collateral.amount),
                });

                if (onramp.ok) {
                  await refreshAvailableEquity();
                }
              })}
            >
              <Field
                label="Amount"
                type="number"
                value={collateral.amount}
                onChange={(value) =>
                  updateFields(setCollateral, collateral, "amount", value)
                }
              />
              <div className={styles.buttonRow}>
                <button type="submit" disabled={!isSignedIn || isLoading}>
                  Add collateral
                </button>
                <button
                  type="button"
                  disabled={!isSignedIn || isLoading}
                  onClick={() => {
                    void refreshAvailableEquity();
                  }}
                >
                  Get available equity
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="PERP Orders">
            <form
              className={styles.form}
              onSubmit={handleSubmit(async () => {
                const created = await callApi("POST", "/order", {
                  market_id: marketId,
                  price: Number(order.price),
                  quantity: Number(order.quantity),
                  margin: Number(order.margin),
                  leverage: Number(order.leverage),
                  trade_side: order.trade_side,
                  order_type: order.order_type,
                  market_type: perpMarketType,
                });

                if (created.ok) {
                  await refreshOrders();
                  await fetchDepthForMarket(marketId);
                  await refreshAvailableEquity();
                }
              })}
            >
              <div className={styles.inlineGrid}>
                <Field
                  label="Price"
                  type="number"
                  value={order.price}
                  onChange={(value) => updateFields(setOrder, order, "price", value)}
                />
                <Field
                  label="Quantity"
                  type="number"
                  value={order.quantity}
                  onChange={(value) =>
                    updateFields(setOrder, order, "quantity", value)
                  }
                />
              </div>
              <div className={styles.inlineGrid}>
                <Field
                  label="Margin"
                  type="number"
                  value={order.margin}
                  onChange={(value) => updateFields(setOrder, order, "margin", value)}
                />
                <Field
                  label="Leverage"
                  type="number"
                  value={order.leverage}
                  onChange={(value) =>
                    updateFields(setOrder, order, "leverage", value)
                  }
                />
              </div>
              <div className={styles.inlineGrid}>
                <label className={styles.field}>
                  <span>Side</span>
                  <select
                    value={order.trade_side}
                    onChange={(event) =>
                      updateFields(
                        setOrder,
                        order,
                        "trade_side",
                        event.target.value,
                      )
                    }
                  >
                    <option value="LONG">LONG</option>
                    <option value="SHORT">SHORT</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Type</span>
                  <select
                    value={order.order_type}
                    onChange={(event) =>
                      updateFields(
                        setOrder,
                        order,
                        "order_type",
                        event.target.value,
                      )
                    }
                  >
                    <option value="LIMIT">LIMIT</option>
                  </select>
                </label>
              </div>
              <SelectField
                label="Order"
                value={orderLookup.orderId}
                onChange={(value) =>
                  updateFields(setOrderLookup, orderLookup, "orderId", value)
                }
                options={orders.map((orderOption) => ({
                  value: orderOption.orderId,
                  label: formatPerpOrderOption(orderOption),
                }))}
                placeholder="List orders first"
              />
              {orders.length === 0 ? (
                <p className={styles.hint}>
                  List PERP orders to populate the order dropdown.
                </p>
              ) : null}
              <div className={styles.buttonRow}>
                <button type="submit" disabled={!isSignedIn || isLoading}>
                  Create PERP order
                </button>
                <button
                  type="button"
                  disabled={!isSignedIn || isLoading}
                  onClick={() => {
                    void refreshOrders();
                  }}
                >
                  List PERP orders
                </button>
                <button
                  type="button"
                  disabled={!isSignedIn || isLoading || !orderLookup.orderId}
                  onClick={() => {
                    if (!orderLookup.orderId) return;

                    void callApi(
                      "GET",
                      withMarketType(`/order/${orderLookup.orderId}`, perpMarketType),
                    );
                  }}
                >
                  Get PERP order
                </button>
                <button
                  type="button"
                  disabled={!isSignedIn || isLoading || !orderLookup.orderId}
                  onClick={async () => {
                    if (!orderLookup.orderId) return;

                    const deleted = await callApi(
                      "DELETE",
                      `/order/${orderLookup.orderId}`,
                      {
                        market_type: perpMarketType,
                      },
                    );

                    if (deleted.ok) {
                      await refreshOrders();
                      await fetchDepthForMarket(marketId);
                      await refreshAvailableEquity();
                    }
                  }}
                >
                  Delete PERP order
                </button>
              </div>
            </form>
          </Panel>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.depthPanel}>
            <div className={styles.responseHeader}>
              <div>
                <p className={styles.eyebrow}>PERP depth</p>
                <h2>{formatMarketName(currentMarket, assetsById, marketId)}</h2>
              </div>
              <div className={styles.depthActions}>
                <span className={styles.wsStatus} data-status={wsStatus}>
                  WS {wsStatus}
                </span>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    void fetchDepthForMarket(marketId);
                  }}
                  className={styles.refreshButton}
                >
                  Refresh
                </button>
              </div>
            </div>

            <DepthView depth={depth} />
          </section>

          <Panel title="Available Equity">
            <div className={styles.equityList}>
              {equity.length === 0 ? (
                <p className={styles.hint}>No collateral loaded yet.</p>
              ) : (
                equity.map((collateralBalance) => (
                  <div
                    key={`${collateralBalance.marketId}-${collateralBalance.amount}-${collateralBalance.lockedAmount}`}
                    className={styles.equityRow}
                  >
                    <span>
                      {collateralBalance.marketId === marketId
                        ? "Current market"
                        : collateralBalance.marketId}
                    </span>
                    <strong>
                      {formatMaybeNumber(collateralBalance.amount)} / locked{" "}
                      {formatMaybeNumber(collateralBalance.lockedAmount)}
                    </strong>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <section className={styles.responsePanel}>
            <div className={styles.responseHeader}>
              <div>
                <p className={styles.eyebrow}>Latest response</p>
                <h2>{result ? `${result.method} ${result.path}` : "Idle"}</h2>
              </div>
              {result?.status ? (
                <span
                  className={result.ok ? styles.okBadge : styles.errorBadge}
                >
                  {result.status}
                </span>
              ) : null}
            </div>

            {result?.requestBody ? (
              <>
                <h3>Request body</h3>
                <pre>{JSON.stringify(result.requestBody, null, 2)}</pre>
              </>
            ) : null}

            <h3>Response</h3>
            <pre>{resultJson}</pre>
          </section>
        </aside>
      </section>
    </main>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function AuthForm({
  auth,
  setAuth,
  isLoading,
  onSignUp,
  onSignIn,
}: {
  auth: typeof initialAuth;
  setAuth: Dispatch<SetStateAction<typeof initialAuth>>;
  isLoading: boolean;
  onSignUp: () => void;
  onSignIn: () => void;
}) {
  return (
    <form className={styles.form} onSubmit={handleSubmit(onSignUp)}>
      <Field
        label="Username"
        value={auth.username}
        onChange={(value) => updateFields(setAuth, auth, "username", value)}
      />
      <Field
        label="Name"
        value={auth.name}
        onChange={(value) => updateFields(setAuth, auth, "name", value)}
      />
      <Field
        label="Password"
        type="password"
        value={auth.password}
        onChange={(value) => updateFields(setAuth, auth, "password", value)}
      />
      <div className={styles.buttonRow}>
        <button type="submit" disabled={isLoading}>
          Sign up
        </button>
        <button type="button" disabled={isLoading} onClick={onSignIn}>
          Sign in
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password" | "number";
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        step={type === "number" ? "any" : undefined}
        spellCheck={false}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={options.length === 0}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CurrentMarketSummary({
  market,
  assetsById,
  marketId,
  kind,
}: CurrentMarketSummaryProps) {
  return (
    <div className={styles.marketSummary}>
      <p className={styles.eyebrow}>{kind} market</p>
      <h3>{formatMarketName(market, assetsById, marketId)}</h3>
      <p>{marketId}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metricCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DepthView({ depth }: { depth: MarketDepth }) {
  const asks = [...depth.asks].sort(
    (first, second) => second.price - first.price,
  );
  const bids = [...depth.bids].sort(
    (first, second) => second.price - first.price,
  );
  const bestAsk = depth.asks.reduce<number | null>(
    (best, level) => (best === null ? level.price : Math.min(best, level.price)),
    null,
  );
  const bestBid = depth.bids.reduce<number | null>(
    (best, level) => (best === null ? level.price : Math.max(best, level.price)),
    null,
  );
  const spread =
    bestAsk !== null && bestBid !== null
      ? Math.max(bestAsk - bestBid, 0)
      : null;
  const maxTotal = Math.max(
    ...depth.asks.map((level) => level.total),
    ...depth.bids.map((level) => level.total),
    1,
  );

  return (
    <div className={styles.depthBook}>
      <DepthTable levels={asks} maxTotal={maxTotal} side="ask" />
      <div className={styles.spreadRow}>
        <span>Spread</span>
        <strong>{spread === null ? "--" : formatNumber(spread)}</strong>
      </div>
      <DepthTable levels={bids} maxTotal={maxTotal} side="bid" />
    </div>
  );
}

function DepthTable({
  levels,
  maxTotal,
  side,
}: {
  levels: DepthLevel[];
  maxTotal: number;
  side: "ask" | "bid";
}) {
  return (
    <div className={styles.depthTable}>
      <div className={styles.depthHeader}>
        <span>Price</span>
        <span>Qty</span>
        <span>Total</span>
      </div>
      {levels.length === 0 ? (
        <div className={styles.emptyDepth}>No {side}s</div>
      ) : (
        levels.map((level) => {
          const barWidth = Math.min((level.total / maxTotal) * 100, 100);

          return (
            <div
              className={styles.depthRow}
              key={`${side}-${level.price}-${level.quantity}-${level.total}`}
            >
              <span
                className={
                  side === "bid" ? styles.depthBidPrice : styles.depthAskPrice
                }
              >
                {formatNumber(level.price)}
              </span>
              <span>{formatNumber(level.quantity)}</span>
              <span>{formatNumber(level.total)}</span>
              <span
                className={
                  side === "bid" ? styles.depthBidBar : styles.depthAskBar
                }
                style={{ width: `${barWidth}%` }}
              />
            </div>
          );
        })
      )}
    </div>
  );
}

function useStoredJwt() {
  const [jwt, setJwt] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(tokenStorageKey);
    if (storedToken) {
      setJwt(storedToken);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    if (jwt) {
      window.localStorage.setItem(tokenStorageKey, jwt);
    } else {
      window.localStorage.removeItem(tokenStorageKey);
    }
  }, [isHydrated, jwt]);

  return {
    jwt,
    setJwt,
    isHydrated,
    isSignedIn: jwt.trim().length > 0,
  };
}

async function callDebugApi({
  jwt,
  method,
  path,
  body,
  setResult,
  setIsLoading,
  onSignedIn,
  onSync,
}: CallApiOptions) {
  setIsLoading(true);

  const requestBody = body ? pruneEmptyFields(body) : undefined;
  const requestSummary: ApiResult = {
    method,
    path,
    requestBody,
  };

  setResult(requestSummary);

  try {
    const response = await fetch(`/api/debug${path}`, {
      method,
      headers: {
        ...(requestBody ? { "Content-Type": "application/json" } : {}),
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      },
      body: requestBody ? JSON.stringify(requestBody) : undefined,
    });

    const text = await response.text();
    const parsedResponse = parseResponse(text);
    const normalizedPath = path.split("?")[0] ?? path;

    const nextResult = {
      ...requestSummary,
      status: response.status,
      ok: response.ok,
      response: parsedResponse,
    };

    setResult(nextResult);

    if (normalizedPath === "/signin" && response.ok && isObject(parsedResponse)) {
      const nextToken = parsedResponse.jwt;
      if (typeof nextToken === "string") {
        onSignedIn?.(nextToken);
      }
    }

    onSync?.(normalizedPath, parsedResponse);

    return nextResult;
  } catch (error) {
    const nextResult = {
      ...requestSummary,
      error: error instanceof Error ? error.message : String(error),
    };

    setResult(nextResult);
    return nextResult;
  } finally {
    setIsLoading(false);
  }
}

function handleSubmit(callback: () => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    callback();
  };
}

function updateFields<T extends object>(
  setter: Dispatch<SetStateAction<T>>,
  current: T,
  key: keyof T,
  value: string,
) {
  setter({
    ...current,
    [key]: value,
  } as T);
}

function parseResponse(text: string) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function pruneEmptyFields(body: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== ""),
  );
}

function withMarketType(path: string, marketType: MarketType) {
  const [pathname = path, search = ""] = path.split("?");
  const searchParams = new URLSearchParams(search);
  searchParams.set("marketType", marketType);
  const nextSearch = searchParams.toString();
  return nextSearch ? `${pathname}?${nextSearch}` : pathname;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractSpotDepth(response: unknown): MarketDepth | null {
  if (!isObject(response) || !isObject(response.loopbackResponse)) {
    return null;
  }

  const rawDepth = response.loopbackResponse.depth;
  if (!isObject(rawDepth)) {
    return null;
  }

  return {
    bids: parseDepthLevels(rawDepth.bids),
    asks: parseDepthLevels(rawDepth.asks),
  };
}

function extractPerpDepth(response: unknown): PerpDepthSnapshot | null {
  if (!isObject(response) || !isObject(response.loopbackResponse)) {
    return null;
  }

  const loopbackResponse = response.loopbackResponse;
  const rawDepth = loopbackResponse.depth;
  if (!isObject(rawDepth)) {
    return null;
  }

  return {
    bids: parseDepthLevels(rawDepth.bids),
    asks: parseDepthLevels(rawDepth.asks),
    indexPrice: numberFrom(loopbackResponse.indexPrice),
    lastTradedPrice: numberFrom(loopbackResponse.lastTradedPrice),
  };
}

function extractDepthFromWsMessage(message: unknown, selectedMarketId: string) {
  const parsedMessage =
    typeof message === "string" ? parseResponse(message) : message;

  if (!isObject(parsedMessage)) {
    return null;
  }

  if (stringFrom(parsedMessage.marketId) !== selectedMarketId) {
    return null;
  }

  const currentMarketDepth = parsedMessage.currentMarketDepth;
  if (!isObject(currentMarketDepth)) {
    return null;
  }

  return {
    bids: aggregateOrderDepth(currentMarketDepth.bids, "bid"),
    asks: aggregateOrderDepth(currentMarketDepth.asks, "ask"),
  };
}

function aggregateOrderDepth(value: unknown, side: "bid" | "ask") {
  if (!Array.isArray(value)) {
    return [];
  }

  const quantityByPrice = new Map<number, number>();

  for (const order of value) {
    if (!isObject(order)) continue;

    const price =
      numberFrom(order.price) ??
      numberFrom(order.entryPrice);
    const quantity = numberFrom(order.quantity);
    const filled = numberFrom(order.filled) ?? 0;

    if (price === undefined || quantity === undefined) continue;

    const remaining = quantity - filled;
    if (remaining <= 0) continue;

    quantityByPrice.set(price, (quantityByPrice.get(price) ?? 0) + remaining);
  }

  let total = 0;
  return Array.from(quantityByPrice.entries())
    .sort(([firstPrice], [secondPrice]) =>
      side === "bid" ? secondPrice - firstPrice : firstPrice - secondPrice,
    )
    .map(([price, quantity]) => {
      total += quantity;
      return {
        price,
        quantity,
        total,
      };
    });
}

function parseDepthLevels(value: unknown): DepthLevel[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((level) => {
    if (!isObject(level)) {
      return [];
    }

    const price = Number(level.price);
    const quantity = Number(level.quantity);
    const total = Number(level.total);

    if (![price, quantity, total].every(Number.isFinite)) {
      return [];
    }

    return [{ price, quantity, total }];
  });
}

function extractAssets(response: unknown): AssetOption[] {
  if (Array.isArray(response)) {
    return response.flatMap(parseAsset);
  }

  if (isObject(response)) {
    return parseAsset(response.asset);
  }

  return [];
}

function parseAsset(value: unknown): AssetOption[] {
  if (!isObject(value)) {
    return [];
  }

  const id = stringFrom(value.id);
  const name = stringFrom(value.name);
  const symbol = stringFrom(value.symbol);

  if (!id || !symbol) {
    return [];
  }

  return [{ id, name: name || symbol, symbol }];
}

function extractMarkets(response: unknown): MarketOption[] {
  if (Array.isArray(response)) {
    return response.flatMap(parseMarket);
  }

  if (isObject(response)) {
    return parseMarket(response.market);
  }

  return [];
}

function parseMarket(value: unknown): MarketOption[] {
  if (!isObject(value)) {
    return [];
  }

  const marketType = parseMarketType(value.marketType);
  if (marketType === "PERP") {
    return [];
  }

  const id = stringFrom(value.id);
  const name = stringFrom(value.name);
  const baseAssetId = stringFrom(value.baseAssetId);
  const quoteAssetId = stringFrom(value.quoteAssetId);

  if (!id) {
    return [];
  }

  return [
    {
      id,
      name: name || id,
      baseAssetId,
      quoteAssetId,
      marketType,
    },
  ];
}

function parseMarketType(value: unknown): MarketType | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.toUpperCase();
  if (normalizedValue === "SPOT" || normalizedValue === "PERP") {
    return normalizedValue;
  }

  return undefined;
}

function extractSpotOrders(response: unknown): SpotOrderOption[] {
  if (!isObject(response) || !isObject(response.loopbackResponse)) {
    return [];
  }

  const rawOrdersByMarket = response.loopbackResponse.orders;
  if (!Array.isArray(rawOrdersByMarket)) {
    return [];
  }

  return rawOrdersByMarket.flatMap((marketOrders) => {
    if (!isObject(marketOrders) || !Array.isArray(marketOrders.orders)) {
      return [];
    }

    const marketId = stringFrom(marketOrders.marketId);

    return marketOrders.orders.flatMap((rawOrder) =>
      parseSpotOrder(rawOrder, marketId),
    );
  });
}

function extractCreatedSpotOrder(response: unknown): SpotOrderOption | null {
  if (!isObject(response) || !isObject(response.loopbackResponse)) {
    return null;
  }

  const parsedOrders = parseSpotOrder(response.loopbackResponse.order, undefined);
  return parsedOrders[0] ?? null;
}

function parseSpotOrder(
  value: unknown,
  fallbackMarketId?: string,
): SpotOrderOption[] {
  if (!isObject(value)) {
    return [];
  }

  const orderId = stringFrom(value.orderId);
  if (!orderId) {
    return [];
  }

  const marketId = isObject(value.market)
    ? stringFrom(value.market.id) || fallbackMarketId
    : fallbackMarketId;

  return [
    {
      orderId,
      marketId,
      price: numberFrom(value.price),
      quantity: numberFrom(value.quantity),
      tradeSide: stringFrom(value.tradeSide),
    },
  ];
}

function extractPerpOrders(response: unknown): PerpOrderOption[] {
  if (!isObject(response) || !isObject(response.loopbackResponse)) {
    return [];
  }

  const rawOrders = response.loopbackResponse.orders;
  if (!Array.isArray(rawOrders)) {
    return [];
  }

  return rawOrders.flatMap((rawOrder) => parsePerpOrder(rawOrder, undefined));
}

function extractCreatedPerpOrder(response: unknown): PerpOrderOption | null {
  if (!isObject(response) || !isObject(response.loopbackResponse)) {
    return null;
  }

  const parsedOrders = parsePerpOrder(response.loopbackResponse.order, undefined);
  return parsedOrders[0] ?? null;
}

function parsePerpOrder(
  value: unknown,
  fallbackMarketId?: string,
): PerpOrderOption[] {
  if (!isObject(value)) {
    return [];
  }

  const orderId = stringFrom(value.orderId);
  if (!orderId) {
    return [];
  }

  const marketId = isObject(value.market)
    ? stringFrom(value.market.id) || fallbackMarketId
    : fallbackMarketId;

  return [
    {
      orderId,
      marketId,
      price: numberFrom(value.entryPrice),
      quantity: numberFrom(value.quantity),
      tradeSide: stringFrom(value.tradeSide),
      leverage: numberFrom(value.leverage),
      margin: numberFrom(value.margin),
    },
  ];
}

function extractCollaterals(response: unknown): CollateralBalance[] {
  if (!isObject(response) || !isObject(response.loopbackResponse)) {
    return [];
  }

  const collaterals = response.loopbackResponse.collaterals;
  if (!Array.isArray(collaterals)) {
    return [];
  }

  return collaterals.flatMap((collateral) => {
    if (!isObject(collateral)) {
      return [];
    }

    const marketId = stringFrom(collateral.marketId);
    if (!marketId) {
      return [];
    }

    return [
      {
        marketId,
        amount: numberFrom(collateral.amount),
        lockedAmount: numberFrom(collateral.lockedAmount),
      },
    ];
  });
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const byId = new Map(current.map((item) => [item.id, item]));

  for (const item of incoming) {
    byId.set(item.id, item);
  }

  return Array.from(byId.values());
}

function mergeByOrderId<T extends { orderId: string }>(
  current: T[],
  incoming: T[],
) {
  const byId = new Map(current.map((item) => [item.orderId, item]));

  for (const item of incoming) {
    byId.set(item.orderId, item);
  }

  return Array.from(byId.values());
}

function formatAssetOption(asset: AssetOption) {
  return `${asset.symbol} - ${asset.name}`;
}

function formatMarketName(
  market: MarketOption | undefined,
  assetsById: Map<string, AssetOption>,
  fallback = "Unknown market",
) {
  if (!market) {
    return fallback;
  }

  const baseAsset = assetsById.get(market.baseAssetId);
  const quoteAsset = assetsById.get(market.quoteAssetId);

  if (baseAsset && quoteAsset) {
    return `${baseAsset.symbol}/${quoteAsset.symbol}`;
  }

  return market.name || market.id || fallback;
}

function formatSpotOrderOption(order: SpotOrderOption) {
  const parts = [
    order.tradeSide,
    order.price === undefined ? undefined : `price ${formatNumber(order.price)}`,
    order.quantity === undefined
      ? undefined
      : `qty ${formatNumber(order.quantity)}`,
  ].filter(Boolean);

  return `${order.orderId}${parts.length > 0 ? ` - ${parts.join(" / ")}` : ""}`;
}

function formatPerpOrderOption(order: PerpOrderOption) {
  const parts = [
    order.tradeSide,
    order.price === undefined ? undefined : `price ${formatNumber(order.price)}`,
    order.quantity === undefined
      ? undefined
      : `qty ${formatNumber(order.quantity)}`,
    order.margin === undefined
      ? undefined
      : `margin ${formatNumber(order.margin)}`,
    order.leverage === undefined
      ? undefined
      : `lev ${formatNumber(order.leverage)}`,
  ].filter(Boolean);

  return `${order.orderId}${parts.length > 0 ? ` - ${parts.join(" / ")}` : ""}`;
}

function stringFrom(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberFrom(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 8,
  }).format(value);
}

function formatMaybeNumber(value: number | undefined) {
  return value === undefined ? "--" : formatNumber(value);
}

function waitFor(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
