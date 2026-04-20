const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }
  return data;
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  walletAddress: string;
  publicKey?: string;
  status?: string;
  profilePictureUrl?: string;
  createdAt?: string;
}

export interface TransactionDTO {
  txId: string | null;
  type: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
  productId: string | null;
  metadata: Record<string, unknown>;
  timestamp: number;
  signature: string | null;
  publicKey: string | null;
  blockIndex?: number | "PENDING";
  status?: "CONFIRMED" | "PENDING";
  blockHash?: string | null;
}

export interface BlockDTO {
  index: number;
  timestamp: number;
  transactions: TransactionDTO[];
  previousHash: string;
  nonce: number;
  hash: string;
}

export interface ProductEvent extends Omit<
  TransactionDTO,
  "blockIndex" | "status" | "blockHash"
> {
  blockIndex: number | null;
  blockHash: string | null;
  status: "CONFIRMED" | "PENDING";
}

export interface ProductSummary {
  productId: string;
  createdAt: number | null;
  currentHolder: string | null;
  totalMoves: number;
  lastUpdated: number | null;
}

export interface ChainStats {
  height: number;
  latestBlockHash: string;
  latestBlockIndex: number;
  latestBlockTime: number;
  pendingTransactions: number;
  difficulty: number;
  totalProducts: number;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const api = {
  // Auth (existing)
  register: (body: {
    username: string;
    email: string;
    password: string;
    role: string;
  }) =>
    request<{ message: string; email: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  verifyOtp: (body: { email: string; otp: string }) =>
    request<{
      message: string;
      user: User;
      walletSecrets: { mnemonic: string; privateKey: string } | null;
    }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  resendOtp: (body: { email: string; purpose?: string }) =>
    request<{ message: string }>("/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<{ message: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => request<{ user: User }>("/auth/me"),
  logout: () =>
    request<{ message: string }>("/auth/logout", { method: "POST" }),
  forgotPassword: (body: { email: string }) =>
    request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  verifyResetOtp: (body: { email: string; otp: string }) =>
    request<{ message: string; resetToken: string }>("/auth/verify-reset-otp", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  resetPassword: (body: {
    email: string;
    resetToken: string;
    newPassword: string;
  }) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Wallet
  walletMe: () => request<{ address: string; balance: number }>("/wallet/me"),
  walletBalance: (address: string) =>
    request<{ address: string; balance: number }>(`/wallet/balance/${address}`),
  walletTransactions: () =>
    request<{ address: string; transactions: TransactionDTO[] }>(
      "/wallet/transactions",
    ),

  // Transactions
  transfer: (body: { toAddress: string; amount: number }) =>
    request<{
      txId: string;
      status: string;
      fromAddress: string;
      toAddress: string;
      amount: number;
    }>("/transactions/transfer", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getTransaction: (txId: string) =>
    request<{ tx: TransactionDTO; blockIndex: number | "PENDING" }>(
      `/transactions/${txId}`,
    ),

  // Products
  registerProduct: (body: {
    productId: string;
    metadata?: Record<string, unknown>;
  }) =>
    request<{
      txId: string;
      status: string;
      productId: string;
      custodian: string;
    }>("/products", { method: "POST", body: JSON.stringify(body) }),
  moveProduct: (body: {
    productId: string;
    toAddress: string;
    metadata?: Record<string, unknown>;
  }) =>
    request<{
      txId: string;
      status: string;
      productId: string;
      from: string;
      to: string;
    }>("/products/move", { method: "POST", body: JSON.stringify(body) }),
  getAllProducts: () =>
    request<{ count: number; products: ProductSummary[] }>("/products"),
  getProductHistory: (productId: string) =>
    request<{ productId: string; count: number; history: ProductEvent[] }>(
      `/products/${productId}`,
    ),
  getProductHolder: (productId: string) =>
    request<{ currentHolder: string; lastEvent: ProductEvent }>(
      `/products/${productId}/holder`,
    ),

  // Chain
  getChain: (page = 1, limit = 20) =>
    request<{ total: number; page: number; limit: number; blocks: BlockDTO[] }>(
      `/chain?page=${page}&limit=${limit}`,
    ),
  getChainStats: () => request<ChainStats>("/chain/stats"),
  getBlock: (index: number) => request<BlockDTO>(`/chain/blocks/${index}`),
  validateChain: () =>
    request<{ valid: boolean; errorAt?: number; reason?: string }>(
      "/chain/validate",
    ),
  getPending: () =>
    request<{ count: number; transactions: TransactionDTO[] }>(
      "/chain/pending",
    ),
  mineBlock: () =>
    request<{ message: string; block: BlockDTO; chainHeight: number }>(
      "/chain/mine",
      {
        method: "POST",
      },
    ),
};

