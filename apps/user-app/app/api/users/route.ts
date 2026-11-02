import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { authOptions } from "@/lib/auth";
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ message: "Please sign in" }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100)
    return NextResponse.json({ users: [] });
  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: Number(session.user.id) },
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { number: { startsWith: query } },
        ],
      },
      select: { name: true, number: true },
      take: 6,
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json(
      { message: "Could not search recipients. Please try again." },
      { status: 503 },
    );
  }
}
