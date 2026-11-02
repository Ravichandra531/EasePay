"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./ui/Icon";
const items: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Overview", icon: "layout-dashboard" },
  { href: "/transfer", label: "Move money", icon: "arrow-left-right" },
  { href: "/scan", label: "Scan & pay", icon: "scan-line" },
  { href: "/transactions", label: "Activity", icon: "receipt" },
  { href: "/withdraw", label: "Withdraw", icon: "landmark" },
  { href: "/merchant", label: "Business", icon: "store" },
  { href: "/profile", label: "Account", icon: "user-round" },
];
export function WalletNav() {
  const path = usePathname();
  return (
    <aside className="fixed bottom-0 inset-x-0 z-20 md:top-18 md:right-auto md:w-60 bg-[#0a0e12]/95 backdrop-blur-xl border-t md:border-t-0 md:border-r border-white/[.07] md:px-4 md:py-8">
      <p className="eyebrow hidden md:block px-4 mb-5">
        Your everyday, simplified
      </p>
      <nav
        aria-label="Wallet navigation"
        className="flex overflow-x-auto md:flex-col md:gap-1 justify-around"
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={path === item.href ? "page" : undefined}
            className={`shrink-0 md:shrink flex flex-col md:flex-row items-center gap-1.5 md:gap-3 px-3 md:px-4 py-3 md:rounded-xl text-[9px] sm:text-[10px] md:text-sm font-medium transition-colors ${path === item.href ? "text-blue-300 md:bg-blue-400/10" : "text-neutral-500 hover:text-white hover:bg-white/[.03]"}`}
          >
            <Icon name={item.icon} size={19} />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="hidden md:block absolute bottom-8 px-4">
        <p className="text-xs text-neutral-500">
          Made for life.
          <br />
          Ready for business.
        </p>
        <Link
          href="/"
          className="inline-block text-xs text-blue-400/70 mt-5"
        >
          EasePay wallet ↗
        </Link>
      </div>
    </aside>
  );
}
