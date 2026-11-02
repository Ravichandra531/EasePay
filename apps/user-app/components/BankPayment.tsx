"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { settleSandboxPayment } from "@/lib/actions/settleSandboxPayment";
export function BankPayment({
  token,
  status,
  enabled,
}: {
  token: string;
  status: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  async function settle(outcome: "Success" | "Failure") {
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const result = await settleSandboxPayment(token, outcome);
      setMessage(result.message);
      if (result.success) router.refresh();
    } catch {
      setMessage(
        "Connection interrupted. Check the payment status before trying again.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="mt-6">
      {status === "Processing" ? (
        enabled ? (
          <>
            <p className="text-sm leading-6 text-neutral-400 mb-6">
              This is a demo payment. No real money moves and no bank
              credentials are required.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                className="primary-button"
                disabled={pending}
                onClick={() => settle("Success")}
              >
                {pending ? "Processing…" : "Approve demo payment"}
              </button>
              <button
                className="secondary-button"
                disabled={pending}
                onClick={() => settle("Failure")}
              >
                Cancel payment
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-neutral-400">
            Awaiting a verified bank callback. Your balance updates after
            confirmation.
          </p>
        )
      ) : (
        <div
          className={`rounded-xl p-4 ${status === "Success" ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-300"}`}
        >
          {status === "Success"
            ? "Payment complete. Funds are in your wallet."
            : "Payment cancelled. No funds were added."}
        </div>
      )}
      <p role="status" className="text-sm mt-4 text-neutral-300">
        {message}
      </p>
      <Link
        href="/dashboard"
        className="inline-block mt-6 text-sm text-blue-400"
      >
        Go to your wallet →
      </Link>
    </div>
  );
}
