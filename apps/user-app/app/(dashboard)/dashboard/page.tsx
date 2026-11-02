import Link from "next/link";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/db";
import { authOptions } from "@/lib/auth";
import { getBalance } from "@/lib/actions/getBalance";
import { getWalletTransactions } from "@/lib/actions/getTransactions";
import { money } from "@/lib/format";
import { TransactionList } from "@/components/TransactionList";
export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  const [balance, transactions, user] = await Promise.all([
    getBalance(),
    getWalletTransactions(),
    prisma.user.findUnique({
      where: { id: Number(session?.user?.id) },
      select: { name: true },
    }),
  ]);
  const sent = transactions
      .filter((t) => t.type === "sent")
      .reduce((a, t) => a + t.amount, 0),
    received = transactions
      .filter((t) => t.type === "received")
      .reduce((a, t) => a + t.amount, 0);
  return (
    <div className="py-8 wallet-enter">
      <div className="flex justify-between items-end gap-4 mb-8">
        <div>
          <p className="eyebrow">Your money, made simple</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-3">
            Hello, {user?.name?.split(" ")[0] || "there"}
            <span className="text-blue-300">.</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-2">
            A little clarity for your everyday payments.
          </p>
        </div>
        <span className="hidden lg:block text-xs text-neutral-500">
          Personal wallet / INR
        </span>
      </div>
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5">
        <section className="rounded-3xl bg-[#c4dcf5] text-[#101e2d] p-6 sm:p-8 relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute rounded-full w-72 h-72 border-[32px] border-[#101e2d]/[.04] -right-20 -top-12"
          />
          <p className="text-xs font-semibold uppercase tracking-[.16em] opacity-60">
            Available balance
          </p>
          <p className="text-4xl sm:text-5xl font-bold tracking-tight mt-5 relative">
            {money(balance?.amount ?? 0)}
          </p>
          <p className="text-xs opacity-60 mt-3">Ready whenever you are.</p>
          <div className="flex flex-wrap gap-3 mt-8 relative">
            <Link
              href="/transfer?tab=add"
              className="rounded-full bg-[#12273d] text-white px-5 py-3 text-sm font-semibold"
            >
              ＋ Add money
            </Link>
            <Link
              href="/transfer?tab=send"
              className="rounded-full border border-[#12273d]/20 px-5 py-3 text-sm font-semibold hover:bg-[#12273d]/5"
            >
              ↗ Send money
            </Link>
          </div>
        </section>
        <div className="grid grid-cols-2 gap-4">
          <div className="wallet-card p-5">
            <p className="text-blue-300 text-xl">↗</p>
            <p className="eyebrow mt-4">Total sent</p>
            <p className="text-lg sm:text-xl font-semibold mt-2">
              {money(sent)}
            </p>
          </div>
          <div className="wallet-card p-5">
            <p className="text-blue-300 text-xl">↙</p>
            <p className="eyebrow mt-4">Received</p>
            <p className="text-lg sm:text-xl font-semibold mt-2">
              {money(received)}
            </p>
          </div>
          <div className="wallet-card col-span-2 p-5 flex justify-between gap-4">
            <div>
              <p className="eyebrow">Payment activity</p>
              <p className="text-sm text-neutral-400 mt-2">
                {transactions.filter((t) => t.status === "Success").length}{" "}
                complete ·{" "}
                {transactions.filter((t) => t.status === "Processing").length}{" "}
                pending
              </p>
            </div>
            <div className="text-right">
              <p className="eyebrow">Locked</p>
              <p className="text-sm mt-2">{money(balance?.locked ?? 0)}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 my-7">
        {[
          { label: "Send a payment", href: "/transfer?tab=send", icon: "↗" },
          { label: "Top up wallet", href: "/transfer?tab=add", icon: "＋" },
          { label: "Manage account", href: "/profile", icon: "◎" },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="secondary-button flex-1 min-w-36 !text-xs"
          >
            <span className="text-blue-300 text-lg">{a.icon}</span>
            {a.label}
          </Link>
        ))}
      </div>
      <div className="flex justify-between items-center mt-10 mb-5">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        <Link href="/transactions" className="text-xs text-blue-300">
          View all →
        </Link>
      </div>
      <TransactionList transactions={transactions} compact />
    </div>
  );
}
