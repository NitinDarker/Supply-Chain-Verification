import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import authRoutes from "./routes/auth.routes";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use("/api/auth", authRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", name: "Velen API", version: "1.0.0" });
});

async function start() {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`[Velen] Server running on http://localhost:${env.port}`);
  });
}

start().catch((err) => {
  console.error("[Velen] Failed to start:", err);
});