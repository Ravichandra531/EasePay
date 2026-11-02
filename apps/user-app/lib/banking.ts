import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
export type PaymentMode = "sandbox" | "razorpay_test" | "razorpay_live";
export class BankingError extends Error {}
export function paymentMode(): PaymentMode {
  if (process.env.PAYMENT_PROVIDER !== "razorpay") return "sandbox";
  return process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live_")
    ? "razorpay_live"
    : "razorpay_test";
}
export function requireGateway(payout = false) {
  const mode = paymentMode();
  const key = process.env[payout ? "RAZORPAYX_KEY_ID" : "RAZORPAY_KEY_ID"],
    secret =
      process.env[payout ? "RAZORPAYX_KEY_SECRET" : "RAZORPAY_KEY_SECRET"];
  if (mode === "sandbox" || !key || !secret)
    throw new BankingError(
      payout
        ? "Bank payouts are not configured yet."
        : "Payment checkout is not configured yet.",
    );
  const prefix = mode === "razorpay_live" ? "rzp_live_" : "rzp_test_";
  if (!key.startsWith(prefix))
    throw new BankingError(
      "Checkout and payouts must use the same test or live mode.",
    );
  if (
    mode === "razorpay_live" &&
    (process.env.LIVE_PAYMENTS_ENABLED !== "true" ||
      process.env.BANK_SANDBOX_ENABLED === "true")
  )
    throw new BankingError(
      "Live payments are not enabled. Complete the live provider setup first.",
    );
  if (payout && !process.env.RAZORPAYX_ACCOUNT_NUMBER)
    throw new BankingError("The payout funding account is not configured.");
  return { key, secret, mode };
}
export async function razorpay<T>(
  path: string,
  body?: unknown,
  payout = false,
  requestId?: string,
): Promise<T> {
  const { key, secret } = requireGateway(payout);
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(requestId ? { "X-Payout-Idempotency": requestId } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new BankingError(
      "The bank provider could not confirm this request. Check the payment status before retrying.",
    );
  return response.json() as Promise<T>;
}
export function validSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  if (!secret || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  return timingSafeEqual(
    createHmac("sha256", secret).update(payload).digest(),
    Buffer.from(signature, "hex"),
  );
}
function encryptionKey() {
  const value = process.env.BANK_ACCOUNT_ENCRYPTION_KEY;
  const key = value ? Buffer.from(value, "base64") : Buffer.alloc(0);
  if (key.length !== 32)
    throw new BankingError("Bank account encryption is not configured.");
  return key;
}
export function encryptAccount(value: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv),
    encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((b) => b.toString("base64"))
    .join(".");
}
export function decryptAccount(value: string) {
  const [iv, tag, data] = value.split(".").map((s) => Buffer.from(s, "base64"));
  if (!iv || !tag || !data)
    throw new BankingError("Bank details could not be read.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}
export function accountFingerprint(ifsc: string, account: string) {
  return createHmac("sha256", encryptionKey())
    .update(`${ifsc}:${account}`)
    .digest("hex");
}
export function accountReference(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}
