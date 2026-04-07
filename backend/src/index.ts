import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { env } from "./config/env";
import { connectDB } from "./config/db";
import { blockchainService } from "./services/blockchain.service";

import authRoutes from "./routes/auth.routes";
import walletRoutes from "./routes/wallet.routes";
import transactionRoutes from "./routes/transaction.routes";
import productRoutes from "./routes/product.routes";
import chainRoutes from "./routes/chain.routes";
import logRoutes from "./routes/logs.routes"

import { generalLimiter } from "./middleware/rateLimiter.middleware";
import { sanitizeInput } from "./middleware/sanitize";

const app = express();

app.use(express.json());
app.use(cookieParser());

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
app.use("/api/logs", logRoutes)

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    name: "Velen API",
    version: "1.0.0",
    chainHeight: blockchainService.chain.getChainLength(),
    developer: "Nitin Sharma",
  });
});

// Error Handling Middlware
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

async function start(): Promise<void> {
  await connectDB();

  // Rebuild in-memory chain from MongoDB before accepting requests
  await blockchainService.loadFromDB();

  // Auto-mine every 30s if there are pending transactions
  const VALIDATOR_ADDRESS = process.env.VALIDATOR_ADDRESS;
  if (VALIDATOR_ADDRESS) {
    setInterval(async () => {
      if (blockchainService.chain.pendingTransactions.length === 0) return;
      try {
        const block =
          blockchainService.chain.minePendingTransactions(VALIDATOR_ADDRESS);
        await blockchainService.persistBlock(block);
        await blockchainService.clearPendingTxs();
        console.log(
          `[Chain] Block #${block.index} mined. Txs: ${block.transactions.length}`,
        );
      } catch (err) {
        console.error("[Chain] Auto-mine failed:", err);
      }
    }, 30_000);
  } else {
    console.warn(
      "[Chain] VALIDATOR_ADDRESS not set — auto-mining disabled. Use POST /api/chain/mine manually.",
    );
  }

  app.listen(env.port, () => {
    console.log(`[Velen] Server running on http://localhost:${env.port}`);
    console.log(
      `[Chain] Height: ${blockchainService.chain.getChainLength()} blocks`,
    );
  });
}

start().catch((err) => {
  console.error("[Velen] Failed to start:", err);
});
