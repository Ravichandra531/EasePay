import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppbarClient } from "@/components/Appbar";
import { WalletNav } from "@/components/WalletNav";
import { paymentMode } from "@/lib/banking";
import { LiveRefresh } from "@/components/LiveRefresh";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  return (
    <div className="min-h-screen bg-[#0a0e12] text-[#ecf0f4]">
      <AppbarClient />
      <WalletNav />
      <div className="md:ml-60 pt-18 pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          {paymentMode() !== "razorpay_live" && (
            <p className="text-[11px] text-blue-300/65 pt-5 tracking-wide">
              {paymentMode() === "sandbox"
                ? "DEMO WALLET · No real funds move"
                : "RAZORPAY TEST · Test funds only"}
            </p>
          )}
          {children}
        </div>
      </div>
      <LiveRefresh />
    </div>
  );
}
