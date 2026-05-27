import { randomUUID } from "crypto";
import { createClient } from "redis";

export const QUEUE_ID = randomUUID();

const responseStream = "response-stream-" + QUEUE_ID;
const redisClient = await createClient({
  url: process.env.REDIS_URL,
}).connect();
const resolveMap: Record<string, (data: any) => void> = {};

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

async function handleRedisResponse() {
  let lastId = "$";

  while (true) {
    try {
      const result = (await redisClient.xRead(
        { key: responseStream, id: lastId },
        { BLOCK: 0, COUNT: 10 },
      )) as StreamReadResponse;

      if (!result) continue;

      for (const stream of result) {
        for (const message of stream.messages) {
          lastId = message.id;
          const payload = getStreamField(message.message, "payload");
          if (!payload) {
            console.error(
              `Redis response stream message ${stream.name}:${message.id} is missing payload`,
            );
            continue;
          }

          const parsedResult = JSON.parse(payload);
          const identifier = parsedResult.identifier;
          const resolve = resolveMap[identifier];
          if (resolve) {
            // Call the resolve function with the parsed result
            resolve(parsedResult);
            delete resolveMap[identifier];
          }
        }
      }
    } catch (err) {
      console.error("Redis listener error:", err);
    }
  }
}

void handleRedisResponse();

export default async function getLoopbackResponse(identifier: string) {
  return new Promise((resolve) => {
    resolveMap[identifier] = resolve;
  });
}
