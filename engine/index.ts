// This engine is responsible for building and storing the orderbook and balances.

// The engine handles creating orders, sending depth (ordersbook as a whole), user balances by receiving them from the
// redis queue and returning the response into another queue.

import { RedisClient } from "bun";
import type { Balances } from "./types/balances.types";
import type { OrderBook } from "./types/orderbook.types";

// Define and initiate the clients for pushing and reading from Redis
const publisherClient = new RedisClient(process.env.REDIS_URL);
const subscriberClient = new RedisClient(process.env.REDIS_URL);

// Called when successfully connected to Redis server
publisherClient.onconnect = () => {
  console.log("Connected to Publisher Redis server");
};
subscriberClient.onconnect = () => {
  console.log("Connected to Subscriber Redis server");
};

publisherClient.onclose = (error) => {
  console.error("Disconnected from Publisher Redis server:", error);
};
subscriberClient.onclose = (error) => {
  console.error("Disconnected from the Subscriber Redis Client");
};

// Global in memory Balances Array
// Balances array which will store the balances of the users for each asset along with the fiat balance and locked fiat
export let BALANCES: Balances = {};

// Global Orderbook Object which includes every asset
// Stores the orderbooks of all the assets with their bids, asks and last traded price
export let ORDERBOOK: OrderBook = {};

async function* incomingMessageStream(subscribingClient: RedisClient) {
  while (true) {
    const response = await subscribingClient.send("BRPOP", [
      "incoming-orders",
      "balance",
      "1",
    ]);
    if (!response) continue;
    const [queue, message, block] = response;
    yield JSON.parse(message);
  }
}

for await (const parsedResponse of incomingMessageStream(subscriberClient)) {
  let data = {};
  const identifier = parsedResponse.identifier;
  if (parsedResponse.type === "create_order") {
  }

  if (parsedResponse.type === "get_depth") {
  }

  if (parsedResponse.type === "get_balance") {
    const { userId } = parsedResponse;
    const balance = BALANCES[userId];
    data = {
      type: "get_balance",
      userId,
      balance,
      identifier,
    };
  }

  if (parsedResponse.type === "get_usd_balance") {
    const { userId } = parsedResponse;
    const balance = BALANCES[userId];
    if (!balance) BALANCES[userId] = [];
    console.log(balance);
    data = {
      type: "get_usd_balance",
      userId,
      balance,
      identifier,
    };
  }

  if (parsedResponse.type === "add_balance") {
    let finalBalance: number;
    const { userId, usdAmount } = parsedResponse;
    if (!BALANCES[userId]) BALANCES[userId] = [];

    // Check if the user already has a USD balance, and update it if so
    // TODO: Migrate to using the ID of the USD Asset in DB
    const previousUsdBalance = BALANCES[userId]?.find(
      (asset) => asset.assetId === "usd",
    );
    if (previousUsdBalance) {
      finalBalance = previousUsdBalance.amount + usdAmount;
      previousUsdBalance.amount = finalBalance;
    } else {
      finalBalance = usdAmount;
      BALANCES[userId].push({
        assetId: "usd",
        amount: usdAmount,
        lockedAmount: 0,
      });
    }
    console.log(BALANCES);

    data = {
      type: "add_balance",
      userId,
      finalBalance,
      identifier,
    };
  }

  const response = await publisherClient.send("LPUSH", [
    "response-queue-" + parsedResponse.queue_id,
    JSON.stringify(data),
  ]);
}
