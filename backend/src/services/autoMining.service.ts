import logger from "../config/logger";
import { blockchainService } from "./blockchain.service";

const AUTO_MINE_INTERVAL_MS = 60_000;

export function startAutoMiningJob(): void {
  const validatorAddress = process.env.VALIDATOR_ADDRESS;

  if (!validatorAddress) {
    logger.warn(
      "[Chain] VALIDATOR_ADDRESS not set - auto-mining disabled. Use POST /api/chain/mine manually.",
    );
    return;
  }

  const handle = setInterval(async () => {
    try {
      const block =
        await blockchainService.minePendingTransactionsAtomic(validatorAddress);
      logger.info("[Chain] Block mined", {
        blockIndex: block.index,
        transactionCount: block.transactions.length,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.startsWith("NO_PENDING_TXS") ||
        message.startsWith("CHAIN_WRITE_LOCKED")
      ) {
        return;
      }
      logger.error("[Chain] Auto-mine failed", { err });
    }
  }, AUTO_MINE_INTERVAL_MS);

  handle.unref();
}
