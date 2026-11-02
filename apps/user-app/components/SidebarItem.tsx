"use client";

import { usePathname, useRouter } from "next/navigation";
import React from "react";

export const SidebarItem = ({
  href,
  title,
  icon,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const selected = pathname === href;

  return (
    <button
      onClick={() => router.push(href)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
        selected
          ? "bg-[#1068c0]/10 text-[#1068c0]"
          : "text-[#A0A0A0] hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className={selected ? "text-[#1068c0]" : "text-[#A0A0A0]"}>
        {icon}
      </span>
      <span>{title}</span>
      {selected && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1068c0]" />
      )}
    </button>
  );
};
