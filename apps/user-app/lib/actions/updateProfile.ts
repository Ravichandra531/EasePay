"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth";
import { prisma, Prisma } from "@repo/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { verifyEmailCode, EmailOtpError } from "../supabase-email";

const schema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").max(100),
  email: z.string().trim().toLowerCase().email(),
});

export async function updateProfile(
  name: string,
  email: string,
  password: string,
  emailCode?: string,
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, message: "Not authenticated" };
  }

  const parsed = schema.safeParse({ name, email });
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.errors[0]?.message ?? "Invalid input",
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(session.user.id) },
    });
    if (
      !user ||
      typeof password !== "string" ||
      !password ||
      password.length > 100 ||
      !(await bcrypt.compare(password, user.password))
    )
      return {
        success: false,
        message: "Enter your current password to save changes",
      };
    // Email is now a sign-in identity: require ownership before changing it.
    if (parsed.data.email !== user.email?.toLowerCase())
      await verifyEmailCode(parsed.data.email, emailCode);
    await prisma.user.update({
      where: { id: Number(session.user.id) },
      data: {
        name: parsed.data.name || null,
        email: parsed.data.email || null,
      },
    });
    revalidatePath("/profile");
    revalidatePath("/dashboard");
    return { success: true, message: "Profile updated successfully" };
  } catch (e: unknown) {
    if (e instanceof EmailOtpError)
      return { success: false, message: e.message };
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return {
        success: false,
        message: "Email already in use by another account",
      };
    }
    console.error(e);
    return { success: false, message: "Failed to update profile" };
  }
}
