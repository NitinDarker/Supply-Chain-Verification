import Redis from "ioredis";
import { env } from "./env";
import logger from "./logger";

export const redis = new Redis(env.redisUrl);

redis.on("connect", () => {
  logger.info("[Redis] Connected successfully");
});

redis.on("error", (err) => {
  logger.error("[Redis] Error", { message: err.message });
});
