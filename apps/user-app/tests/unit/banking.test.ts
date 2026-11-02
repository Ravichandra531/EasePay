/** @jest-environment node */
import { createHmac } from "node:crypto";
import {
  accountFingerprint,
  encryptAccount,
  decryptAccount,
  paymentMode,
  requireGateway,
  validSignature,
  razorpay,
} from "@/lib/banking";
const original = { ...process.env };
beforeEach(() => {
  process.env = {
    ...original,
    BANK_ACCOUNT_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    PAYMENT_PROVIDER: "sandbox",
  };
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
});
afterAll(() => {
  process.env = original;
});
test("bank account numbers use randomized authenticated encryption", () => {
  const first = encryptAccount("12345678901"),
    second = encryptAccount("12345678901");
  expect(first).not.toContain("12345678901");
  expect(first).not.toBe(second);
  expect(decryptAccount(first)).toBe("12345678901");
  const parts = first.split(".");
  parts[1] = Buffer.alloc(16).toString("base64");
  expect(() => decryptAccount(parts.join("."))).toThrow();
});
test("fingerprints are stable and include the IFSC", () => {
  expect(accountFingerprint("HDFC0000001", "12345678901")).toBe(
    accountFingerprint("HDFC0000001", "12345678901"),
  );
  expect(accountFingerprint("HDFC0000001", "12345678901")).not.toBe(
    accountFingerprint("ICIC0000001", "12345678901"),
  );
});
test("signatures authenticate exact original bytes", () => {
  const raw = '{"amount":100}',
    signature = createHmac("sha256", "secret").update(raw).digest("hex");
  expect(validSignature(raw, signature, "secret")).toBe(true);
  expect(validSignature('{ "amount":100}', signature, "secret")).toBe(false);
  expect(validSignature(raw, "bad", "secret")).toBe(false);
  expect(validSignature(raw, signature, "")).toBe(false);
});
test("missing credentials never silently turn into a real payment", () => {
  expect(paymentMode()).toBe("sandbox");
  expect(() => requireGateway()).toThrow("not configured");
  process.env.PAYMENT_PROVIDER = "razorpay";
  expect(() => requireGateway()).toThrow("not configured");
});
test("live credentials require explicit activation and disabled demo mode", () => {
  process.env.PAYMENT_PROVIDER = "razorpay";
  process.env.RAZORPAY_KEY_ID = "rzp_live_example";
  process.env.RAZORPAY_KEY_SECRET = "example";
  expect(() => requireGateway()).toThrow("not enabled");
  process.env.LIVE_PAYMENTS_ENABLED = "true";
  process.env.BANK_SANDBOX_ENABLED = "false";
  expect(requireGateway().mode).toBe("razorpay_live");
  process.env.BANK_SANDBOX_ENABLED = "true";
  expect(() => requireGateway()).toThrow("not enabled");
});
test("test funds cannot use a live payout key", () => {
  process.env.PAYMENT_PROVIDER = "razorpay";
  process.env.RAZORPAY_KEY_ID = "rzp_test_example";
  process.env.RAZORPAYX_KEY_ID = "rzp_live_example";
  process.env.RAZORPAYX_KEY_SECRET = "example";
  expect(() => requireGateway(true)).toThrow("same test or live mode");
});
test("payout requests carry an idempotency key and stay on the fixed provider host", async () => {
  process.env.PAYMENT_PROVIDER = "razorpay";
  process.env.RAZORPAY_KEY_ID = "rzp_test_example";
  process.env.RAZORPAYX_KEY_ID = "rzp_test_example";
  process.env.RAZORPAYX_KEY_SECRET = "example";
  process.env.RAZORPAYX_ACCOUNT_NUMBER = "test-account";
  globalThis.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ id: "pout_test" }) });
  await razorpay("payouts", { amount: 100 }, true, "withdrawal-id");
  expect(fetch).toHaveBeenCalledWith(
    "https://api.razorpay.com/v1/payouts",
    expect.objectContaining({
      headers: expect.objectContaining({
        "X-Payout-Idempotency": "withdrawal-id",
      }),
      body: '{"amount":100}',
    }),
  );
});
