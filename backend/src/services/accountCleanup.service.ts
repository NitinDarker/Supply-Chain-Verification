import { env } from "../config/env";
import logger from "../config/logger";
import { redis } from "../config/redis";
import { User } from "../models/User.model";

let cleanupRunning = false;

async function cleanupStaleUnverifiedAccounts(): Promise<void> {
  if (cleanupRunning) return;
  cleanupRunning = true;

  try {
    const cutoff = new Date(
      Date.now() - env.unverifiedAccountTtlHours * 60 * 60 * 1000,
    );

    const staleUsers = await User.find({
      status: "unverified",
      createdAt: { $lt: cutoff },
    })
      .select("_id email createdAt lastOtpSentAt otpExpiresAt")
      .limit(500)
      .lean();

    if (staleUsers.length === 0) return;

    const staleIds = staleUsers.map((user) => user._id);
    const staleEmails = staleUsers.map((user) => user.email);

    const deleteResult = await User.deleteMany({
      _id: { $in: staleIds },
      status: "unverified",
      createdAt: { $lt: cutoff },
    });

    const deletedCount = deleteResult.deletedCount ?? 0;
    if (deletedCount === 0) return;

    const pipeline = redis.pipeline();
    for (const user of staleUsers) {
      pipeline.del(`wallet-secrets:${user._id}`);
      pipeline.del(`verify:${user.email}`);
      pipeline.del(`attempts:verify:${user.email}`);
      pipeline.del(`otp-cooldown:verify:${user.email}`);
      pipeline.del(`otp-meta:verify:${user.email}`);
      pipeline.del(`otp-verify-lock:${user.email}`);
    }
    await pipeline.exec();

    logger.info("[Cleanup] Deleted stale unverified users", {
      deletedCount,
      cutoff: cutoff.toISOString(),
      sampleEmail: staleEmails[0],
      sampleCreatedAt: staleUsers[0].createdAt?.toISOString?.() ?? null,
    });
  } catch (error) {
    logger.error("[Cleanup] Failed to delete stale unverified users", { error });
  } finally {
    cleanupRunning = false;
  }
}

export function startUnverifiedCleanupJob(): void {
  const intervalMs = Math.max(env.unverifiedCleanupIntervalMinutes, 1) * 60 * 1000;

  void cleanupStaleUnverifiedAccounts();

  const handle = setInterval(() => {
    void cleanupStaleUnverifiedAccounts();
  }, intervalMs);

  // Allow process shutdown naturally.
  handle.unref();

  logger.info("[Cleanup] Unverified account cleanup started", {
    intervalMinutes: env.unverifiedCleanupIntervalMinutes,
    ttlHours: env.unverifiedAccountTtlHours,
  });
}
