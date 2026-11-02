"use server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "../auth";
import { settleDeposit, WalletError } from "@repo/db/wallet";

export async function settleSandboxPayment(
  token: string,
  outcome: "Success" | "Failure",
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, message: "Please sign in" };
  if (process.env.BANK_SANDBOX_ENABLED !== "true")
    return { success: false, message: "The bank sandbox is disabled" };
  if (
    typeof token !== "string" ||
    token.length > 200 ||
    !["Success", "Failure"].includes(outcome)
  )
    return { success: false, message: "Invalid payment" };
  try {
    await settleDeposit(token, outcome, {
      userId: Number(session.user.id),
      mode: "sandbox",
    });
    for (const path of [
      "/dashboard",
      "/transactions",
      "/transfer",
      `/bank/${token}`,
    ])
      revalidatePath(path);
    return {
      success: true,
      message:
        outcome === "Success"
          ? "Payment complete. Your wallet has been credited."
          : "Payment cancelled. Your wallet was not charged.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof WalletError
          ? error.message
          : "Could not complete payment. Please try again.",
    };
  }
}
