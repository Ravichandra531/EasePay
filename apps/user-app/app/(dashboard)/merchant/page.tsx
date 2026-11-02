import { getServerSession } from "next-auth";
import { prisma } from "@repo/db";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { money } from "@/lib/format";
import { MerchantPanel } from "@/components/MerchantPanel";
import { TransactionList } from "@/components/TransactionList";
export default async function MerchantPage() {
  const session = await getServerSession(authOptions),
    userId = Number(session?.user?.id);
  const [merchant, notifications] = await Promise.all([
    prisma.merchant.findUnique({
      where: { ownerId: userId },
      include: {
        payments: {
          include: { fromUser: { select: { name: true, number: true } } },
          orderBy: { timestamp: "desc" },
        },
      },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);
  const transactions =
    merchant?.payments.map((p) => ({
      id: `PAY-${p.id}`,
      time: p.timestamp.toISOString(),
      amount: p.amount,
      status: "Success" as const,
      type: "received" as const,
      description: p.fromUser.name || p.fromUser.number,
      phone: p.fromUser.number,
    })) ?? [];
  const baseUrl = (
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3001"
  ).replace(/\/$/, "");
  return (
    <div className="py-8 wallet-enter">
      <p className="eyebrow">Made for your next customer</p>
      <div className="flex flex-wrap gap-4 justify-between items-center mt-3 mb-8">
        <h1 className="text-3xl font-bold">Your business, in motion.</h1>
        {merchant && (
          <Link href="/withdraw" className="secondary-button">
            Withdraw earnings →
          </Link>
        )}
      </div>
      {merchant && (
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Payments received", value: String(transactions.length) },
            {
              label: "Total collected",
              value: money(transactions.reduce((a, p) => a + p.amount, 0)),
            },
            {
              label: "Unread alerts",
              value: String(notifications.filter((n) => !n.readAt).length),
            },
          ].map((s) => (
            <div key={s.label} className="wallet-card p-5">
              <p className="eyebrow">{s.label}</p>
              <p className="text-2xl font-semibold mt-3">{s.value}</p>
            </div>
          ))}
        </div>
      )}
      <MerchantPanel
        merchant={
          merchant
            ? {
                name: merchant.name,
                slug: merchant.slug,
                description: merchant.description,
                category: merchant.category,
              }
            : null
        }
        baseUrl={baseUrl}
        notifications={notifications.map((n) => ({
          id: n.id,
          message: n.message,
          read: !!n.readAt,
        }))}
      />
      {merchant && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-5">Customer payments</h2>
          <TransactionList transactions={transactions} />
        </div>
      )}
    </div>
  );
}
