import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import logger from "./config/logger";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import { blockchainService } from "./services/blockchain.service";
import { startUnverifiedCleanupJob } from "./services/accountCleanup.service";
import { startAutoMiningJob } from "./services/autoMining.service";

import authRoutes from "./routes/auth.routes";
import walletRoutes from "./routes/wallet.routes";
import transactionRoutes from "./routes/transaction.routes";
import productRoutes from "./routes/product.routes";
import chainRoutes from "./routes/chain.routes";
import logRoutes from "./routes/logs.routes";

import { generalLimiter } from "./middleware/rateLimiter.middleware";
import { sanitizeInput } from "./middleware/input.security";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on("finish", () => {
    logger.info("HTTP request completed", {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
  });
  next();
});

const allowedOrigins = [
  "http://localhost:3000",
  "https://supply-chain-verification.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(sanitizeInput);
app.use(generalLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/products", productRoutes);
app.use("/api/chain", chainRoutes);
app.use("/api/logs", logRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    name: "Velen API",
    version: "1.0.0",
    chainHeight: blockchainService.chain.getChainLength(),
    developer: "Nitin Sharma",
  });
});

// Error handling middleware
app.use((_req, res) => {
  logger.warn("Route not found");
  res.status(404).json({
    error: "Route not found.",
  });
});

// Entry function
async function start(): Promise<void> {
  await connectDB();
  startUnverifiedCleanupJob();

  await blockchainService.loadFromDB();
  startAutoMiningJob();

  app.listen(env.port, () => {
    logger.info("[Velen] Server started", {
      url: `http://localhost:${env.port}`,
      chainHeight: blockchainService.chain.getChainLength(),
    });
  });
}

start().catch((err) => {
  logger.error("[Velen] Failed to start", { err });
});
