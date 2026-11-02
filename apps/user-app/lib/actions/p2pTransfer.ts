"use server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "../auth";
import { amountSchema, phoneSchema } from "../validation";
import { transferMoney, WalletError } from "@repo/db/wallet";

export async function p2pTransfer(
  to: string,
  amount: number,
  requestId: string,
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return { success: false, message: "Please sign in to send money" };
  const parsed = z
    .object({
      to: phoneSchema,
      amount: amountSchema,
      requestId: z.string().uuid(),
    })
    .safeParse({ to, amount, requestId });
  if (!parsed.success)
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid transfer",
    };
  try {
    const result = await transferMoney(
      Number(session.user.id),
      parsed.data.to,
      parsed.data.amount,
      parsed.data.requestId,
    );
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/transfer");
    return {
      success: true,
      message: `Money sent to ${result.recipient.name || result.recipient.number}`,
      transactionId: result.transaction.id,
    };
  } catch (error) {
    if (!(error instanceof WalletError))
      console.error("Transfer failed", error);
    return {
      success: false,
      message:
        error instanceof WalletError
          ? error.message
          : "Transfer could not be confirmed. Retry with the same details to check safely.",
    };
  }
}
