import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import { ProfileClient } from "@/components/ProfileClient";

export default async function Profile() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: { id: true, name: true, email: true, number: true },
  });

  if (!user) redirect("/login");

  return (
    <div className="w-full pt-8 pb-12 wallet-enter">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Profile</h1>
        <p className="text-[#A0A0A0] text-sm mt-1">
          Manage your account details
        </p>
      </div>
      <ProfileClient user={user} />
    </div>
  );
}
