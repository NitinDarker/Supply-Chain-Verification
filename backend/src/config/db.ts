import mongoose from "mongoose";
import { env } from "./env";
import logger from "./logger";

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri);
    logger.info("[MongoDB] Connected successfully");
  } catch (error) {
    logger.error("[MongoDB] Connection failed", { error });
    throw error;
  }
}
