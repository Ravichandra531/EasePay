"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  linkBankAccount,
  submitWithdrawal,
  settleSandboxWithdrawal,
  refreshWithdrawal,
  retryWithdrawal,
} from "@/lib/actions/withdraw";
import { money, dateTime } from "@/lib/format";
import { parseAmount } from "@/lib/validation";
import { Icon } from "./ui/Icon";
type Bank = { id: string; holder: string; ifsc: string; last4: string };
type Withdrawal = {
  id: string;
  amount: number;
  status: string;
  mode: string;
  createdAt: string;
  last4: string;
};
export function WithdrawalPanel({
  banks,
  withdrawals,
  available,
  mode,
}: {
  banks: Bank[];
  withdrawals: Withdrawal[];
  available: number;
  mode: string;
}) {
  const [retryPassword, setRetryPassword] = useState("");
  const [selected, setSelected] = useState(banks[0]?.id ?? ""),
    [amount, setAmount] = useState(""),
    [password, setPassword] = useState(""),
    [showBank, setShowBank] = useState(!banks.length),
    [holder, setHolder] = useState(""),
    [account, setAccount] = useState(""),
    [ifsc, setIfsc] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [review, setReview] = useState(false);
  const request = useRef<string | null>(null),
    router = useRouter();
  async function link(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const result = await linkBankAccount({ holder, account, ifsc, password });
      setMessage(result.message);
      if (result.success) {
        setAccount("");
        setPassword("");
        setShowBank(false);
        router.refresh();
      }
    } catch {
      setMessage("Could not link this bank. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function withdraw(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const paise = parseAmount(amount);
    if (!(selected || banks[0]?.id) || paise === null || paise > available) {
      setMessage(
        "Choose a linked bank and an amount within your available withdrawal balance.",
      );
      return;
    }
    if (!review) {
      setReview(true);
      request.current ??= crypto.randomUUID();
      setMessage("");
      return;
    }
    setBusy(true);
    try {
      const result = await submitWithdrawal({
        id: request.current!,
        bankAccountId: selected || banks[0]!.id,
        amount: paise,
        password,
      });
      setMessage(result.message);
      if (result.success) {
        setReview(false);
        setAmount("");
        setPassword("");
        request.current = null;
        router.refresh();
      }
    } catch {
      setMessage(
        "Could not confirm submission. Retry with the same details or check the withdrawal below.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function update(w: Withdrawal, outcome?: "Success" | "Failure") {
    if (busy) return;
    setBusy(true);
    try {
      const result = outcome
        ? await settleSandboxWithdrawal(w.id, outcome)
        : await refreshWithdrawal(w.id);
      setMessage(result.message);
      router.refresh();
    } catch {
      setMessage("Could not refresh withdrawal. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const selectedId = selected || banks[0]?.id || "";
  const bank = banks.find((b) => b.id === selectedId);
  return (
    <div className="space-y-7">
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6">
        <div className="wallet-card p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold flex items-center gap-3">
              <Icon name="landmark" className="text-blue-300" />
              {showBank
                ? "Link a bank account"
                : "From your wallet to your bank."}
            </h2>
            {banks.length > 0 && (
              <button
                className="text-xs text-blue-300"
                onClick={() => {
                  setShowBank(!showBank);
                  setReview(false);
                }}
                disabled={busy}
              >
                {showBank ? "Back" : "＋ Add bank"}
              </button>
            )}
          </div>
          {showBank ? (
            <form onSubmit={link} className="space-y-5">
              <div>
                <label htmlFor="holder" className="wallet-label">
                  Account holder name
                </label>
                <input
                  id="holder"
                  className="wallet-input"
                  value={holder}
                  onChange={(e) => setHolder(e.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                />
              </div>
              <div>
                <label htmlFor="account" className="wallet-label">
                  Bank account number
                </label>
                <input
                  id="account"
                  className="wallet-input"
                  inputMode="numeric"
                  autoComplete="off"
                  value={account}
                  onChange={(e) =>
                    setAccount(e.target.value.replace(/\D/g, ""))
                  }
                  minLength={9}
                  maxLength={18}
                  required
                />
              </div>
              <div>
                <label htmlFor="ifsc" className="wallet-label">
                  IFSC code
                </label>
                <input
                  id="ifsc"
                  className="wallet-input uppercase"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  maxLength={11}
                  required
                />
              </div>
              <div>
                <label htmlFor="bank-password" className="wallet-label">
                  Your EasePay password
                </label>
                <input
                  id="bank-password"
                  className="wallet-input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <p className="text-xs text-neutral-500 leading-6">
                Use an account you own. Full account numbers are encrypted; only
                the last four digits appear in your wallet.
              </p>
              <button className="primary-button w-full" disabled={busy}>
                {busy ? "Linking…" : "Link bank account"}
              </button>
            </form>
          ) : (
            <form onSubmit={withdraw} className="space-y-5">
              {review ? (
                <div className="rounded-2xl border border-blue-400/20 bg-blue-400/5 p-5">
                  <p className="eyebrow">Review your withdrawal</p>
                  <p className="text-3xl font-semibold mt-4">
                    {money(parseAmount(amount) ?? 0)}
                  </p>
                  <p className="text-sm mt-4">
                    {bank?.holder} · Account •••• {bank?.last4}
                  </p>
                  <p className="text-xs text-neutral-500 mt-2">
                    {bank?.ifsc} ·{" "}
                    {mode === "sandbox"
                      ? "Demo bank transfer"
                      : "IMPS bank payout"}
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="withdraw-bank" className="wallet-label">
                      Destination account
                    </label>
                    <select
                      id="withdraw-bank"
                      className="wallet-input"
                      value={selected || banks[0]?.id || ""}
                      onChange={(e) => {
                        setSelected(e.target.value);
                        request.current = null;
                      }}
                      required
                    >
                      {banks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.holder} · •••• {b.last4} ({b.ifsc})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="withdraw-amount" className="wallet-label">
                      Amount in rupees
                    </label>
                    <input
                      id="withdraw-amount"
                      className="wallet-input !text-3xl"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        request.current = null;
                      }}
                      required
                    />
                    <p className="text-xs text-neutral-500 mt-2">
                      Eligible to withdraw: {money(available)}
                    </p>
                  </div>
                </>
              )}
              <div>
                <label htmlFor="withdraw-password" className="wallet-label">
                  Confirm your EasePay password
                </label>
                <input
                  id="withdraw-password"
                  className="wallet-input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button className="primary-button w-full" disabled={busy}>
                {busy
                  ? "Submitting…"
                  : review
                    ? "Confirm withdrawal"
                    : "Review withdrawal"}
              </button>
              {review && (
                <button
                  type="button"
                  className="secondary-button w-full"
                  onClick={() => setReview(false)}
                  disabled={busy}
                >
                  Edit withdrawal
                </button>
              )}
            </form>
          )}
        </div>
        <aside className="wallet-card p-6 h-fit">
          <Icon name="shield-check" size={28} className="text-blue-300" />
          <h2 className="text-lg font-semibold mt-5">
            A clear path to your bank.
          </h2>
          <p className="text-sm text-neutral-500 leading-7 mt-4">
            The withdrawal amount is reserved when you confirm. It leaves your
            wallet after bank confirmation. A failed or reversed payout returns
            the funds automatically.
          </p>
          <p className="text-xs text-blue-300/80 mt-5 leading-6">
            {mode === "sandbox"
              ? "Demo mode: use the controls below to simulate a completed or cancelled payout. No real funds move."
              : mode === "razorpay_test"
                ? "Razorpay test mode: provider test funds only."
                : "Live mode: only verified live funds are eligible. Provider fees may apply to the funding account."}
          </p>
        </aside>
      </div>
      <p role="status" className="text-sm text-blue-300">
        {message}
      </p>
      <div>
        <h2 className="text-lg font-semibold mb-5">Bank withdrawals</h2>
        <div className="wallet-card divide-y divide-white/5">
          {withdrawals.length ? (
            withdrawals.map((w) => (
              <div key={w.id} className="p-5">
                <div className="flex justify-between items-center gap-4">
                  <div className="flex gap-3 items-center">
                    <Icon name="landmark" className="text-blue-300" />
                    <div>
                      <p className="text-sm font-semibold">
                        To bank •••• {w.last4}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {dateTime(w.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{money(w.amount)}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {w.status} · {w.mode.replace("razorpay_", "")}
                    </p>
                  </div>
                </div>
                {w.status === "Processing" && (
                  <div className="flex flex-wrap gap-3 mt-4">
                    {w.mode === "sandbox" ? (
                      <>
                        <button
                          disabled={busy}
                          className="secondary-button !text-xs !py-2"
                          onClick={() => update(w, "Success")}
                        >
                          Complete demo payout
                        </button>
                        <button
                          disabled={busy}
                          className="secondary-button !text-xs !py-2"
                          onClick={() => update(w, "Failure")}
                        >
                          Cancel & return funds
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-wrap gap-3 w-full">
                        <button
                          disabled={busy}
                          className="secondary-button !text-xs !py-2"
                          onClick={() => update(w)}
                        >
                          Refresh bank status
                        </button>
                        <input
                          aria-label="Password to retry withdrawal submission"
                          type="password"
                          autoComplete="current-password"
                          className="wallet-input !w-auto !text-xs !py-2"
                          placeholder="Password to retry submission"
                          value={retryPassword}
                          onChange={(e) => setRetryPassword(e.target.value)}
                        />
                        <button
                          disabled={busy || !retryPassword}
                          className="secondary-button !text-xs !py-2"
                          onClick={async () => {
                            setBusy(true);
                            try {
                              const r = await retryWithdrawal(
                                w.id,
                                retryPassword,
                              );
                              setMessage(r.message);
                              setRetryPassword("");
                              router.refresh();
                            } catch {
                              setMessage(
                                "Could not confirm submission. Funds remain reserved.",
                              );
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Retry submission safely
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-neutral-600 font-mono mt-3 break-all">
                  {w.id}
                </p>
              </div>
            ))
          ) : (
            <p className="text-center py-10 text-sm text-neutral-500">
              Your withdrawals will appear here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
