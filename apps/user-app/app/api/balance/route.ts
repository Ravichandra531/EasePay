import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const balance = await prisma.balance.findUnique({
      where: { userId: Number(session.user.id) },
    });

    return NextResponse.json({
      amount: balance?.amount ?? 0,
      locked: balance?.locked ?? 0,
    });
  } catch {
    return NextResponse.json(
      { message: "Balance is temporarily unavailable" },
      { status: 503 },
    );
  }
}
