"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "./ui/Icon";
export function LandingExperience() {
  const [business, setBusiness] = useState(false);
  return (
    <div className="landing-experience">
      <div className="inline-flex rounded-full border border-[#192a3b15] p-1 bg-white/50 gap-1">
        {[false, true].map((value) => (
          <button
            key={String(value)}
            onClick={() => setBusiness(value)}
            aria-pressed={business === value}
            className={`px-6 py-3 rounded-full text-xs font-semibold transition-colors ${business === value ? "bg-[#192a3b] text-white" : "text-[#4d6680]"}`}
          >
            {value ? "For my business" : "For my everyday"}
          </button>
        ))}
      </div>
      <h2 className="landing-heading mt-8">
        {business ? (
          <>
            Big ambitions.
            <br />
            Small payment admin.
          </>
        ) : (
          <>
            A little less friction.
            <br />A lot more freedom.
          </>
        )}
      </h2>
      <p className="landing-copy mt-6 max-w-xl">
        {business
          ? "From the first coffee of the day to your last customer, let one QR do the collecting. Keep every receipt in view and move earnings to your bank."
          : "Split the dinner bill. Pay the corner café. Move funds back to your bank. One wallet that keeps up with the way your day goes."}
      </p>
      <Link
        href={business ? "/merchant" : "/transfer?tab=send"}
        className="landing-button mt-8"
      >
        {business ? "Meet your business wallet" : "Explore your wallet"}
        <Icon name="arrow-right" size={17} />
      </Link>
    </div>
  );
}
