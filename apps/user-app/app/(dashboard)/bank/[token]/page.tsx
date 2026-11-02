import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@repo/db";
import { authOptions } from "@/lib/auth";
import { money, dateTime } from "@/lib/format";
import { RazorpayCheckout } from "@/components/RazorpayCheckout";
import { BankPayment } from "@/components/BankPayment";

export default async function BankPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getServerSession(authOptions);
  const payment = await prisma.onRampTransaction.findFirst({
    where: { token, userId: Number(session?.user?.id) },
  });
  if (!payment) notFound();
  const enabled =
    payment.mode === "sandbox" && process.env.BANK_SANDBOX_ENABLED === "true";
  return (
    <div className="max-w-2xl mx-auto py-8 md:py-14">
      <Link
        href="/transactions"
        className="text-sm text-neutral-400 hover:text-white"
      >
        ← Back to activity
      </Link>
      <div className="wallet-card p-6 sm:p-9 mt-6">
        <span className="eyebrow">
          {enabled ? "Bank sandbox" : "Payment status"}
        </span>
        <h1 className="text-3xl font-bold mt-4">{payment.provider}</h1>
        <p className="text-neutral-400 mt-2">
          Add money to your EasePay wallet
        </p>
        <p className="text-5xl font-bold tracking-tight my-8">
          {money(payment.amount)}
        </p>
        <dl className="text-sm space-y-4 border-y border-white/10 py-5">
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-400">Created</dt>
            <dd>{dateTime(payment.startTime)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-400">Status</dt>
            <dd>{payment.status}</dd>
          </div>
          <div>
            <dt className="text-neutral-400 mb-1">Payment reference</dt>
            <dd className="font-mono text-xs break-all">{payment.token}</dd>
          </div>
        </dl>
        {payment.mode === "sandbox" ? (
          <BankPayment
            token={token}
            status={payment.status}
            enabled={enabled}
          />
        ) : (
          <RazorpayCheckout
            token={token}
            status={payment.status}
            mode={payment.mode}
          />
        )}
      </div>
    </div>
  );
}
