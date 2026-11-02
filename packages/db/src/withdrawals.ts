import { prisma } from "./index";
import { WalletError } from "./wallet";
export async function reserveWithdrawal(
  userId: number,
  bankAccountId: string,
  amount: number,
  id: string,
  mode: string,
) {
  if (!Number.isSafeInteger(amount) || amount < 100 || amount > 10_000_000)
    throw new WalletError("Enter an amount between ₹1 and ₹1,00,000");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "userId" FROM "Balance" WHERE "userId" = ${userId} FOR UPDATE`;
    const previous = await tx.withdrawal.findUnique({ where: { id } });
    if (previous) {
      if (
        previous.userId !== userId ||
        previous.bankAccountId !== bankAccountId ||
        previous.amount !== amount ||
        previous.mode !== mode
      )
        throw new WalletError(
          "Request already used for a different withdrawal",
          409,
        );
      return previous;
    }
    const bank = await tx.bankAccount.findFirst({
      where: { id: bankAccountId, userId, mode },
    });
    if (!bank) throw new WalletError("Choose one of your linked bank accounts");
    const balance = await tx.balance.findUnique({ where: { userId } });
    const eligible =
      mode === "razorpay_live"
        ? (balance?.realAmount ?? 0)
        : (balance?.amount ?? 0) - (balance?.realAmount ?? 0);
    if (!balance || eligible < amount || balance.amount < amount)
      throw new WalletError(
        mode === "razorpay_live"
          ? "Insufficient live funds. Demo funds cannot be withdrawn to a real bank."
          : "Insufficient demo or test balance",
      );
    await tx.balance.update({
      where: { userId },
      data: {
        amount: { decrement: amount },
        locked: { increment: amount },
        ...(mode === "razorpay_live"
          ? { realAmount: { decrement: amount } }
          : {}),
      },
    });
    return tx.withdrawal.create({
      data: { id, userId, bankAccountId, amount, mode, status: "Processing" },
    });
  });
}
export async function settleWithdrawal(
  id: string,
  outcome: "Success" | "Failure" | "Reversed",
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Withdrawal" WHERE "id" = ${id} FOR UPDATE`;
    const withdrawal = await tx.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) throw new WalletError("Withdrawal not found", 404);
    if (withdrawal.status === outcome) return withdrawal;
    const processing = withdrawal.status === "Processing",
      reversal = withdrawal.status === "Success" && outcome === "Reversed";
    if (!processing && !reversal)
      throw new WalletError("Withdrawal outcome cannot change", 409);
    const refund = outcome !== "Success";
    await tx.balance.update({
      where: { userId: withdrawal.userId },
      data: {
        ...(processing ? { locked: { decrement: withdrawal.amount } } : {}),
        ...(refund
          ? {
              amount: { increment: withdrawal.amount },
              ...(withdrawal.mode === "razorpay_live"
                ? { realAmount: { increment: withdrawal.amount } }
                : {}),
            }
          : {}),
      },
    });
    const result = await tx.withdrawal.update({
      where: { id },
      data: { status: outcome },
    });
    await tx.notification.create({
      data: {
        userId: withdrawal.userId,
        message:
          outcome === "Success"
            ? "Bank withdrawal completed."
            : "Withdrawal returned to your wallet.",
        link: "/withdraw",
      },
    });
    return result;
  });
}
