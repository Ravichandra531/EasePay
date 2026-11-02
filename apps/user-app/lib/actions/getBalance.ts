import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth";
import { prisma } from "@repo/db";

export async function getBalance() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  const balance = await prisma.balance.findUnique({
    where: {
      userId: Number(session.user.id),
    },
  });

  return {
    amount: balance?.amount ?? 0,
    locked: balance?.locked ?? 0,
  };
}
