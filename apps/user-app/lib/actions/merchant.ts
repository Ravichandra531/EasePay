"use server";
import { randomBytes } from "node:crypto";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@repo/db";
import { transferMoney, WalletError } from "@repo/db/wallet";
import { z } from "zod";
import { authOptions } from "../auth";
import { amountSchema } from "../validation";
const business = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(300),
  category: z.enum(["Food & Drink", "Retail", "Services", "Other"]),
});
export async function saveMerchant(input: z.infer<typeof business>) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, message: "Please sign in" };
  const parsed = business.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Check your business details",
    };
  try {
    const userId = Number(session.user.id),
      user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.email)
      return { success: false, message: "Add your email in Account first" };
    await prisma.merchant.upsert({
      where: { ownerId: userId },
      update: parsed.data,
      create: {
        ...parsed.data,
        email: user.email,
        ownerId: userId,
        slug: randomBytes(10).toString("hex"),
        auth_type: "Credentials",
      },
    });
    revalidatePath("/merchant");
    return { success: true, message: "Your business profile is ready" };
  } catch {
    return {
      success: false,
      message: "Could not save your business. Please try again.",
    };
  }
}
export async function payMerchant(
  slug: string,
  amount: number,
  requestId: string,
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return { success: false, message: "Sign in to make this payment" };
  const parsed = z
    .object({
      slug: z.string().regex(/^[a-z0-9-]{8,60}$/),
      amount: amountSchema,
      requestId: z.string().uuid(),
    })
    .safeParse({ slug, amount, requestId });
  if (!parsed.success)
    return { success: false, message: "Check the payment details" };
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { slug },
      include: { owner: { select: { number: true } } },
    });
    if (!merchant?.owner)
      return { success: false, message: "Merchant is unavailable" };
    const result = await transferMoney(
      Number(session.user.id),
      merchant.owner.number,
      amount,
      requestId,
      merchant.id,
    );
    for (const p of [
      "/merchant",
      "/dashboard",
      "/transactions",
      `/pay/${slug}`,
    ])
      revalidatePath(p);
    return {
      success: true,
      message: `Paid ${merchant.name}`,
      reference: `PAY-${result.transaction.id}`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof WalletError
          ? error.message
          : "Payment could not be confirmed. Retry with the same details to check safely.",
    };
  }
}
export async function readNotifications() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;
  await prisma.notification.updateMany({
    where: { userId: Number(session.user.id), readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/merchant");
}
