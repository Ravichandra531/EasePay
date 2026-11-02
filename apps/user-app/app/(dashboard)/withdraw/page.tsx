import { getServerSession } from "next-auth";
import { prisma } from "@repo/db";
import { authOptions } from "@/lib/auth";
import { paymentMode } from "@/lib/banking";
import { WithdrawalPanel } from "@/components/WithdrawalPanel";
export default async function WithdrawPage() {
  const session = await getServerSession(authOptions),
    userId = Number(session?.user?.id),
    mode = paymentMode();
  const [banks, withdrawals, balance] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { userId, mode },
      select: { id: true, holder: true, ifsc: true, last4: true },
    }),
    prisma.withdrawal.findMany({
      where: { userId },
      include: { bankAccount: { select: { last4: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.balance.findUnique({ where: { userId } }),
  ]);
  const available =
    mode === "razorpay_live"
      ? (balance?.realAmount ?? 0)
      : (balance?.amount ?? 0) - (balance?.realAmount ?? 0);
  return (
    <div className="py-8 wallet-enter">
      <p className="eyebrow">Onwards to your bank</p>
      <h1 className="text-3xl font-bold mt-3 mb-8">
        Your money. Back with you.
      </h1>
      <WithdrawalPanel
        banks={banks}
        withdrawals={withdrawals.map((w) => ({
          id: w.id,
          amount: w.amount,
          status: w.status,
          mode: w.mode,
          createdAt: w.createdAt.toISOString(),
          last4: w.bankAccount.last4,
        }))}
        available={available}
        mode={mode}
      />
    </div>
  );
}
