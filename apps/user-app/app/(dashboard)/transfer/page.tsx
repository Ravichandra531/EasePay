import { paymentMode } from "@/lib/banking";
import { getBalance } from "@/lib/actions/getBalance";
import { TransferClient } from "@/components/TransferClient";
export default async function Transfer({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [balance, params] = await Promise.all([getBalance(), searchParams]);
  const tab = params.tab === "send" ? "send" : "add";
  return (
    <div className="py-8 wallet-enter">
      <p className="eyebrow">A smoother way to pay</p>
      <h1 className="text-3xl font-bold tracking-tight mt-3 mb-8">
        Move money
      </h1>
      <TransferClient
        key={tab}
        balance={balance}
        initialTab={tab}
        gateway={paymentMode() !== "sandbox"}
      />
    </div>
  );
}
