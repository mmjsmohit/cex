import { redis } from "bun";

async function* listenToOrderUpdates() {
  while (true) {
    try {
      const result = await redis.brpop("order-updates", 0);
      const parsedResult = JSON.parse(result?.[1]!);
      yield parsedResult;
    } catch (err) {
      console.error("Redis listener error:", err);
    }
  }
}

Bun.serve({
  port: 4000,
  fetch(req, serve) {
    if (serve.upgrade(req)) {
      return;
    }
    return new Response("Upgrade Failed", { status: 500 });
  },
  websocket: {
    async open(ws) {
      console.log("Client is connected, sending order updates from now!");
      for await (const parsedOrderUpdates of listenToOrderUpdates()) {
        ws.publish(
          parsedOrderUpdates.marketId,
          JSON.stringify(parsedOrderUpdates),
        );
      }
    },
    message(ws, message) {},
  },
});
