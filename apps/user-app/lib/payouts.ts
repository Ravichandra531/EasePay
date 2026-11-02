import { prisma } from "@repo/db";
import { settleWithdrawal } from "@repo/db/withdrawals";
import {
  accountReference,
  BankingError,
  decryptAccount,
  paymentMode,
  razorpay,
} from "./banking";
export async function sendPayout(id: string) {
  const withdrawal = await prisma.withdrawal.findUniqueOrThrow({
    where: { id },
    include: { bankAccount: true, user: true },
  });
  if (withdrawal.status !== "Processing") return;
  if (withdrawal.mode !== paymentMode() || withdrawal.mode === "sandbox")
    throw new BankingError(
      "This withdrawal belongs to a different banking mode",
    );
  const bank = withdrawal.bankAccount;
  let fundId = bank.providerFundId;
  if (!fundId) {
    const contact = await razorpay<{ id: string }>(
      "contacts",
      {
        name: bank.holder,
        email: withdrawal.user.email ?? undefined,
        contact: withdrawal.user.number,
        type: "customer",
        reference_id: accountReference(bank.id),
      },
      true,
    );
    const fund = await razorpay<{ id: string }>(
      "fund_accounts",
      {
        contact_id: contact.id,
        account_type: "bank_account",
        bank_account: {
          name: bank.holder,
          ifsc: bank.ifsc,
          account_number: decryptAccount(bank.encryptedAccount),
        },
      },
      true,
    );
    // Persist before submitting the payout so every retry sends the same immutable payload.
    const persisted = await prisma.bankAccount.updateMany({
      where: { id: bank.id, providerFundId: null },
      data: { providerFundId: fund.id },
    });
    fundId = persisted.count
      ? fund.id
      : (await prisma.bankAccount.findUniqueOrThrow({ where: { id: bank.id } }))
          .providerFundId;
  }
  const payout = await razorpay<{ id: string; status: string }>(
    "payouts",
    {
      account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER,
      fund_account_id: fundId,
      amount: withdrawal.amount,
      currency: "INR",
      mode: "IMPS",
      purpose: "payout",
      queue_if_low_balance: true,
      reference_id: id,
      narration: "EasePay withdrawal",
    },
    true,
    id,
  );
  await prisma.withdrawal.update({
    where: { id },
    data: { providerPayoutId: payout.id },
  });
  await reconcilePayout(payout.id);
}
export async function reconcilePayout(providerId: string) {
  const payout = await razorpay<{
    id: string;
    status: string;
    reference_id: string;
    amount: number;
    currency: string;
    fund_account_id: string;
  }>(`payouts/${encodeURIComponent(providerId)}`, undefined, true);
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: payout.reference_id },
    include: { bankAccount: true },
  });
  if (!withdrawal) return;
  if (
    withdrawal.mode !== paymentMode() ||
    withdrawal.amount !== payout.amount ||
    payout.currency !== "INR" ||
    withdrawal.bankAccount.providerFundId !== payout.fund_account_id ||
    (withdrawal.providerPayoutId && withdrawal.providerPayoutId !== payout.id)
  )
    throw new BankingError("Payout does not match the withdrawal");
  await prisma.withdrawal.update({
    where: { id: withdrawal.id },
    data: { providerPayoutId: payout.id },
  });
  if (payout.status === "processed")
    await settleWithdrawal(withdrawal.id, "Success");
  if (["failed", "cancelled", "rejected"].includes(payout.status))
    await settleWithdrawal(withdrawal.id, "Failure");
  if (payout.status === "reversed")
    await settleWithdrawal(withdrawal.id, "Reversed");
}
