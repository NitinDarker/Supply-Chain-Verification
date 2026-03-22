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

// Auth API calls
export const api = {
  register: (body: { username: string; email: string; password: string; role: string }) =>
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

  resetPassword: (body: { email: string; resetToken: string; newPassword: string }) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  walletAddress: string;
  publicKey?: string;
  status?: string;
  createdAt?: string;
}
