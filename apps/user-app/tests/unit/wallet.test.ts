/** @jest-environment node */
jest.mock("../../../../packages/db/src/index", () => ({
  prisma: { user: { findUnique: jest.fn() }, $transaction: jest.fn() },
}));
import { prisma } from "../../../../packages/db/src/index";
import {
  transferMoney,
  settleDeposit,
} from "../../../../packages/db/src/wallet";
const db = prisma as unknown as {
  user: { findUnique: jest.Mock };
  $transaction: jest.Mock;
};
const tx = {
  $queryRaw: jest.fn(),
  balance: { findUnique: jest.fn(), updateMany: jest.fn(), upsert: jest.fn() },
  merchant: { findFirst: jest.fn() },
  notification: { create: jest.fn() },
  p2PTransaction: { findUnique: jest.fn(), create: jest.fn() },
  onRampTransaction: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
};
beforeEach(() => {
  jest.resetAllMocks();
  db.$transaction.mockImplementation(async (fn) => fn(tx));
  db.user.findUnique.mockResolvedValue({
    id: 2,
    name: "Bob",
    number: "9999999002",
  });
  tx.balance.findUnique.mockResolvedValue({ amount: 50000, realAmount: 0 });
  tx.balance.updateMany.mockResolvedValue({ count: 1 });
  tx.p2PTransaction.findUnique.mockResolvedValue(null);
  tx.p2PTransaction.create.mockResolvedValue({ id: 42 });
  tx.onRampTransaction.findUnique.mockResolvedValue({
    id: 1,
    userId: 7,
    amount: 50000,
    status: "Processing",
    token: "token",
  });
  tx.onRampTransaction.updateMany.mockResolvedValue({ count: 1 });
});
describe("Peer transfers", () => {
  test("writes the ledger record together with both balance updates", async () => {
    await transferMoney(1, "9999999002", 10000, "request");
    expect(tx.balance.updateMany).toHaveBeenCalledWith({
      where: { userId: 1, amount: { gte: 10000 } },
      data: { amount: { decrement: 10000 }, realAmount: { decrement: 0 } },
    });
    expect(tx.balance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 2 },
        update: { amount: { increment: 10000 }, realAmount: { increment: 0 } },
      }),
    );
    expect(tx.p2PTransaction.create).toHaveBeenCalledWith({
      data: { fromUserId: 1, toUserId: 2, amount: 10000, requestId: "request" },
    });
  });
  test("insufficient funds cannot credit the recipient or write a payment", async () => {
    tx.balance.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      transferMoney(1, "9999999002", 10000, "request"),
    ).rejects.toThrow("Insufficient balance");
    expect(tx.balance.upsert).not.toHaveBeenCalled();
    expect(tx.p2PTransaction.create).not.toHaveBeenCalled();
  });
  test("retrying the same payment does not debit again", async () => {
    tx.p2PTransaction.findUnique.mockResolvedValue({
      id: 42,
      fromUserId: 1,
      toUserId: 2,
      amount: 10000,
    });
    await transferMoney(1, "9999999002", 10000, "request");
    expect(tx.balance.updateMany).not.toHaveBeenCalled();
  });
  test("a reused request cannot change the amount", async () => {
    tx.p2PTransaction.findUnique.mockResolvedValue({
      id: 42,
      fromUserId: 1,
      toUserId: 2,
      amount: 10000,
    });
    await expect(
      transferMoney(1, "9999999002", 20000, "request"),
    ).rejects.toThrow("already been used");
    expect(tx.balance.updateMany).not.toHaveBeenCalled();
  });
  test("rejects self transfers and missing recipients", async () => {
    await expect(
      transferMoney(2, "9999999002", 10000, "request"),
    ).rejects.toThrow("yourself");
    db.user.findUnique.mockResolvedValue(null);
    await expect(
      transferMoney(1, "9999999002", 10000, "request"),
    ).rejects.toThrow("Recipient not found");
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
describe("Bank settlement", () => {
  test("credits the stored owner and amount, only after claiming Processing", async () => {
    await settleDeposit("token", "Success");
    expect(tx.onRampTransaction.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: "Processing" },
      data: { status: "Success" },
    });
    expect(tx.balance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 7 },
        update: { amount: { increment: 50000 }, realAmount: { increment: 0 } },
      }),
    );
  });
  test("replayed or concurrent callbacks cannot credit twice", async () => {
    tx.onRampTransaction.updateMany.mockResolvedValue({ count: 0 });
    tx.onRampTransaction.findUniqueOrThrow.mockResolvedValue({
      status: "Success",
    });
    await expect(settleDeposit("token", "Success")).resolves.toMatchObject({
      alreadyProcessed: true,
    });
    expect(tx.balance.upsert).not.toHaveBeenCalled();
  });
  test("cancelled deposits never credit the wallet", async () => {
    await settleDeposit("token", "Failure");
    expect(tx.balance.upsert).not.toHaveBeenCalled();
  });
  test("mismatched callback details and cross-account sandbox requests fail", async () => {
    await expect(
      settleDeposit("token", "Success", { userId: 99 }),
    ).rejects.toThrow("do not match");
    await expect(
      settleDeposit("token", "Success", { amount: 99999 }),
    ).rejects.toThrow("do not match");
    expect(tx.onRampTransaction.updateMany).not.toHaveBeenCalled();
    expect(tx.balance.upsert).not.toHaveBeenCalled();
  });
  test("a completed payment cannot change outcome", async () => {
    tx.onRampTransaction.updateMany.mockResolvedValue({ count: 0 });
    tx.onRampTransaction.findUniqueOrThrow.mockResolvedValue({
      status: "Failure",
    });
    await expect(settleDeposit("token", "Success")).rejects.toThrow(
      "already failure",
    );
    expect(tx.balance.upsert).not.toHaveBeenCalled();
  });
});

describe("Merchant transfers and fund provenance", () => {
  test("merchant receipts and notification are written with the transfer", async () => {
    tx.merchant.findFirst.mockResolvedValue({ id: 9, ownerId: 2 });
    await transferMoney(1, "9999999002", 10000, "request", 9);
    expect(tx.p2PTransaction.create).toHaveBeenCalledWith({
      data: {
        fromUserId: 1,
        toUserId: 2,
        amount: 10000,
        requestId: "request",
        merchantId: 9,
      },
    });
    expect(tx.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 2,
        message: "Payment received: ₹100.00",
        link: "/merchant",
      },
    });
  });
  test("the selected merchant must belong to the receiving wallet", async () => {
    tx.merchant.findFirst.mockResolvedValue(null);
    await expect(
      transferMoney(1, "9999999002", 10000, "request", 9),
    ).rejects.toThrow("Merchant is unavailable");
    expect(tx.balance.updateMany).not.toHaveBeenCalled();
  });
  test("live funding classification follows wallet transfers", async () => {
    tx.balance.findUnique.mockResolvedValue({
      amount: 50000,
      realAmount: 6000,
    });
    await transferMoney(1, "9999999002", 10000, "request");
    expect(tx.balance.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { amount: { decrement: 10000 }, realAmount: { decrement: 6000 } },
      }),
    );
    expect(tx.balance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          amount: { increment: 10000 },
          realAmount: { increment: 6000 },
        },
      }),
    );
  });
  test("demo callback cannot settle a live deposit", async () => {
    tx.onRampTransaction.findUnique.mockResolvedValue({
      id: 1,
      userId: 7,
      amount: 50000,
      mode: "razorpay_live",
    });
    await expect(
      settleDeposit("token", "Success", { userId: 7, mode: "sandbox" }),
    ).rejects.toThrow("do not match");
    expect(tx.balance.upsert).not.toHaveBeenCalled();
  });
});
