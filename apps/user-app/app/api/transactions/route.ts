import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getWalletTransactions } from "@/lib/actions/getTransactions";
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ transactions: await getWalletTransactions() });
  } catch {
    return NextResponse.json(
      { message: "Activity is temporarily unavailable" },
      { status: 503 },
    );
  }
}
