"use client";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "./ui/Icon";
export function LandingNav({ signedIn = false }: { signedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="landing-nav">
      <div className="landing-container flex h-22 items-center justify-between gap-6">
        <Link href="/" className="landing-logo">
          <span className="landing-logomark">
            <Icon name="arrow-up-right" size={25} />
          </span>
          easepay<span className="text-[#7590ac]">.</span>
        </Link>
        <nav
          className="hidden md:flex gap-8 text-[13px] font-medium"
          aria-label="Main navigation"
        >
          <a href="#personal">Personal</a>
          <a href="#business">Business</a>
          <a href="#how-it-works">How it works</a>
          <a href="#security">Security</a>
        </nav>
        <div className="hidden md:flex gap-5 items-center text-[13px] font-semibold">
          <Link href={signedIn ? "/dashboard" : "/login"}>
            {signedIn ? "My wallet" : "Log in"}
          </Link>
          <Link
            href={signedIn ? "/merchant" : "/signup"}
            className="landing-button !py-3 !px-5"
          >
            {signedIn ? "For business" : "Get started"}
            <Icon name="arrow-up-right" size={16} />
          </Link>
        </div>
        <button
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="md:hidden p-3"
        >
          <Icon name={open ? "x" : "menu"} />
        </button>
      </div>
      {open && (
        <nav
          className="md:hidden landing-container pb-6 grid gap-4 text-sm"
          aria-label="Mobile navigation"
        >
          {[
            { label: "Personal", href: "#personal" },
            { label: "Business", href: "#business" },
            { label: "How it works", href: "#how-it-works" },
            { label: "Security", href: "#security" },
            { label: "Log in", href: "/login" },
            { label: "Get started", href: "/signup" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
