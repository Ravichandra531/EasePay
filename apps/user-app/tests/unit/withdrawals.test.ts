/** @jest-environment node */
jest.mock("../../../../packages/db/src/index", () => ({
  prisma: { $transaction: jest.fn() },
}));
import { prisma } from "../../../../packages/db/src/index";
import {
  reserveWithdrawal,
  settleWithdrawal,
} from "../../../../packages/db/src/withdrawals";
const db = prisma as unknown as { $transaction: jest.Mock };
const tx = {
  $queryRaw: jest.fn(),
  withdrawal: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  bankAccount: { findFirst: jest.fn() },
  balance: { findUnique: jest.fn(), update: jest.fn() },
  notification: { create: jest.fn() },
};
beforeEach(() => {
  jest.resetAllMocks();
  db.$transaction.mockImplementation(async (fn) => fn(tx));
  tx.withdrawal.findUnique.mockResolvedValue(null);
  tx.bankAccount.findFirst.mockResolvedValue({ id: "bank" });
  tx.balance.findUnique.mockResolvedValue({
    amount: 100000,
    realAmount: 10000,
  });
  tx.withdrawal.create.mockResolvedValue({ id: "id" });
});
test("live withdrawals cannot spend demo balances", async () => {
  await expect(
    reserveWithdrawal(1, "bank", 20000, "id", "razorpay_live"),
  ).rejects.toThrow("Insufficient live funds");
  expect(tx.balance.update).not.toHaveBeenCalled();
});
test("test withdrawals cannot spend the live portion", async () => {
  await expect(
    reserveWithdrawal(1, "bank", 95000, "id", "sandbox"),
  ).rejects.toThrow("Insufficient demo or test balance");
  expect(tx.balance.update).not.toHaveBeenCalled();
});
test("a withdrawal reserves money and preserves the funding class", async () => {
  await reserveWithdrawal(1, "bank", 5000, "id", "razorpay_live");
  expect(tx.balance.update).toHaveBeenCalledWith({
    where: { userId: 1 },
    data: {
      amount: { decrement: 5000 },
      locked: { increment: 5000 },
      realAmount: { decrement: 5000 },
    },
  });
});
test("a duplicate request never reserves twice", async () => {
  tx.withdrawal.findUnique.mockResolvedValue({
    id: "id",
    userId: 1,
    bankAccountId: "bank",
    amount: 5000,
    mode: "sandbox",
  });
  await reserveWithdrawal(1, "bank", 5000, "id", "sandbox");
  expect(tx.balance.update).not.toHaveBeenCalled();
});
test("another user's bank account cannot receive a withdrawal", async () => {
  tx.bankAccount.findFirst.mockResolvedValue(null);
  await expect(
    reserveWithdrawal(1, "other", 5000, "id", "sandbox"),
  ).rejects.toThrow("one of your linked");
  expect(tx.withdrawal.create).not.toHaveBeenCalled();
});
test("failed payouts release reserved funds exactly once", async () => {
  tx.withdrawal.findUnique.mockResolvedValue({
    id: "id",
    userId: 1,
    amount: 5000,
    mode: "razorpay_live",
    status: "Processing",
  });
  await settleWithdrawal("id", "Failure");
  expect(tx.balance.update).toHaveBeenCalledWith({
    where: { userId: 1 },
    data: {
      locked: { decrement: 5000 },
      amount: { increment: 5000 },
      realAmount: { increment: 5000 },
    },
  });
  tx.withdrawal.findUnique.mockResolvedValue({ id: "id", status: "Failure" });
  tx.balance.update.mockClear();
  await settleWithdrawal("id", "Failure");
  expect(tx.balance.update).not.toHaveBeenCalled();
});
test("a processed payout can reverse without decrementing locked funds twice", async () => {
  tx.withdrawal.findUnique.mockResolvedValue({
    id: "id",
    userId: 1,
    amount: 5000,
    mode: "razorpay_live",
    status: "Success",
  });
  await settleWithdrawal("id", "Reversed");
  expect(tx.balance.update).toHaveBeenCalledWith({
    where: { userId: 1 },
    data: { amount: { increment: 5000 }, realAmount: { increment: 5000 } },
  });
});
test("completed payouts remove the reservation without refunding money", async () => {
  tx.withdrawal.findUnique.mockResolvedValue({
    id: "id",
    userId: 1,
    amount: 5000,
    mode: "sandbox",
    status: "Processing",
  });
  await settleWithdrawal("id", "Success");
  expect(tx.balance.update).toHaveBeenCalledWith({
    where: { userId: 1 },
    data: { locked: { decrement: 5000 } },
  });
});
