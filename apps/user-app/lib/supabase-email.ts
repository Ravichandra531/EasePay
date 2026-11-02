import { z } from "zod";

export class EmailOtpError extends Error {}
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
const codeSchema = z.string().regex(/^\d{6}$/);

function config() {
  // Read at request time so container hosts can inject these after the build.
  const env = process.env;
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new EmailOtpError("Email verification is not configured yet.");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new EmailOtpError("Email verification is not configured yet.");
  }
  if (parsed.protocol !== "https:")
    throw new EmailOtpError(
      "Email verification requires an HTTPS Supabase URL.",
    );
  return { url: parsed.origin, key };
}

async function authRequest(
  endpoint: "otp" | "verify",
  body: Record<string, unknown>,
) {
  const { url, key } = config();
  let response: Response;
  try {
    response = await fetch(`${url}/auth/v1/${endpoint}`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new EmailOtpError(
      "Could not reach email verification. Please try again.",
    );
  }
  if (response.status === 429)
    throw new EmailOtpError(
      "Too many requests. Please wait before trying again.",
    );
  if (!response.ok) {
    if (endpoint === "verify")
      throw new EmailOtpError(
        "That code is incorrect or expired. Request a new code if needed.",
      );
    throw new EmailOtpError(
      "Could not send your email code. Please try again later.",
    );
  }
  return response;
}

export async function sendEmailCode(input: unknown) {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) throw new EmailOtpError("Enter a valid email address.");
  // Existing wallet users may not have a Supabase identity yet. Enroll the email
  // with Supabase, but never implicitly create a wallet account during login.
  await authRequest("otp", { email: parsed.data, create_user: true });
}

export async function verifyEmailCode(
  input: unknown,
  code: unknown,
): Promise<string> {
  const email = emailSchema.safeParse(input),
    token = codeSchema.safeParse(code);
  if (!email.success || !token.success)
    throw new EmailOtpError("Enter your email address and the six-digit code.");
  const response = await authRequest("verify", {
    email: email.data,
    token: token.data,
    type: "email",
  });
  // Only trust the identity returned by Supabase's verification endpoint. Its
  // access/refresh tokens never reach the browser or our NextAuth session.
  const result = z
    .object({
      user: z.object({
        id: z.string().min(1),
        email: emailSchema,
        email_confirmed_at: z.string().min(1),
      }),
    })
    .safeParse(await response.json());
  if (!result.success || result.data.user.email !== email.data)
    throw new EmailOtpError("Email verification failed. Request a new code.");
  return result.data.user.email;
}
