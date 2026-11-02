"use client";

import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export const Button = ({ onClick, children, disabled }: ButtonProps) => {
  return (
    <button
      onClick={onClick}
      type="button"
      disabled={disabled}
      className="text-[#0F0F0F] bg-[#1068c0] hover:bg-[#0d59a6] focus:outline-none focus:ring-4 focus:ring-[#1068c0]/30 font-semibold rounded-xl text-sm px-5 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
    >
      {children}
    </button>
  );
};
