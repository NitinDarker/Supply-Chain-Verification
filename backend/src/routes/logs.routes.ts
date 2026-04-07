import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { requireRole, authMiddleware } from "../middleware/auth.middleware";

const router = Router();

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

      const filter: Record<string, any> = {};

      if (level) filter.level = level;
      if (message) filter.message = { $regex: message, $options: "i" };

      if (from || to) {
        filter.timestamp = {};
        if (from) filter.timestamp.$gte = new Date(from);
        if (to) filter.timestamp.$lte = new Date(to);
      }

      const col = mongoose.connection.collection("logs");
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [logs, total] = await Promise.all([
        col
          .find(filter)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray(),
        col.countDocuments(filter),
      ]);

      res.json({ logs, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  },
);

export default router;
