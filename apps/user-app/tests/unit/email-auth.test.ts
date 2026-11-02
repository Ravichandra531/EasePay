/** @jest-environment node */
jest.mock("@repo/db", () => ({
  prisma: {
    $transaction: jest.fn(),
    user: { findUnique: jest.fn(), update: jest.fn() },
  },
  Prisma: { PrismaClientKnownRequestError: class extends Error {} },
}));
jest.mock("@/lib/supabase-email", () => ({
  ...jest.requireActual("@/lib/supabase-email"),
  verifyEmailCode: jest.fn(),
}));
jest.mock("bcryptjs", () => ({
  hash: jest.fn(async () => "hashed"),
  compare: jest.fn(async () => true),
}));
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(async () => ({ user: { id: "7" } })),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
import { prisma } from "@repo/db";
import { verifyEmailCode, EmailOtpError } from "@/lib/supabase-email";
import { signUp } from "@/lib/actions/signUp";
import { updateProfile } from "@/lib/actions/updateProfile";
import { authOptions } from "@/lib/auth";
import type { CredentialsConfig } from "next-auth/providers/credentials";
const tx = {
  user: { create: jest.fn() },
  balance: { create: jest.fn() },
  merchant: { create: jest.fn() },
};
const input = {
  name: "Alice",
  email: "alice@example.com",
  phone: "9876543210",
  password: "password123",
  emailCode: "123456",
};
const db = prisma as unknown as {
  $transaction: jest.Mock;
  user: { findUnique: jest.Mock; update: jest.Mock };
};
// NextAuth merges each provider's options during initialization.
const configuredProviders = authOptions.providers as unknown as {
  options: CredentialsConfig;
}[];
const authorize = configuredProviders.find((p) => p.options.id === "email-otp")!
  .options.authorize;
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(verifyEmailCode).mockResolvedValue("alice@example.com");
  db.$transaction.mockImplementation(async (fn) => fn(tx));
  tx.user.create.mockResolvedValue({ id: 7 });
  db.user.findUnique.mockResolvedValue({
    id: 7,
    email: "alice@example.com",
    name: "Alice",
    password: "hashed",
  });
});
test("failed email verification prevents any wallet or merchant creation", async () => {
  jest
    .mocked(verifyEmailCode)
    .mockRejectedValue(new EmailOtpError("That code is incorrect."));
  await expect(signUp(input)).resolves.toEqual({
    success: false,
    message: "That code is incorrect.",
  });
  expect(db.$transaction).not.toHaveBeenCalled();
  expect(tx.user.create).not.toHaveBeenCalled();
});
test("verified signup creates zero funds without claiming phone ownership", async () => {
  await expect(
    signUp({ ...input, accountType: "merchant", businessName: "Alice shop" }),
  ).resolves.toEqual({ success: true });
  expect(verifyEmailCode).toHaveBeenCalledWith("alice@example.com", "123456");
  expect(tx.user.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      email: "alice@example.com",
      phoneVerifiedAt: null,
      phoneVerificationProvider: null,
    }),
  });
  expect(tx.balance.create).toHaveBeenCalledWith({
    data: { userId: 7, amount: 0, locked: 0 },
  });
  expect(tx.merchant.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ ownerId: 7, name: "Alice shop" }),
  });
});
test("email OTP returns the existing wallet's internal ID, not the Supabase ID", async () => {
  await expect(
    authorize({ email: "alice@example.com", code: "123456" }, {} as never),
  ).resolves.toMatchObject({ id: "7", email: "alice@example.com" });
  expect(db.user.findUnique).toHaveBeenCalledWith({
    where: { email: "alice@example.com" },
  });
});
test("unknown wallets and rejected codes cannot sign in or implicitly create wallets", async () => {
  db.user.findUnique.mockResolvedValue(null);
  await expect(
    authorize({ email: "alice@example.com", code: "123456" }, {} as never),
  ).resolves.toBeNull();
  jest.mocked(verifyEmailCode).mockRejectedValue(new EmailOtpError("expired"));
  await expect(
    authorize({ email: "alice@example.com", code: "123456" }, {} as never),
  ).resolves.toBeNull();
  expect(db.$transaction).not.toHaveBeenCalled();
});
test("changing email requires verification of the new address before updating", async () => {
  jest
    .mocked(verifyEmailCode)
    .mockRejectedValue(new EmailOtpError("Enter the six-digit code."));
  await expect(
    updateProfile("Alice", "new@example.com", "password123"),
  ).resolves.toMatchObject({ success: false });
  expect(db.user.update).not.toHaveBeenCalled();
  jest.mocked(verifyEmailCode).mockResolvedValue("new@example.com");
  await expect(
    updateProfile("Alice", "new@example.com", "password123", "123456"),
  ).resolves.toMatchObject({ success: true });
  expect(verifyEmailCode).toHaveBeenLastCalledWith("new@example.com", "123456");
});
test("name-only profile changes do not consume an email code", async () => {
  await expect(
    updateProfile("Alice Smith", "alice@example.com", "password123"),
  ).resolves.toMatchObject({ success: true });
  expect(verifyEmailCode).not.toHaveBeenCalled();
});
