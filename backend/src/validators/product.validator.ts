import { z } from "zod";

export const registerProductSchema = z.object({
  productId: z
    .string()
    .min(1)
    .max(64)
    .regex(
      /^[a-zA-Z0-9_:-]+$/,
      "Product ID: alphanumeric, hyphens, colons only",
    ),
  metadata: z
    .object({
      name: z.string().max(100).optional(),
      description: z.string().max(500).optional(),
      location: z.string().max(100).optional(),
    })
    .optional(),
});

export const moveProductSchema = z.object({
  productId: z.string().min(1).max(64),
  toAddress: z.string().min(10).max(130),
  metadata: z
    .object({
      location: z.string().max(100).optional(),
      status: z
        .enum(["IN_TRANSIT", "DELIVERED", "HELD", "RETURNED"])
        .optional(),
    })
    .optional(),
});

export const transferSchema = z.object({
  toAddress: z.string().min(10).max(130),
  amount: z.number().positive().max(1_000_000),
});
