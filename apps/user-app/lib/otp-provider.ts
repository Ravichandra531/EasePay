import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
export class OtpError extends Error {}
export type OtpProvider = "twilio" | "console";
export const OTP_LIFETIME_MS = 10 * 60 * 1000;
export const OTP_RESEND_SECONDS = 60;
export const OTP_MAX_ATTEMPTS = 5;
export function otpSecret() {
  const secret =
    process.env.OTP_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32)
    throw new OtpError("Phone verification is not configured yet.");
  return secret;
}
export function otpDigest(value: string) {
  return createHmac("sha256", otpSecret()).update(value).digest("hex");
}
export function codeMatches(id: string, code: string, hash: string) {
  if (!/^\d{6}$/.test(code) || !/^[a-f0-9]{64}$/.test(hash)) return false;
  return timingSafeEqual(
    Buffer.from(otpDigest(`${id}:${code}`), "hex"),
    Buffer.from(hash, "hex"),
  );
}
function twilioConfig() {
  const service = process.env.TWILIO_VERIFY_SERVICE_SID;
  const username =
    process.env.TWILIO_API_KEY_SID || process.env.TWILIO_ACCOUNT_SID;
  const password =
    process.env.TWILIO_API_KEY_SECRET || process.env.TWILIO_AUTH_TOKEN;
  if (!service || !/^VA[a-f0-9]{32}$/i.test(service) || !username || !password)
    throw new OtpError(
      "SMS verification is not configured yet. Please try again after setup.",
    );
  return { service, username, password };
}
export function otpProvider(): OtpProvider {
  otpSecret();
  if (process.env.OTP_PROVIDER === "console") {
    if (
      process.env.NODE_ENV !== "development" ||
      process.env.ALLOW_DEV_OTP !== "true" ||
      process.env.BANK_SANDBOX_ENABLED !== "true" ||
      process.env.LIVE_PAYMENTS_ENABLED === "true"
    )
      throw new OtpError("Development OTPs are disabled in this environment.");
    return "console";
  }
  twilioConfig();
  return "twilio";
}
async function twilioRequest(resource: string, fields: Record<string, string>) {
  const { service, username, password } = twilioConfig();
  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${service}/${resource}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(fields),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    },
  );
  if (response.status === 429)
    throw new OtpError(
      "Too many verification requests. Please wait before trying again.",
    );
  if (!response.ok)
    throw new OtpError(
      resource === "Verifications"
        ? "We could not confirm SMS delivery. Please wait a minute before requesting another code."
        : "That code is invalid or expired. Request a new code if needed.",
    );
  return response.json() as Promise<{ sid?: string; status?: string }>;
}
export async function issuePhoneCode(
  id: string,
  phone: string,
  provider: OtpProvider,
) {
  if (provider !== otpProvider())
    throw new OtpError(
      "The verification method has changed. Request a new code.",
    );
  if (provider === "console") {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    // Explicit local-only adapter: never return codes in HTTP responses or use fixed codes.
    console.info(
      `[EasePay DEVELOPMENT OTP] phone ending ${phone.slice(-4)} · ${code}`,
    );
    return { codeHash: otpDigest(`${id}:${code}`), providerSid: null };
  }
  const sent = await twilioRequest("Verifications", {
    To: `+91${phone}`,
    Channel: "sms",
  });
  if (sent.status !== "pending" || !sent.sid)
    throw new OtpError("SMS could not be sent. Please try again in a minute.");
  return { providerSid: sent.sid, codeHash: null };
}
export async function checkPhoneCode(
  id: string,
  phone: string,
  code: string,
  provider: OtpProvider,
  codeHash: string | null,
  providerSid: string | null,
) {
  if (provider !== otpProvider()) return false;
  if (provider === "console")
    return !!codeHash && codeMatches(id, code, codeHash);
  if (!providerSid || !/^VE[a-f0-9]{32}$/i.test(providerSid)) return false;
  // Bind the approval to this challenge's provider verification, not a later SMS to the same phone.
  const checked = await twilioRequest("VerificationCheck", {
    VerificationSid: providerSid,
    Code: code,
  });
  return checked.status === "approved";
}
