import { Prisma } from "@prisma/client";
import { prisma } from "./index";

export class WalletError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** Money is always stored in integer paise. Lock both wallets in a stable order. */
export async function transferMoney(
  fromUserId: number,
  to: string,
  amount: number,
  requestId: string,
  merchantId?: number,
) {
  if (!Number.isSafeInteger(amount) || amount < 100 || amount > 10_000_000)
    throw new WalletError("Enter an amount between ₹1 and ₹1,00,000");
  if (!/^\d{10}$/.test(to))
    throw new WalletError("Enter a 10-digit phone number");
  const recipient = await prisma.user.findUnique({
    where: { number: to },
    select: { id: true, name: true, number: true },
  });
  if (!recipient) throw new WalletError("Recipient not found", 404);
  if (recipient.id === fromUserId)
    throw new WalletError("You cannot send money to yourself");

  return prisma.$transaction(async (tx) => {
    const ids = [fromUserId, recipient.id].sort((a, b) => a - b);
    await tx.$queryRaw`SELECT "userId" FROM "Balance" WHERE "userId" IN (${ids[0]}, ${ids[1]}) ORDER BY "userId" FOR UPDATE`;
    if (merchantId) {
      const merchant = await tx.merchant.findFirst({
        where: { id: merchantId, ownerId: recipient.id },
      });
      if (!merchant) throw new WalletError("Merchant is unavailable", 404);
    }
    const previous = await tx.p2PTransaction.findUnique({
      where: { requestId },
    });
    if (previous) {
      if (
        previous.fromUserId !== fromUserId ||
        previous.toUserId !== recipient.id ||
        previous.amount !== amount ||
        (previous.merchantId ?? null) !== (merchantId ?? null)
      )
        throw new WalletError(
          "This request has already been used for another transfer",
          409,
        );
      return { transaction: previous, recipient };
    }
    const source = await tx.balance.findUnique({
      where: { userId: fromUserId },
    });
    const realPart = Math.min(source?.realAmount ?? 0, amount);
    const debited = await tx.balance.updateMany({
      where: { userId: fromUserId, amount: { gte: amount } },
      data: {
        amount: { decrement: amount },
        realAmount: { decrement: realPart },
      },
    });
    if (!debited.count) throw new WalletError("Insufficient balance");
    await tx.balance.upsert({
      where: { userId: recipient.id },
      update: {
        amount: { increment: amount },
        realAmount: { increment: realPart },
      },
      create: { userId: recipient.id, amount, locked: 0, realAmount: realPart },
    });
    const transaction = await tx.p2PTransaction.create({
      data: {
        fromUserId,
        toUserId: recipient.id,
        amount,
        requestId,
        ...(merchantId ? { merchantId } : {}),
      },
    });
    if (merchantId)
      await tx.notification.create({
        data: {
          userId: recipient.id,
          message: `Payment received: ₹${(amount / 100).toFixed(2)}`,
          link: "/merchant",
        },
      });
    return { transaction, recipient };
  });
}

/** Claim a pending deposit and credit it in the same transaction. Duplicate callbacks are harmless. */
export async function settleDeposit(
  token: string,
  status: "Success" | "Failure",
  expected?: { userId?: number; amount?: number; mode?: string },
) {
  return prisma.$transaction(async (tx) => {
    const deposit = await tx.onRampTransaction.findUnique({ where: { token } });
    if (!deposit) throw new WalletError("Transaction not found", 404);
    if (
      (expected?.mode !== undefined && deposit.mode !== expected.mode) ||
      (expected?.userId !== undefined && deposit.userId !== expected.userId) ||
      (expected?.amount !== undefined && deposit.amount !== expected.amount)
    )
      throw new WalletError(
        "Payment details do not match the transaction",
        400,
      );
    const claimed = await tx.onRampTransaction.updateMany({
      where: { id: deposit.id, status: "Processing" },
      data: { status },
    });
    if (!claimed.count) {
      const current = await tx.onRampTransaction.findUniqueOrThrow({
        where: { token },
      });
      if (current.status !== status)
        throw new WalletError(
          `Transaction already ${current.status.toLowerCase()}`,
          409,
        );
      return { ...current, alreadyProcessed: true };
    }
    if (status === "Success")
      await tx.balance.upsert({
        where: { userId: deposit.userId },
        update: {
          amount: { increment: deposit.amount },
          realAmount: {
            increment: deposit.mode === "razorpay_live" ? deposit.amount : 0,
          },
        },
        create: {
          userId: deposit.userId,
          amount: deposit.amount,
          locked: 0,
          realAmount: deposit.mode === "razorpay_live" ? deposit.amount : 0,
        },
      });
    return { ...deposit, status, alreadyProcessed: false };
  });
}

export function isDuplicateKey(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
