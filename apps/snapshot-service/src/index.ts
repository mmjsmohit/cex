import { OrderStatus, prisma } from "@repo/db";
import { createClient } from "redis";

const SNAPSHOT_STREAM = "snapshot-events";
const SNAPSHOT_GROUP = "snapshot-service-group";
const SNAPSHOT_CONSUMER = `snapshot-service-${process.pid}`;

const redisClient = await createClient({
  url: process.env.REDIS_URL,
}).connect();

type StreamReadResponse = Array<{
  name: string;
  messages: Array<{
    id: string;
    message: Record<string, string> | Map<string, string>;
  }>;
}> | null;

function getStreamField(
  fields: Record<string, string> | Map<string, string>,
  field: string,
) {
  return fields instanceof Map ? fields.get(field) : fields[field];
}

async function ensureConsumerGroup(stream: string, group: string) {
  try {
    await redisClient.xGroupCreate(stream, group, "0", { MKSTREAM: true });
  } catch (error) {
    if (!String(error).includes("BUSYGROUP")) throw error;
  }
}

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
  await ensureConsumerGroup(SNAPSHOT_STREAM, SNAPSHOT_GROUP);

  while (true) {
    const result = (await redisClient.xReadGroup(
      SNAPSHOT_GROUP,
      SNAPSHOT_CONSUMER,
      { key: SNAPSHOT_STREAM, id: ">" },
      { BLOCK: 0, COUNT: 10 },
    )) as StreamReadResponse;

    if (!result) continue;

    for (const stream of result) {
      for (const message of stream.messages) {
        try {
          const payload = getStreamField(message.message, "payload");
          if (!payload) {
            throw new Error(
              `Redis stream message ${stream.name}:${message.id} is missing payload`,
            );
          }

          const parsedResult = JSON.parse(payload);
          await saveSnapshotToDB(parsedResult);
          await redisClient.xAck(SNAPSHOT_STREAM, SNAPSHOT_GROUP, message.id);
        } catch (err) {
          console.error("Redis listener error:", err);
        }
      }
    }
  }
}

void handleRedisResponse();
function getOrderStatus(parsedResult: any): OrderStatus {
  return OrderStatus.FILLED;
}
