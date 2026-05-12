import { prisma } from "@repo/db";
import { redis } from "bun";

async function handleRedisResponse() {
  while (true) {
    try {
      const result = await redis.brpop("snapshot-queue", 0);
      const parsedResult = JSON.parse(result?.[1]!);
    } catch (err) {
      console.error("Redis listener error:", err);
    }
  }
}

handleRedisResponse();
