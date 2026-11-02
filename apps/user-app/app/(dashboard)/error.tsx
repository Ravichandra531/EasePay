"use client";
import Link from "next/link";
export default function WalletError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="wallet-card p-8 max-w-lg mx-auto mt-16">
      <p className="eyebrow">A small interruption</p>
      <h1 className="text-2xl font-bold mt-4">We couldn’t load your wallet.</h1>
      <p className="text-sm text-neutral-400 leading-7 mt-4">
        The connection may be unavailable. Please try again in a moment.
      </p>
      <div className="flex gap-3 mt-6">
        <button className="primary-button" onClick={reset}>
          Try again
        </button>
        <Link href="/login" className="secondary-button">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
