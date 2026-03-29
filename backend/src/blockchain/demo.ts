import { Blockchain, SYSTEM_ADDRESS } from "./blockchain";
import { Transaction } from "./transaction";
import { Wallet } from "./wallet";
import { TxType } from "./types";

const sep = (): void => {
  console.log("\n" + "─".repeat(60));
};
const header = (s: string): void => {
  sep();
  console.log(`▶  ${s}`);
  sep();
};
const ok = (s: string): void => {
  console.log(`  ✓  ${s}`);
};
const info = (s: string): void => {
  console.log(`  ·  ${s}`);
};

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`\n  ASSERTION FAILED: ${message}\n`);
    process.exit(1);
  }
  ok(message);
}

function fundWallet(
  blockchain: Blockchain,
  toAddress: string,
  amount: number,
): void {
  const tx = new Transaction({
    fromAddress: SYSTEM_ADDRESS,
    toAddress,
    amount,
    type: TxType.GENESIS,
  });
  tx.txId = `fund-${toAddress.slice(2, 10)}-${Date.now()}`;
  tx.timestamp = Date.now();
  blockchain.pendingTransactions.push(tx);
}

header("1. Initializing Blockchain");
const chain = new Blockchain();
assert(chain.getChainLength() === 1, "Chain starts with genesis block");
assert(chain.validateChain().valid, "Genesis chain is valid");
info(`Genesis block hash: ${chain.getLatestBlock().hash.slice(0, 20)}...`);

header("2. Creating Wallets");
const manufacturer = new Wallet();
const warehouse = new Wallet();
const distributor = new Wallet();
const retailer = new Wallet();
const validatorNode = new Wallet();
ok(`Manufacturer: ${manufacturer.address}`);
ok(`Warehouse:    ${warehouse.address}`);
ok(`Distributor:  ${distributor.address}`);
ok(`Retailer:     ${retailer.address}`);
ok(`Validator:    ${validatorNode.address}`);

header("3. Funding Wallets");
fundWallet(chain, manufacturer.address, 500);
fundWallet(chain, warehouse.address, 300);
fundWallet(chain, distributor.address, 200);
fundWallet(chain, retailer.address, 100);
chain.minePendingTransactions(validatorNode.address);
assert(
  chain.getBalanceOfAddress(manufacturer.address) === 500,
  "Manufacturer funded: 500",
);
assert(
  chain.getBalanceOfAddress(warehouse.address) === 300,
  "Warehouse funded: 300",
);
assert(
  chain.getBalanceOfAddress(distributor.address) === 200,
  "Distributor funded: 200",
);
assert(
  chain.getBalanceOfAddress(retailer.address) === 100,
  "Retailer funded: 100",
);

header("4. Signed Token Transfer");
const transferTx = manufacturer.createTransfer(warehouse.address, 50);
assert(transferTx.isValid(), "Transfer signature is valid");
const txId = chain.addTransaction(transferTx);
assert(txId === transferTx.txId, "Transaction accepted into mempool");
chain.minePendingTransactions(validatorNode.address);
assert(
  chain.getBalanceOfAddress(manufacturer.address) === 450,
  "Manufacturer balance: 450",
);
assert(
  chain.getBalanceOfAddress(warehouse.address) === 350,
  "Warehouse balance: 350",
);
assert(chain.getChainLength() === 3, "Chain has 3 blocks");

header("5. Product Creation & Supply Chain Tracking");
const PRODUCT_ID = "PROD-SKU-2026-001";

chain.addProductTransaction(
  manufacturer.createProduct(PRODUCT_ID, {
    name: "Industrial Sensor Unit X100",
    location: "Factory A, Karachi",
  }),
);
chain.minePendingTransactions(validatorNode.address);
ok(`Product registered: ${PRODUCT_ID}`);

chain.addProductTransaction(
  manufacturer.moveProduct(PRODUCT_ID, warehouse.address, {
    location: "Central Warehouse, Lahore",
    status: "IN_TRANSIT",
  }),
);
chain.minePendingTransactions(validatorNode.address);
ok("Moved: Manufacturer → Warehouse");

chain.addProductTransaction(
  warehouse.moveProduct(PRODUCT_ID, distributor.address, {
    location: "Distribution Hub, Islamabad",
    status: "IN_TRANSIT",
  }),
);
chain.minePendingTransactions(validatorNode.address);
ok("Moved: Warehouse → Distributor");

chain.addProductTransaction(
  distributor.moveProduct(PRODUCT_ID, retailer.address, {
    location: "Retail Store, Rawalpindi",
    status: "DELIVERED",
  }),
);
chain.minePendingTransactions(validatorNode.address);
ok("Moved: Distributor → Retailer");

const history = chain.getProductHistory(PRODUCT_ID);
assert(history.length === 4, "Product has 4 on-chain events");
info("\n  Full product journey:");
history.forEach((event, i) => {
  const loc = (event.metadata as Record<string, string>).location ?? "N/A";
  console.log(
    `    [${i}] ${event.type.padEnd(16)} ${event.fromAddress.slice(0, 12)}... → ${event.toAddress.slice(0, 12)}...  | ${loc}`,
  );
});

const holder = chain.getCurrentProductHolder(PRODUCT_ID);
assert(
  holder?.currentHolder === retailer.address,
  "Current custodian is Retailer",
);

header("6. Chain Integrity Validation");
assert(
  chain.validateChain().valid,
  `Full chain (${chain.getChainLength()} blocks) is valid`,
);

header("7. Double-Spend Prevention");
const ds1 = manufacturer.createTransfer(warehouse.address, 10);
chain.addTransaction(ds1);
ok("First submission accepted");
try {
  chain.addTransaction(ds1);
  assert(false, "should have thrown");
} catch (e: unknown) {
  assert(
    (e as Error).message.includes("DUPLICATE_PENDING"),
    `Duplicate rejected`,
  );
}
chain.minePendingTransactions(validatorNode.address);
try {
  chain.addTransaction(ds1);
  assert(false, "should have thrown");
} catch (e: unknown) {
  assert(
    (e as Error).message.includes("DOUBLE_SPEND"),
    `Double-spend rejected`,
  );
}

header("8. Tamper Detection");
const tamperedBlock = chain.chain[2];
const originalAmount = tamperedBlock.transactions[0].amount;
tamperedBlock.transactions[0].amount = 9999;
const tamperCheck = chain.validateChain();
assert(!tamperCheck.valid, "Tampered chain detected as invalid");
if (!tamperCheck.valid)
  info(`Detected at block ${tamperCheck.errorAt}: ${tamperCheck.reason}`);
tamperedBlock.transactions[0].amount = originalAmount;
assert(
  chain.validateChain().valid,
  "Chain valid after restoring tampered data",
);

header("9. Insufficient Balance Rejection");
try {
  chain.addTransaction(retailer.createTransfer(manufacturer.address, 999_999));
  assert(false, "should have thrown");
} catch (e: unknown) {
  assert(
    (e as Error).message.includes("INSUFFICIENT_FUNDS"),
    `Overspend rejected`,
  );
}

header("DEMO COMPLETE");
console.log(`
  Chain length : ${chain.getChainLength()} blocks
  Products      : ${chain.getAllProducts().length} registered
  Chain valid   : ${chain.validateChain().valid}

  Balances:
    Manufacturer: ${chain.getBalanceOfAddress(manufacturer.address)}
    Warehouse:    ${chain.getBalanceOfAddress(warehouse.address)}
    Distributor:  ${chain.getBalanceOfAddress(distributor.address)}
    Retailer:     ${chain.getBalanceOfAddress(retailer.address)}
    Validator:    ${chain.getBalanceOfAddress(validatorNode.address)} (rewards)
`);
