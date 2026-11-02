"use server";
import { z } from "zod";
import { phoneSchema } from "../validation";
import {
  beginPhoneVerification,
  verifyPhoneChallenge,
} from "../phone-verification";
import { OtpError } from "../otp-provider";
export async function requestPhoneOtp(
  phone: string,
  purpose: "signup" | "login",
) {
  const parsed = z
    .object({ phone: phoneSchema, purpose: z.enum(["signup", "login"]) })
    .safeParse({ phone, purpose });
  if (!parsed.success)
    return {
      success: false as const,
      message: "Enter a valid 10-digit Indian phone number.",
    };
  try {
    return {
      success: true as const,
      ...(await beginPhoneVerification(parsed.data.phone, parsed.data.purpose)),
    };
  } catch (error) {
    return {
      success: false as const,
      message:
        error instanceof OtpError
          ? error.message
          : "Phone verification is temporarily unavailable. Please try again.",
    };
  }
}
export async function verifySignupOtp(challengeId: string, code: string) {
  try {
    const challenge = await verifyPhoneChallenge(challengeId, code, "signup");
    return { success: true as const, challengeId: challenge.id };
  } catch (error) {
    return {
      success: false as const,
      message:
        error instanceof OtpError
          ? error.message
          : "Could not verify this code. Please try again.",
    };
  }
}
