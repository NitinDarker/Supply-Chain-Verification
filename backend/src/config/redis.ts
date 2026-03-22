import Redis from "ioredis";
import { env } from "./env";

export const redis = new Redis(env.redisUrl);

redis.on("connect", () => {
  console.log("[Redis] Connected successfully");
});

redis.on("error", (err) => {
  console.error("[Redis] Error:", err.message);
});
