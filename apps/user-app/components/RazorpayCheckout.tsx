"use client";
import Script from "next/script";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkoutOptions, verifyCheckout } from "@/lib/actions/gateway";
type ProviderResult = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: () => void) => void;
    };
  }
}
export function RazorpayCheckout({
  token,
  status,
  mode,
}: {
  token: string;
  status: string;
  mode: string;
}) {
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  async function open() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const options = await checkoutOptions(token);
      if (!options.success) throw new Error(options.message);
      if (!window.Razorpay)
        throw new Error("Checkout is still loading. Please try again.");
      const checkout = new window.Razorpay({
        key: options.key,
        order_id: options.orderId,
        amount: options.amount,
        currency: "INR",
        name: "EasePay",
        description: "Wallet top-up",
        prefill: { name: options.name, email: options.email },
        theme: { color: "#16293d" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (result: ProviderResult) => {
          try {
            const checked = await verifyCheckout(
              token,
              result.razorpay_payment_id,
              result.razorpay_signature,
            );
            setMessage(checked.message);
            router.refresh();
          } catch {
            setMessage(
              "Verification is pending. Your wallet updates after provider confirmation.",
            );
          } finally {
            setBusy(false);
          }
        },
      });
      checkout.on("payment.failed", () => {
        setMessage("That attempt did not complete. You can retry checkout.");
        setBusy(false);
      });
      checkout.open();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not open checkout",
      );
      setBusy(false);
    }
  }
  return (
    <div className="mt-6">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onReady={() => setReady(true)}
        onError={() =>
          setMessage(
            "The payment provider could not load. Check your connection and try again.",
          )
        }
      />
      {status === "Processing" ? (
        <>
          <p className="text-sm text-neutral-400 mb-5">
            {mode === "razorpay_test"
              ? "Razorpay test checkout. Use test payment details; no real funds move."
              : "Complete your payment securely with Razorpay. Funds are credited only after verification."}
          </p>
          <button
            className="primary-button w-full"
            disabled={!ready || busy}
            onClick={open}
          >
            {busy
              ? "Waiting for payment…"
              : ready
                ? "Continue to Razorpay"
                : "Loading secure checkout…"}
          </button>
        </>
      ) : (
        <p className="text-blue-300">
          {status === "Success"
            ? "Payment verified and wallet credited."
            : "This payment is closed."}
        </p>
      )}
      <p role="status" className="mt-4 text-sm text-neutral-400">
        {message}
      </p>
    </div>
  );
}
