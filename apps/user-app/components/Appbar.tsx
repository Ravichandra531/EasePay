"use client";
import Link from "next/link";
import { Icon } from "./ui/Icon";
import { signOut, useSession } from "next-auth/react";
export function AppbarClient() {
  const { data } = useSession();
  return (
    <header className="fixed top-0 inset-x-0 z-30 h-18 bg-[#0a0e12]/90 border-b border-white/[.07] backdrop-blur-xl flex items-center justify-between px-5 sm:px-8">
      <Link
        href="/dashboard"
        className="flex items-center gap-3 font-bold text-xl tracking-tight"
      >
        <span className="w-9 h-9 rounded-xl bg-blue-400 text-[#061320] grid place-items-center text-2xl">
          <Icon name="arrow-up-right" size={23} />
        </span>
        EasePay<span className="text-blue-400">.</span>
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/profile"
          className="text-sm text-neutral-300 hidden sm:inline hover:text-blue-400"
        >
          {data?.user?.name || "My account"}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs font-medium border border-white/10 rounded-full px-4 py-2 hover:bg-white/5"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
