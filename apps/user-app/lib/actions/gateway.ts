"use server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@repo/db";
import { settleDeposit } from "@repo/db/wallet";
import { authOptions } from "../auth";
import {
  BankingError,
  paymentMode,
  razorpay,
  requireGateway,
  validSignature,
} from "../banking";
export async function checkoutOptions(token: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return { success: false as const, message: "Please sign in" };
  try {
    const { key } = requireGateway();
    const deposit = await prisma.onRampTransaction.findFirst({
      where: {
        token,
        userId: Number(session.user.id),
        mode: paymentMode(),
        status: "Processing",
      },
    });
    if (!deposit?.providerOrderId)
      throw new BankingError(
        "A checkout order is not available for this payment.",
      );
    return {
      success: true as const,
      key,
      orderId: deposit.providerOrderId,
      amount: deposit.amount,
      email: session.user.email ?? "",
      name: session.user.name ?? "",
    };
  } catch (error) {
    return {
      success: false as const,
      message:
        error instanceof BankingError
          ? error.message
          : "Could not load checkout",
    };
  }
}
export async function verifyCheckout(
  token: string,
  paymentId: string,
  signature: string,
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, message: "Please sign in" };
  try {
    const { secret } = requireGateway();
    if (!/^pay_[A-Za-z0-9]+$/.test(paymentId))
      throw new BankingError("Invalid payment reference");
    const deposit = await prisma.onRampTransaction.findFirst({
      where: { token, userId: Number(session.user.id), mode: paymentMode() },
    });
    if (
      !deposit?.providerOrderId ||
      !validSignature(
        `${deposit.providerOrderId}|${paymentId}`,
        signature,
        secret,
      )
    )
      throw new BankingError("Payment verification failed");
    const payment = await razorpay<{
      id: string;
      order_id: string;
      amount: number;
      currency: string;
      status: string;
    }>(`payments/${paymentId}`);
    if (
      payment.order_id !== deposit.providerOrderId ||
      payment.amount !== deposit.amount ||
      payment.currency !== "INR"
    )
      throw new BankingError("Payment details do not match");
    if (payment.status !== "captured")
      return {
        success: false,
        message:
          "Payment is awaiting capture. Your wallet updates after bank confirmation.",
      };
    await prisma.onRampTransaction.update({
      where: { id: deposit.id },
      data: { providerPaymentId: payment.id },
    });
    await settleDeposit(token, "Success", {
      userId: deposit.userId,
      amount: payment.amount,
      mode: paymentMode(),
    });
    for (const p of ["/dashboard", "/transactions", `/bank/${token}`])
      revalidatePath(p);
    return {
      success: true,
      message: "Payment verified. Your wallet has been credited.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof BankingError
          ? error.message
          : "Payment could not be verified yet. Check Activity for updates.",
    };
  }
}
