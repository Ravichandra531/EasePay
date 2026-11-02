/** @jest-environment node */
import {
  codeMatches,
  issuePhoneCode,
  checkPhoneCode,
  otpDigest,
  otpProvider,
} from "@/lib/otp-provider";
const original = { ...process.env };
beforeEach(() => {
  process.env = {
    ...original,
    OTP_SECRET: "test-otp-secret-with-at-least-thirty-two-characters",
    OTP_PROVIDER: "console",
    ALLOW_DEV_OTP: "true",
    BANK_SANDBOX_ENABLED: "true",
    NODE_ENV: "development",
    LIVE_PAYMENTS_ENABLED: "false",
  };
  jest.restoreAllMocks();
});
afterAll(() => {
  process.env = original;
  jest.restoreAllMocks();
});
test("development codes are random, hashed, and never included in returned data", async () => {
  const log = jest.spyOn(console, "info").mockImplementation(() => {});
  const result = await issuePhoneCode("challenge", "9876543210", "console");
  const code = String(log.mock.calls[0]?.[0]).match(/· (\d{6})$/)?.[1];
  expect(code).toMatch(/^\d{6}$/);
  expect(result).not.toHaveProperty("code");
  expect(result.providerSid).toBeNull();
  expect(codeMatches("challenge", code!, result.codeHash!)).toBe(true);
  expect(codeMatches("another-challenge", code!, result.codeHash!)).toBe(false);
});
test("code hashes are bound to the challenge and invalid formats fail", () => {
  const hash = otpDigest("one:123456");
  expect(codeMatches("one", "123456", hash)).toBe(true);
  expect(codeMatches("one", "123457", hash)).toBe(false);
  expect(codeMatches("one", "12345", hash)).toBe(false);
  expect(codeMatches("two", "123456", hash)).toBe(false);
});
test.each(["production", "test"] as const)(
  "development codes are rejected in %s",
  (mode) => {
    process.env = { ...process.env, NODE_ENV: mode };
    expect(() => otpProvider()).toThrow("disabled");
  },
);
test("development OTP requires an explicit local-only opt-in", () => {
  process.env.ALLOW_DEV_OTP = "false";
  expect(() => otpProvider()).toThrow("disabled");
  process.env.ALLOW_DEV_OTP = "true";
  process.env.LIVE_PAYMENTS_ENABLED = "true";
  expect(() => otpProvider()).toThrow("disabled");
});
test("missing SMS configuration never falls back to a fake code", () => {
  process.env.OTP_PROVIDER = "twilio";
  delete process.env.TWILIO_VERIFY_SERVICE_SID;
  expect(() => otpProvider()).toThrow("not configured");
});
test("Twilio receives an E.164 destination and checks the specific verification SID", async () => {
  process.env.OTP_PROVIDER = "twilio";
  process.env.TWILIO_VERIFY_SERVICE_SID = "VA" + "a".repeat(32);
  process.env.TWILIO_ACCOUNT_SID = "AC" + "b".repeat(32);
  process.env.TWILIO_AUTH_TOKEN = "test-token";
  const sid = "VE" + "c".repeat(32);
  globalThis.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ sid, status: "pending" }),
    })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: "approved" }),
    });
  await issuePhoneCode("challenge", "9876543210", "twilio");
  expect(fetch).toHaveBeenNthCalledWith(
    1,
    expect.stringContaining("/Verifications"),
    expect.objectContaining({ body: expect.any(URLSearchParams) }),
  );
  expect(String(jest.mocked(fetch).mock.calls[0]?.[1]?.body)).toContain(
    "To=%2B919876543210",
  );
  expect(
    await checkPhoneCode(
      "challenge",
      "9876543210",
      "123456",
      "twilio",
      null,
      sid,
    ),
  ).toBe(true);
  const body = String(jest.mocked(fetch).mock.calls[1]?.[1]?.body);
  expect(body).toContain(`VerificationSid=${sid}`);
  expect(body).toContain("Code=123456");
});
