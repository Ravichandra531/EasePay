import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@repo/db";
import { authOptions } from "@/lib/auth";
import { MerchantCheckout } from "@/components/MerchantCheckout";
import { Icon } from "@/components/ui/Icon";
export default async function MerchantPay({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const merchant = await prisma.merchant.findUnique({
    where: { slug },
    select: { name: true, description: true, category: true, ownerId: true },
  });
  if (!merchant?.ownerId) notFound();
  const session = await getServerSession(authOptions);
  const balance = session?.user?.id
    ? await prisma.balance.findUnique({
        where: { userId: Number(session.user.id) },
        select: { amount: true },
      })
    : null;
  return (
    <main className="min-h-screen bg-[#eff2f6] text-[#192a3b] px-5 py-10">
      <Link
        href="/"
        className="font-bold text-xl flex gap-2 items-center max-w-lg mx-auto"
      >
        <Icon name="wallet" />
        EasePay<span className="text-[#839bb4]">/ pay</span>
      </Link>
      <div className="bg-white border border-[#d9e0e8] rounded-3xl p-6 sm:p-10 max-w-lg mx-auto mt-10 shadow-[0_20px_80px_#192a3b08]">
        <div className="w-14 h-14 rounded-2xl bg-[#e9eef4] grid place-items-center">
          <Icon name="store" size={27} />
        </div>
        <p className="text-xs uppercase tracking-widest text-[#6382a1] mt-6">
          {merchant.category}
        </p>
        <h1 className="text-3xl font-bold mt-3">
          {merchant.name || "EasePay merchant"}
        </h1>
        <p className="text-sm text-[#6f7b72] leading-7 mt-3 mb-8">
          {merchant.description || "A simpler way to pay this business."}
        </p>
        <MerchantCheckout
          slug={slug}
          name={merchant.name || "this business"}
          signedIn={!!session?.user?.id}
          balance={balance?.amount ?? 0}
        />
      </div>
      <p className="text-xs text-[#6382a1] text-center mt-7 flex justify-center items-center gap-2">
        <Icon name="lock-keyhole" size={13} />A payment link, powered by EasePay
      </p>
    </main>
  );
}
