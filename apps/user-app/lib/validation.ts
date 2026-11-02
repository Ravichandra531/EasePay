import { z } from "zod";
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, "Enter a 10-digit phone number");
export const amountSchema = z
  .number()
  .int()
  .min(100, "Minimum amount is ₹1")
  .max(10_000_000, "Maximum amount is ₹1,00,000");
export const BANKS = ["HDFC Bank", "Axis Bank", "SBI", "ICICI Bank"] as const;
export const signupSchema = z.object({
  accountType: z.enum(["personal", "merchant"]).default("personal"),
  businessName: z.string().trim().max(100).optional(),
  name: z.string().trim().min(1, "Enter your name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: phoneSchema,
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(72, "Use at most 72 characters"),
});
/** Parse decimal input exactly. Never round away fractions of a paise. */
export function parseAmount(value: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const amount =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(amount) && amountSchema.safeParse(amount).success
    ? amount
    : null;
}
