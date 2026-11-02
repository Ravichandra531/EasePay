import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { prisma, type Prisma } from "@repo/db";
import {
  checkPhoneCode,
  issuePhoneCode,
  OtpError,
  otpDigest,
  otpProvider,
  OTP_LIFETIME_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_SECONDS,
  type OtpProvider,
} from "./otp-provider";
export type VerificationPurpose = "signup" | "login";
const COOKIE = "easepay.phone-session";
export async function phoneSessionHash(create = false) {
  const jar = await cookies();
  let secret = jar.get(COOKIE)?.value;
  if (!secret && create) {
    secret = randomBytes(32).toString("hex");
    jar.set(COOKIE, secret, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 3600,
    });
  }
  if (!secret || !/^[a-f0-9]{64}$/.test(secret))
    throw new OtpError("Start a new phone verification in this browser.");
  return otpDigest(`session:${secret}`);
}
export async function beginPhoneVerification(
  phone: string,
  purpose: VerificationPurpose,
) {
  const provider = otpProvider(),
    sessionHash = await phoneSessionHash(true),
    now = new Date();
  const requestHeaders = await headers();
  const clientAddress =
    requestHeaders
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim()
      .slice(0, 100) || sessionHash;
  const bucket = Math.floor(now.getTime() / 3_600_000);
  const limits = [
    { key: otpDigest(`phone:${phone}:${bucket}`), max: 5 },
    { key: otpDigest(`client:${clientAddress}:${bucket}`), max: 15 },
  ];
  const challenge = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${phone}))`;
    const latest = await tx.phoneVerification.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" },
    });
    if (
      latest &&
      now.getTime() - latest.createdAt.getTime() < OTP_RESEND_SECONDS * 1000
    )
      throw new OtpError(
        "Please wait 60 seconds before requesting another code.",
      );
    for (const limit of limits) {
      await tx.authRateLimit.upsert({
        where: { key: limit.key },
        create: {
          key: limit.key,
          count: 0,
          expiresAt: new Date((bucket + 1) * 3_600_000),
        },
        update: {},
      });
      const charged = await tx.authRateLimit.updateMany({
        where: { key: limit.key, count: { lt: limit.max } },
        data: { count: { increment: 1 } },
      });
      if (!charged.count)
        throw new OtpError("Too many codes requested. Please try again later.");
    }
    await tx.phoneVerification.updateMany({
      where: { phone, purpose, sessionHash, consumedAt: null },
      data: { consumedAt: now, codeHash: null },
    });
    return tx.phoneVerification.create({
      data: {
        phone,
        purpose,
        provider,
        sessionHash,
        expiresAt: new Date(now.getTime() + OTP_LIFETIME_MS),
      },
    });
  });
  const sent = await issuePhoneCode(challenge.id, phone, provider);
  await prisma.phoneVerification.update({
    where: { id: challenge.id },
    data: { ...sent, sentAt: new Date() },
  });
  return {
    challengeId: challenge.id,
    expiresAt: challenge.expiresAt.toISOString(),
    resendAfter: OTP_RESEND_SECONDS,
    delivery:
      provider === "console" ? ("development" as const) : ("sms" as const),
  };
}
export async function verifyPhoneChallenge(
  id: string,
  code: string,
  purpose: VerificationPurpose,
) {
  if (!/^[a-z0-9]{10,100}$/i.test(id) || !/^\d{6}$/.test(code))
    throw new OtpError("Enter the six-digit code.");
  const sessionHash = await phoneSessionHash(),
    now = new Date(),
    provider = otpProvider();
  const challenge = await prisma.phoneVerification.findFirst({
    where: {
      id,
      purpose,
      sessionHash,
      provider,
      consumedAt: null,
      expiresAt: { gt: now },
      sentAt: { not: null },
    },
  });
  if (!challenge)
    throw new OtpError("That verification expired. Request a new code.");
  if (challenge.verifiedAt) return challenge;
  const attempt = await prisma.phoneVerification.updateMany({
    where: {
      id,
      sessionHash,
      verifiedAt: null,
      consumedAt: null,
      expiresAt: { gt: now },
      attempts: { lt: OTP_MAX_ATTEMPTS },
    },
    data: { attempts: { increment: 1 } },
  });
  if (!attempt.count)
    throw new OtpError("Too many attempts. Request a new code.");
  if (
    !(await checkPhoneCode(
      id,
      challenge.phone,
      code,
      provider as OtpProvider,
      challenge.codeHash,
      challenge.providerSid,
    ))
  )
    throw new OtpError("That code is incorrect. Check it and try again.");
  const approved = await prisma.phoneVerification.updateMany({
    where: {
      id,
      sessionHash,
      consumedAt: null,
      verifiedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { verifiedAt: new Date() },
  });
  if (!approved.count)
    throw new OtpError(
      "That code has already been used or expired. Request a new code.",
    );
  return { ...challenge, verifiedAt: new Date() };
}
export async function consumePhoneProof(
  tx: Prisma.TransactionClient,
  id: string,
  phone: string,
  purpose: VerificationPurpose,
  sessionHash: string,
) {
  const provider = otpProvider();
  const consumed = await tx.phoneVerification.updateMany({
    where: {
      id,
      phone,
      purpose,
      sessionHash,
      provider,
      verifiedAt: { not: null },
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { consumedAt: new Date(), codeHash: null },
  });
  if (!consumed.count)
    throw new OtpError("Verify this phone number before continuing.");
  return provider;
}
export async function loginWithPhoneCode(challengeId: string, code: string) {
  const challenge = await verifyPhoneChallenge(challengeId, code, "login"),
    sessionHash = await phoneSessionHash();
  return prisma.$transaction(async (tx) => {
    const provider = await consumePhoneProof(
      tx,
      challenge.id,
      challenge.phone,
      "login",
      sessionHash,
    );
    const user = await tx.user.findUnique({
      where: { number: challenge.phone },
      select: { id: true, name: true, email: true, number: true },
    });
    if (!user) return null;
    if (provider === "twilio")
      await tx.user.update({
        where: { id: user.id },
        data: {
          phoneVerifiedAt: new Date(),
          phoneVerificationProvider: "twilio",
        },
      });
    return {
      id: String(user.id),
      name: user.name ?? "",
      email: user.email ?? user.number,
    };
  });
}
