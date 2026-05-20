import { OrderStatus, prisma } from "@repo/db";
import { redis } from "bun";

async function saveSnapshotToDB(parsedResult: any) {
  // Check if the orderId is already present in the DB
  const orderCheck = await prisma.orderHistory.findFirst({
    where: {
      id: parsedResult.orderId,
    },
  });

  if (orderCheck) {
    // If the order is already there in the DB, check if all the fills are present
    // const fillCount = orderCheck?.
  } else {
    // Insert the order in DB since it is not present
    return await prisma.fills.create({
      data: {
        makerUserId: parsedResult.makerUserId,
        takerUserId: parsedResult.takerUserId,
        originalOrderId: parsedResult.originalOrderId,
        originalOrderTimestamp: new Date(parsedResult.originalOrderTimestamp),
        amount: parsedResult.amount,
        price: parsedResult.price,
        type: parsedResult.type,
        marketType: parsedResult.marketType,
        side: parsedResult.side,
        liquidType: parsedResult.liquidType,
        marketId: parsedResult.marketId,
        fee: "0",
      },
    });
  }
}

async function handleRedisResponse() {
  while (true) {
    try {
      const result = await redis.brpop("snapshot-queue", 0);
      const parsedResult = JSON.parse(result?.[1]!);
      await saveSnapshotToDB(parsedResult);
    } catch (err) {
      console.error("Redis listener error:", err);
    }
  }
}

handleRedisResponse();
function getOrderStatus(parsedResult: any): OrderStatus {
  return OrderStatus.FILLED;
}
