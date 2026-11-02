"use server";

import { prisma, Prisma } from "@repo/db";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { signupSchema } from "../validation";
import { consumePhoneProof, phoneSessionHash } from "../phone-verification";
import { OtpError } from "../otp-provider";

export async function signUp(input: {
  phoneVerificationId?: string;
  accountType?: "personal" | "merchant";
  businessName?: string;
  name?: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{ success: true } | { success: false; message: string }> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.errors[0]?.message ?? "Invalid input",
    };
  }

  const { name, email, phone, password, accountType, businessName } =
    parsed.data;
  if (accountType === "merchant" && !businessName?.trim())
    return { success: false, message: "Enter your business name" };

  try {
    if (
      !input.phoneVerificationId ||
      !/^[a-z0-9]{10,100}$/i.test(input.phoneVerificationId)
    )
      return {
        success: false,
        message: "Verify your phone number before creating an account.",
      };
    const sessionHash = await phoneSessionHash();
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.$transaction(async (tx) => {
      const provider = await consumePhoneProof(
        tx,
        input.phoneVerificationId!,
        phone,
        "signup",
        sessionHash,
      );
      const user = await tx.user.create({
        data: {
          name: name ? name : null,
          email,
          number: phone,
          password: hashedPassword,
          phoneVerifiedAt: provider === "twilio" ? new Date() : null,
          phoneVerificationProvider: provider,
        },
      });

      if (accountType === "merchant")
        await tx.merchant.create({
          data: {
            ownerId: user.id,
            email,
            name: businessName!,
            slug: randomBytes(10).toString("hex"),
            auth_type: "Credentials",
          },
        });
      await tx.balance.create({
        data: {
          userId: user.id,
          amount: 0,
          locked: 0,
        },
      });
    });

    return { success: true };
  } catch (e: unknown) {
    if (e instanceof OtpError) return { success: false, message: e.message };
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { success: false, message: "Email or phone already in use" };
    }
    console.error(e);
    return { success: false, message: "Failed to create account" };
  }
}
