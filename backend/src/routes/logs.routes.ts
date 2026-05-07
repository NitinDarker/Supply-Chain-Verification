import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { requireRole, authMiddleware } from "../middleware/auth.middleware";

type LogEntry = {
  level?: string;
  message?: string;
  timestamp?: string;
  [key: string]: unknown;
};

const router = Router();
const logFilePath = path.resolve(process.cwd(), "backend", "logs", "combined.log");

router.get(
  "/",
  authMiddleware,
  requireRole("admin"),
  async (req: Request, res: Response) => {
    try {
      const {
        level,
        from,
        to,
        message,
        limit = "50",
        page = "1",
      } = req.query as Record<string, string>;

      if (!fs.existsSync(logFilePath)) {
        res.json({ logs: [], total: 0, page: parseInt(page), limit: parseInt(limit) });
        return;
      }

      const content = await fs.promises.readFile(logFilePath, "utf-8");
      const parsedLogs: LogEntry[] = content
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => {
          try {
            return JSON.parse(line) as LogEntry;
          } catch {
            return { level: "info", message: line };
          }
        });

      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(to) : null;

      const filtered = parsedLogs.filter((log) => {
        if (level && log.level !== level) return false;
        if (message && !String(log.message ?? "").toLowerCase().includes(message.toLowerCase())) return false;

        if (fromDate || toDate) {
          const ts = log.timestamp ? new Date(log.timestamp) : null;
          if (!ts || Number.isNaN(ts.getTime())) return false;
          if (fromDate && ts < fromDate) return false;
          if (toDate && ts > toDate) return false;
        }

        return true;
      });

      const sorted = filtered.sort((a, b) => {
        const aTs = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTs = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return bTs - aTs;
      });

      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.max(1, parseInt(limit) || 50);
      const skip = (pageNum - 1) * limitNum;
      const logs = sorted.slice(skip, skip + limitNum);

      res.json({ logs, total: sorted.length, page: pageNum, limit: limitNum });
    } catch (_err) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  },
);

export default router;
