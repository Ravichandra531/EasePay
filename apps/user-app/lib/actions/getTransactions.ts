import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import { prisma } from "@repo/db";

export type WalletTransaction = {
  id: string;
  time: string;
  amount: number;
  status: "Success" | "Failure" | "Processing";
  type: "deposit" | "sent" | "received" | "withdrawal";
  description: string;
  phone?: string;
  token?: string;
};
export async function getWalletTransactions(): Promise<WalletTransaction[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];
  const userId = Number(session.user.id);
  const [deposits, transfers, withdrawals] = await Promise.all([
    prisma.onRampTransaction.findMany({
      where: { userId },
      orderBy: { startTime: "desc" },
    }),
    prisma.p2PTransaction.findMany({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
      include: {
        merchant: { select: { name: true } },
        fromUser: { select: { name: true, number: true } },
        toUser: { select: { name: true, number: true } },
      },
      orderBy: { timestamp: "desc" },
    }),
    prisma.withdrawal.findMany({
      where: { userId },
      include: { bankAccount: { select: { last4: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const all: WalletTransaction[] = deposits.map((t) => ({
    id: `DEP-${t.id}`,
    time: t.startTime.toISOString(),
    amount: t.amount,
    status: t.status,
    type: "deposit",
    description: t.provider,
    token: t.token,
  }));
  for (const t of transfers) {
    const sent = t.fromUserId === userId,
      other = sent ? t.toUser : t.fromUser;
    all.push({
      id: `PAY-${t.id}`,
      time: t.timestamp.toISOString(),
      amount: t.amount,
      status: "Success",
      type: sent ? "sent" : "received",
      description:
        sent && t.merchant?.name ? t.merchant.name : other.name || other.number,
      phone: other.number,
    });
  }
  for (const w of withdrawals)
    all.push({
      id: `WD-${w.id}`,
      time: w.createdAt.toISOString(),
      amount: w.amount,
      status:
        w.status === "Success"
          ? "Success"
          : w.status === "Processing"
            ? "Processing"
            : "Failure",
      type: "withdrawal",
      description: `Bank •••• ${w.bankAccount.last4}`,
    });
  return all.sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
}
export async function getOnRampTransactions() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];
  const txns = await prisma.onRampTransaction.findMany({
    where: { userId: Number(session.user.id) },
    orderBy: { startTime: "desc" },
  });
  return txns.map((t) => ({
    id: t.id,
    time: t.startTime,
    amount: t.amount,
    status: t.status,
    provider: t.provider,
  }));
}
