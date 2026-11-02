"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { payMerchant } from "@/lib/actions/merchant";
import { parseAmount } from "@/lib/validation";
import { money } from "@/lib/format";
import { Icon } from "./ui/Icon";
export function MerchantCheckout({
  slug,
  name,
  signedIn,
  balance,
}: {
  slug: string;
  name: string;
  signedIn: boolean;
  balance: number;
}) {
  const [amount, setAmount] = useState(""),
    [review, setReview] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [reference, setReference] = useState("");
  const request = useRef<string | null>(null),
    lock = useRef(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    const paise = parseAmount(amount);
    if (paise === null) {
      setMessage("Enter ₹1 to ₹1,00,000 with at most two decimal places.");
      return;
    }
    if (paise > balance) {
      setMessage("Not enough wallet funds. Add money before paying.");
      return;
    }
    if (!review) {
      setReview(true);
      request.current ??= crypto.randomUUID();
      setMessage("");
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const result = await payMerchant(slug, paise, request.current!);
      setMessage(result.message);
      if (result.success) setReference(result.reference!);
    } catch {
      setMessage(
        "Connection interrupted. Retry without changing the details to safely confirm payment.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (reference)
    return (
      <div className="text-center py-6">
        <span className="rounded-full bg-[#cbe0f6] p-4 inline-flex text-[#172e45]">
          <Icon name="circle-check" size={36} />
        </span>
        <h2 className="text-2xl font-bold mt-6">A little payment. All done.</h2>
        <p className="text-[#6f7b72] mt-3">{message}</p>
        <p className="text-xs font-mono text-[#6f7b72] mt-5">
          Receipt {reference}
        </p>
        <Link href="/transactions" className="landing-button mt-7">
          View receipt <Icon name="arrow-right" size={17} />
        </Link>
      </div>
    );
  if (!signedIn)
    return (
      <div className="text-center">
        <p className="text-sm text-[#6f7b72] leading-7 mb-6">
          Sign in to review and pay {name} from your EasePay wallet.
        </p>
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(`/pay/${slug}`)}`}
          className="landing-button w-full"
        >
          Sign in to pay <Icon name="arrow-right" size={17} />
        </Link>
        <Link href="/signup" className="text-sm block mt-5 text-[#31465c]">
          New here? Create an account
        </Link>
      </div>
    );
  return (
    <form onSubmit={submit} className="space-y-5">
      {review ? (
        <div className="bg-[#e9eef4] rounded-2xl p-6">
          <p className="text-xs uppercase tracking-widest text-[#6f7b72]">
            Confirm your payment
          </p>
          <p className="text-4xl font-bold mt-4">
            {money(parseAmount(amount) ?? 0)}
          </p>
          <p className="text-sm mt-4">To {name}</p>
          <p className="text-xs text-[#6f7b72] mt-3">
            Completed wallet payments cannot be cancelled.
          </p>
        </div>
      ) : (
        <>
          <label
            htmlFor="merchant-amount"
            className="text-sm block font-medium"
          >
            How much would you like to pay?
          </label>
          <input
            id="merchant-amount"
            className="landing-input !text-4xl"
            inputMode="decimal"
            placeholder="₹0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              request.current = null;
            }}
            required
          />
          <p className="text-xs text-[#6f7b72]">
            Wallet available: {money(balance)}
          </p>
        </>
      )}
      <p role="status" className="text-sm text-[#486079]">
        {message}
      </p>
      <button className="landing-button w-full" disabled={busy}>
        {busy
          ? "Confirming payment…"
          : review
            ? "Confirm & pay"
            : "Review payment"}
        <Icon name="arrow-right" size={17} />
      </button>
      {review && (
        <button
          type="button"
          className="text-sm block mx-auto"
          onClick={() => setReview(false)}
          disabled={busy}
        >
          Edit amount
        </button>
      )}
      <Link
        href="/transfer?tab=add"
        className="block text-xs text-center text-[#6f7b72]"
      >
        Need a top-up? Add money to your wallet
      </Link>
    </form>
  );
}
