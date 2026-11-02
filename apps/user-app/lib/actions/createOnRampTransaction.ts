"use server";
import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@repo/db";
import { z } from "zod";
import { authOptions } from "../auth";
import { amountSchema, BANKS } from "../validation";
import {
  BankingError,
  paymentMode,
  razorpay,
  requireGateway,
} from "../banking";

export async function createOnRampTransaction(
  amount: number,
  provider: string,
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return { success: false, message: "Please sign in to add money" };
  const parsed = z
    .object({ amount: amountSchema, provider: z.enum(BANKS) })
    .safeParse({ amount, provider });
  if (!parsed.success)
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  try {
    const mode = paymentMode();
    if (mode !== "sandbox") requireGateway();
    else if (process.env.BANK_SANDBOX_ENABLED !== "true")
      throw new BankingError("The bank sandbox is disabled");
    const token = randomUUID();
    const deposit = await prisma.onRampTransaction.create({
      data: {
        userId: Number(session.user.id),
        ...parsed.data,
        provider: mode === "sandbox" ? parsed.data.provider : "Razorpay",
        mode,
        status: "Processing",
        startTime: new Date(),
        token,
      },
    });
    if (mode !== "sandbox") {
      const order = await razorpay<{ id: string }>("orders", {
        amount: parsed.data.amount,
        currency: "INR",
        receipt: `easepay-${deposit.id}`,
        notes: { walletToken: token },
      });
      await prisma.onRampTransaction.update({
        where: { id: deposit.id },
        data: { providerOrderId: order.id },
      });
    }
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: "Payment created. Continue to your payment page.",
      token,
      redirectUrl: `/bank/${token}`,
    };
  } catch (error) {
    console.error("Deposit creation failed", error);
    return {
      success: false,
      message:
        error instanceof BankingError
          ? error.message
          : "Could not start payment. Check Activity before starting another.",
    };
  }
}
