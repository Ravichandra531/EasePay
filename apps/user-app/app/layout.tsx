import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/Providers";

const inter = localFont({ src: "./fonts/GeistVF.woff", display: "swap" });

export const metadata: Metadata = {
  title: "EasePay — Pay friends. Pay for everything.",
  description:
    "Easily send money to your friends and pay for everything you want — instantly, securely, and for free.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
