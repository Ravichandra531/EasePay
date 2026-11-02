/** @jest-environment node */
jest.mock("@repo/db", () => ({
  prisma: {
    $transaction: jest.fn(),
    phoneVerification: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));
jest.mock("next/headers", () => ({ cookies: jest.fn(), headers: jest.fn() }));
jest.mock("@/lib/otp-provider", () => {
  const actual = jest.requireActual("@/lib/otp-provider");
  return {
    ...actual,
    otpProvider: jest.fn(() => "twilio"),
    otpDigest: jest.fn((value: string) => "hash:" + value),
    issuePhoneCode: jest.fn(),
    checkPhoneCode: jest.fn(),
  };
});
import { prisma } from "@repo/db";
import { cookies, headers } from "next/headers";
import {
  beginPhoneVerification,
  verifyPhoneChallenge,
  consumePhoneProof,
  loginWithPhoneCode,
} from "@/lib/phone-verification";
import { issuePhoneCode, checkPhoneCode } from "@/lib/otp-provider";
const db = prisma as unknown as {
  $transaction: jest.Mock;
  phoneVerification: {
    findFirst: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
};
const tx = {
  $queryRaw: jest.fn(),
  authRateLimit: { upsert: jest.fn(), updateMany: jest.fn() },
  phoneVerification: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
  user: { findUnique: jest.fn(), update: jest.fn() },
};
const session = "a".repeat(64),
  id = "challenge12345",
  phone = "9876543210";
const challenge = () => ({
  id,
  phone,
  purpose: "signup",
  provider: "twilio",
  sessionHash: "hash:session:" + session,
  providerSid: "VE" + "c".repeat(32),
  codeHash: null,
  attempts: 0,
  sentAt: new Date(),
  verifiedAt: null,
  consumedAt: null,
  expiresAt: new Date(Date.now() + 600000),
  createdAt: new Date(),
});
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(cookies)
    .mockResolvedValue({
      get: () => ({ value: session }),
      set: jest.fn(),
    } as never);
  jest.mocked(headers).mockResolvedValue({ get: () => "203.0.113.1" } as never);
  db.$transaction.mockImplementation(async (fn) => fn(tx));
  tx.phoneVerification.findFirst.mockResolvedValue(null);
  tx.authRateLimit.updateMany.mockResolvedValue({ count: 1 });
  tx.phoneVerification.updateMany.mockResolvedValue({ count: 1 });
  tx.phoneVerification.create.mockResolvedValue(challenge());
  db.phoneVerification.findFirst.mockResolvedValue(challenge());
  db.phoneVerification.updateMany.mockResolvedValue({ count: 1 });
  jest
    .mocked(issuePhoneCode)
    .mockResolvedValue({ providerSid: "VE" + "c".repeat(32), codeHash: null });
  jest.mocked(checkPhoneCode).mockResolvedValue(true);
});
test("sending persists a browser-bound expiring challenge without returning a code", async () => {
  const result = await beginPhoneVerification(phone, "signup");
  expect(result).toMatchObject({
    challengeId: id,
    resendAfter: 60,
    delivery: "sms",
  });
  expect(result).not.toHaveProperty("code");
  expect(tx.phoneVerification.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      phone,
      purpose: "signup",
      sessionHash: "hash:session:" + session,
      expiresAt: expect.any(Date),
    }),
  });
  expect(issuePhoneCode).toHaveBeenCalledWith(id, phone, "twilio");
});
test("resend cooldown prevents sending another SMS", async () => {
  tx.phoneVerification.findFirst.mockResolvedValue({ createdAt: new Date() });
  await expect(beginPhoneVerification(phone, "signup")).rejects.toThrow(
    "60 seconds",
  );
  expect(issuePhoneCode).not.toHaveBeenCalled();
});
test("hourly throttling is enforced before contacting the SMS provider", async () => {
  tx.authRateLimit.updateMany.mockResolvedValue({ count: 0 });
  await expect(beginPhoneVerification(phone, "signup")).rejects.toThrow(
    "Too many codes",
  );
  expect(issuePhoneCode).not.toHaveBeenCalled();
});
test("expired or other-browser verifications fail without checking a code", async () => {
  db.phoneVerification.findFirst.mockResolvedValue(null);
  await expect(verifyPhoneChallenge(id, "123456", "signup")).rejects.toThrow(
    "expired",
  );
  expect(checkPhoneCode).not.toHaveBeenCalled();
  expect(db.phoneVerification.findFirst).toHaveBeenCalledWith({
    where: expect.objectContaining({
      sessionHash: "hash:session:" + session,
      purpose: "signup",
      expiresAt: { gt: expect.any(Date) },
    }),
  });
});
test("the sixth attempt is rejected before calling Twilio", async () => {
  db.phoneVerification.updateMany.mockResolvedValue({ count: 0 });
  await expect(verifyPhoneChallenge(id, "123456", "signup")).rejects.toThrow(
    "Too many attempts",
  );
  expect(checkPhoneCode).not.toHaveBeenCalled();
});
test("incorrect codes do not produce a verified proof", async () => {
  jest.mocked(checkPhoneCode).mockResolvedValue(false);
  await expect(verifyPhoneChallenge(id, "123456", "signup")).rejects.toThrow(
    "incorrect",
  );
  expect(db.phoneVerification.updateMany).toHaveBeenCalledTimes(1);
});
test("verified signup proof is bound to phone, purpose, browser, and provider", async () => {
  await consumePhoneProof(tx as never, id, phone, "signup", "browser-hash");
  expect(tx.phoneVerification.updateMany).toHaveBeenCalledWith({
    where: expect.objectContaining({
      id,
      phone,
      purpose: "signup",
      sessionHash: "browser-hash",
      provider: "twilio",
      consumedAt: null,
      verifiedAt: { not: null },
    }),
    data: { consumedAt: expect.any(Date), codeHash: null },
  });
});
test("a consumed signup proof cannot create a second account", async () => {
  tx.phoneVerification.updateMany.mockResolvedValue({ count: 0 });
  await expect(
    consumePhoneProof(tx as never, id, phone, "signup", "browser-hash"),
  ).rejects.toThrow("Verify this phone");
});
test("OTP login consumes proof and stamps genuine phone verification", async () => {
  db.phoneVerification.findFirst.mockResolvedValue({
    ...challenge(),
    purpose: "login",
  });
  tx.user.findUnique.mockResolvedValue({
    id: 7,
    name: "Alice",
    email: "alice@example.com",
    number: phone,
  });
  await expect(loginWithPhoneCode(id, "123456")).resolves.toMatchObject({
    id: "7",
    name: "Alice",
  });
  expect(tx.phoneVerification.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({ purpose: "login", consumedAt: null }),
    }),
  );
  expect(tx.user.update).toHaveBeenCalledWith({
    where: { id: 7 },
    data: {
      phoneVerifiedAt: expect.any(Date),
      phoneVerificationProvider: "twilio",
    },
  });
});
