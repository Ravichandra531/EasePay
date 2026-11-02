"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createOnRampTransaction } from "@/lib/actions/createOnRampTransaction";
import { p2pTransfer } from "@/lib/actions/p2pTransfer";
import { BANKS, parseAmount } from "@/lib/validation";
import { money } from "@/lib/format";

type Recipient = { name: string | null; number: string };
function Notice({
  message,
}: {
  message: { ok: boolean; text: string } | null;
}) {
  return (
    message && (
      <p
        role={message.ok ? "status" : "alert"}
        className={`text-sm p-4 rounded-xl leading-6 ${message.ok ? "bg-blue-400/10 text-blue-300" : "bg-red-400/10 text-red-300"}`}
      >
        {message.text}
      </p>
    )
  );
}
export function TransferClient({
  balance,
  initialTab,
  gateway = false,
}: {
  balance: { amount: number; locked: number } | null;
  initialTab: "add" | "send";
  gateway?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  return (
    <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6">
      <section className="wallet-card p-5 sm:p-8">
        <div
          className="flex border-b border-white/10 mb-7"
          role="tablist"
          aria-label="Transfer type"
        >
          {(["add", "send"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              aria-controls={`panel-${t}`}
              id={`tab-${t}`}
              onClick={() => {
                setTab(t);
                router.replace(`/transfer?tab=${t}`, { scroll: false });
              }}
              className={`px-4 py-4 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === t ? "border-blue-300 text-blue-300" : "border-transparent text-neutral-500 hover:text-white"}`}
            >
              {t === "add" ? "＋ Add money" : "↗ Send money"}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === "add" ? (
            <AddMoneyForm gateway={gateway} />
          ) : (
            <SendMoneyForm balance={balance?.amount ?? 0} />
          )}
        </div>
      </section>
      <aside className="space-y-5">
        <div className="wallet-card p-6">
          <p className="eyebrow">In your wallet</p>
          <p className="text-3xl font-semibold mt-4">
            {money(balance?.amount ?? 0)}
          </p>
          <p className="text-xs text-neutral-500 mt-3">
            Available for your next payment
          </p>
          <div className="h-px bg-white/5 my-5" />
          <div className="flex justify-between text-xs">
            <span className="text-neutral-500">Locked balance</span>
            <span>{money(balance?.locked ?? 0)}</span>
          </div>
        </div>
        <div className="p-5 text-sm text-neutral-500 leading-7">
          <h2 className="font-semibold text-neutral-300 mb-2">
            A little peace of mind.
          </h2>
          <p>
            Review your recipient and amount before you send. Every completed
            payment appears in both wallets’ activity.
          </p>
          <p className="mt-3">Amounts: ₹1 to ₹1,00,000 per transaction.</p>
        </div>
      </aside>
    </div>
  );
}
function AddMoneyForm({ gateway }: { gateway: boolean }) {
  const router = useRouter();
  const [amount, setAmount] = useState(""),
    [provider, setProvider] = useState<string>(BANKS[0]),
    [loading, setLoading] = useState(false),
    [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
      null,
    );
  const submitting = useRef(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    const paise = parseAmount(amount);
    if (paise === null) {
      setMessage({
        ok: false,
        text: "Enter ₹1 to ₹1,00,000 with up to two decimal places.",
      });
      return;
    }
    submitting.current = true;
    setLoading(true);
    setMessage(null);
    try {
      const result = await createOnRampTransaction(paise, provider);
      if (result.success && result.redirectUrl) router.push(result.redirectUrl);
      else setMessage({ ok: false, text: result.message });
    } catch {
      setMessage({
        ok: false,
        text: "Could not confirm your payment request. Check Activity for a pending payment before starting another.",
      });
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">A little top-up?</h2>
        <p className="text-sm text-neutral-500 mt-2">
          Choose an amount and a bank to get started.
        </p>
      </div>
      <div>
        <label htmlFor="add-amount" className="wallet-label">
          Amount in rupees
        </label>
        <input
          id="add-amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          className="wallet-input !text-3xl !py-5"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          disabled={loading}
        />
        <div className="flex gap-2 flex-wrap mt-3">
          {[500, 1000, 2000, 5000].map((a) => (
            <button
              type="button"
              key={a}
              disabled={loading}
              onClick={() => setAmount(String(a))}
              className={`text-xs border px-3 py-2 rounded-lg ${amount === String(a) ? "border-blue-300/50 text-blue-300 bg-blue-400/5" : "border-white/10 text-neutral-400 hover:border-blue-400/50"}`}
            >
              ₹{a.toLocaleString("en-IN")}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="bank" className="wallet-label">
          {gateway ? "Payment method" : "Choose your bank"}
        </label>
        {gateway ? (
          <p className="wallet-input">
            Razorpay secure checkout · Cards, UPI & bank payments
          </p>
        ) : (
          <select
            id="bank"
            className="wallet-input"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            disabled={loading}
          >
            {BANKS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        )}
      </div>
      <Notice message={message} />
      <button
        type="submit"
        className="primary-button w-full"
        disabled={loading}
      >
        {loading ? "Creating payment…" : "Continue to payment →"}
      </button>
      <p className="text-xs text-neutral-500 leading-6">
        Your wallet is credited after payment confirmation. You can resume a
        pending payment from Activity.
      </p>
    </form>
  );
}
function SendMoneyForm({ balance }: { balance: number }) {
  const router = useRouter();
  const [query, setQuery] = useState(""),
    [results, setResults] = useState<Recipient[]>([]),
    [recipient, setRecipient] = useState<Recipient | null>(null),
    [amount, setAmount] = useState(""),
    [searching, setSearching] = useState(false),
    [searchError, setSearchError] = useState("");
  const [loading, setLoading] = useState(false),
    [review, setReview] = useState(false),
    [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
      null,
    );
  const request = useRef<string | null>(null),
    submitting = useRef(false);
  useEffect(() => {
    if (recipient || query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      try {
        const res = await fetch(
          `/api/users?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setResults(data.users);
      } catch {
        if (!controller.signal.aborted)
          setSearchError("Could not search. Try again.");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, recipient]);
  function reset() {
    request.current = null;
    setReview(false);
    setMessage(null);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    const paise = parseAmount(amount);
    if (!recipient) {
      setMessage({
        ok: false,
        text: "Search for and choose a recipient first.",
      });
      return;
    }
    if (paise === null) {
      setMessage({
        ok: false,
        text: "Enter ₹1 to ₹1,00,000 with up to two decimal places.",
      });
      return;
    }
    if (paise > balance) {
      setMessage({
        ok: false,
        text: "You don’t have enough funds. Add money before sending.",
      });
      return;
    }
    if (!review) {
      setReview(true);
      setMessage(null);
      request.current ??= crypto.randomUUID();
      return;
    }
    submitting.current = true;
    setLoading(true);
    setMessage(null);
    try {
      const result = await p2pTransfer(
        recipient.number,
        paise,
        request.current!,
      );
      setMessage({ ok: result.success, text: result.message });
      if (result.success) {
        setAmount("");
        setQuery("");
        setRecipient(null);
        setResults([]);
        setReview(false);
        request.current = null;
        router.refresh();
      }
    } catch {
      setMessage({
        ok: false,
        text: "Connection interrupted. Retry without changing the details to safely confirm this payment.",
      });
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Make someone’s day.</h2>
        <p className="text-sm text-neutral-500 mt-2">
          Send directly to another EasePay wallet.
        </p>
      </div>
      {review && recipient ? (
        <div className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-5">
          <p className="eyebrow">Review your payment</p>
          <p className="text-3xl font-semibold mt-4">
            {money(parseAmount(amount) ?? 0)}
          </p>
          <p className="mt-4 text-sm">To {recipient.name || "EasePay user"}</p>
          <p className="text-xs text-neutral-400 mt-1">{recipient.number}</p>
          <p className="text-xs text-neutral-500 mt-4">
            Completed wallet transfers cannot be cancelled.
          </p>
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="recipient" className="wallet-label">
              Recipient name or phone number
            </label>
            <input
              id="recipient"
              autoComplete="off"
              className="wallet-input"
              placeholder="Search EasePay users…"
              value={query}
              disabled={loading}
              onChange={(e) => {
                setQuery(e.target.value);
                setRecipient(null);
                setResults([]);
                reset();
              }}
              required
            />
            <div aria-live="polite">
              {searching && !recipient && (
                <p className="text-xs text-neutral-500 mt-3">
                  Finding recipients…
                </p>
              )}
              {searchError && (
                <p className="text-xs text-red-300 mt-3">{searchError}</p>
              )}
              {recipient ? (
                <div className="mt-3 rounded-xl bg-blue-400/5 border border-blue-400/20 p-4 text-sm">
                  <span className="text-blue-300">
                    ✓ {recipient.name || "EasePay user"}
                  </span>
                  <p className="text-xs text-neutral-500 mt-1">
                    {recipient.number}
                  </p>
                </div>
              ) : results.length > 0 ? (
                <ul className="border border-white/10 rounded-xl mt-2 overflow-hidden">
                  {results.map((u) => (
                    <li key={u.number}>
                      <button
                        type="button"
                        onClick={() => {
                          setRecipient(u);
                          setQuery(u.name || u.number);
                          setResults([]);
                          setSearching(false);
                          reset();
                        }}
                        className="w-full p-3 text-left hover:bg-white/5 text-sm"
                      >
                        <span>{u.name || "EasePay user"}</span>
                        <span className="text-neutral-500 text-xs block mt-1">
                          {u.number}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                query.length >= 2 &&
                !searching &&
                !searchError && (
                  <p className="text-xs text-neutral-500 mt-3">
                    Choose a registered EasePay user to continue.
                  </p>
                )
              )}
            </div>
          </div>
          <div>
            <label htmlFor="send-amount" className="wallet-label">
              Amount in rupees
            </label>
            <input
              id="send-amount"
              inputMode="decimal"
              className="wallet-input !text-3xl !py-5"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                reset();
              }}
              required
              disabled={loading}
            />
            <p className="text-xs text-neutral-500 mt-2">
              Available: {money(balance)}
            </p>
          </div>
        </>
      )}
      <Notice message={message} />
      <button
        type="submit"
        disabled={loading}
        className="primary-button w-full"
      >
        {loading
          ? "Sending payment…"
          : review
            ? "Confirm & send payment"
            : "Review payment →"}
      </button>
      {review && (
        <button
          type="button"
          disabled={loading}
          onClick={() => setReview(false)}
          className="secondary-button w-full"
        >
          Edit payment
        </button>
      )}
    </form>
  );
}
