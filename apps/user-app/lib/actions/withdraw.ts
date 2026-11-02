"use server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@repo/db";
import { reserveWithdrawal, settleWithdrawal } from "@repo/db/withdrawals";
import { authOptions } from "../auth";
import { amountSchema } from "../validation";
import {
  accountFingerprint,
  BankingError,
  encryptAccount,
  paymentMode,
  requireGateway,
} from "../banking";
import { WalletError } from "@repo/db/wallet";
import { sendPayout, reconcilePayout } from "../payouts";
const bankSchema = z.object({
  holder: z.string().trim().min(2).max(100),
  ifsc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC code"),
  account: z
    .string()
    .regex(/^\d{9,18}$/, "Account number must contain 9 to 18 digits"),
  password: z.string().min(1).max(100),
});
async function authenticated(password: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new BankingError("Please sign in");
  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
  });
  if (!user || !(await bcrypt.compare(password, user.password)))
    throw new BankingError("Enter your current password to continue");
  return user;
}
function failure(error: unknown) {
  return {
    success: false as const,
    message:
      error instanceof BankingError || error instanceof WalletError
        ? error.message
        : "The request could not be confirmed. Check its status before trying again.",
  };
}
function refresh() {
  for (const p of ["/withdraw", "/dashboard", "/transactions"])
    revalidatePath(p);
}
export async function linkBankAccount(input: z.infer<typeof bankSchema>) {
  const parsed = bankSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Check your bank details",
    };
  try {
    const user = await authenticated(parsed.data.password),
      mode = paymentMode();
    const { holder, ifsc, account } = parsed.data;
    await prisma.bankAccount.upsert({
      where: {
        userId_fingerprint_mode: {
          userId: user.id,
          fingerprint: accountFingerprint(ifsc, account),
          mode,
        },
      },
      update: {},
      create: {
        userId: user.id,
        holder,
        ifsc,
        last4: account.slice(-4),
        fingerprint: accountFingerprint(ifsc, account),
        encryptedAccount: encryptAccount(account),
        mode,
      },
    });
    refresh();
    return {
      success: true,
      message: "Bank account linked. Full account details are encrypted.",
    };
  } catch (error) {
    return failure(error);
  }
}
export async function submitWithdrawal(input: {
  id: string;
  bankAccountId: string;
  amount: number;
  password: string;
}) {
  const parsed = z
    .object({
      id: z.string().uuid(),
      bankAccountId: z.string().min(1).max(100),
      amount: amountSchema,
      password: z.string().min(1).max(100),
    })
    .safeParse(input);
  if (!parsed.success)
    return { success: false, message: "Check your withdrawal details" };
  try {
    const user = await authenticated(parsed.data.password),
      mode = paymentMode();
    if (mode !== "sandbox") requireGateway(true);
    else if (process.env.BANK_SANDBOX_ENABLED !== "true")
      throw new BankingError("The bank sandbox is disabled");
    const withdrawal = await reserveWithdrawal(
      user.id,
      input.bankAccountId,
      input.amount,
      input.id,
      mode,
    );
    if (withdrawal.status !== "Processing")
      return {
        success: true,
        message: `Withdrawal ${withdrawal.status.toLowerCase()}`,
        id: withdrawal.id,
      };
    if (mode === "sandbox") {
      refresh();
      return {
        success: true,
        message: "Demo withdrawal reserved. Confirm or cancel it below.",
        id: withdrawal.id,
      };
    }
    await sendPayout(withdrawal.id);
    refresh();
    return {
      success: true,
      message:
        "Withdrawal submitted. Funds remain reserved until the bank confirms.",
      id: withdrawal.id,
    };
  } catch (error) {
    refresh();
    return failure(error);
  }
}
export async function refreshWithdrawal(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, message: "Please sign in" };
  try {
    const w = await prisma.withdrawal.findFirst({
      where: { id, userId: Number(session.user.id) },
    });
    if (!w || w.mode === "sandbox")
      throw new BankingError("Withdrawal not found");
    if (!w.providerPayoutId)
      throw new BankingError(
        "Payment submission is unconfirmed. Retry with the original withdrawal details and password.",
      );
    await reconcilePayout(w.providerPayoutId);
    refresh();
    return { success: true, message: "Bank status updated" };
  } catch (error) {
    return failure(error);
  }
}
export async function settleSandboxWithdrawal(
  id: string,
  outcome: "Success" | "Failure",
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, message: "Please sign in" };
  try {
    if (
      process.env.BANK_SANDBOX_ENABLED !== "true" ||
      paymentMode() !== "sandbox" ||
      !["Success", "Failure"].includes(outcome)
    )
      throw new BankingError("Demo withdrawals are disabled");
    const w = await prisma.withdrawal.findFirst({
      where: { id, userId: Number(session.user.id), mode: "sandbox" },
    });
    if (!w) throw new BankingError("Withdrawal not found");
    await settleWithdrawal(w.id, outcome);
    refresh();
    return {
      success: true,
      message:
        outcome === "Success"
          ? "Demo withdrawal completed. No real money moved."
          : "Demo withdrawal cancelled. Funds returned.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function retryWithdrawal(id: string, password: string) {
  try {
    const user = await authenticated(password),
      w = await prisma.withdrawal.findFirst({ where: { id, userId: user.id } });
    if (!w || w.mode === "sandbox" || w.mode !== paymentMode())
      throw new BankingError(
        "Withdrawal not found in the current banking mode",
      );
    if (w.status !== "Processing")
      return { success: true, message: `Withdrawal ${w.status.toLowerCase()}` };
    await sendPayout(w.id);
    refresh();
    return {
      success: true,
      message: "Withdrawal submission checked with the bank",
    };
  } catch (error) {
    return failure(error);
  }
}
