import { createClient } from "redis";

export const publisherClient = createClient({
  url: process.env.REDIS_URL,
});

export const subscriberClient = createClient({
  url: process.env.REDIS_URL,
});

export const publisherReady = publisherClient.connect().then(() => {
  console.log("Connected to Publisher Redis server");
});

export const subscriberReady = subscriberClient.connect().then(() => {
  console.log("Connected to Subscriber Redis server");
});
