import { getWalletTransactions } from "@/lib/actions/getTransactions";
import { TransactionList } from "@/components/TransactionList";
export default async function Transactions() {
  const transactions = await getWalletTransactions();
  return (
    <div className="py-8 wallet-enter">
      <p className="eyebrow">Every move, in one place</p>
      <h1 className="text-3xl font-bold tracking-tight mt-3">Your activity</h1>
      <p className="text-sm text-neutral-500 mt-3 mb-8">
        Deposits, payments, and money received. Updated automatically.
      </p>
      <TransactionList transactions={transactions} />
    </div>
  );
}
