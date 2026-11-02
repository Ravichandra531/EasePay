"use server";
import { randomUUID } from "node:crypto";
import { sendEmailCode, EmailOtpError } from "../supabase-email";

export async function requestEmailOtp(email: string) {
  try {
    await sendEmailCode(email);
    return {
      success: true as const,
      // UI timer only: verification and single use are enforced by Supabase.
      challengeId: randomUUID(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      resendAfter: 60,
    };
  } catch (error) {
    return {
      success: false as const,
      message:
        error instanceof EmailOtpError
          ? error.message
          : "Email verification is temporarily unavailable. Please try again.",
    };
  }
}
