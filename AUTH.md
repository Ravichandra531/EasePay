# EasePay email authentication

Login and signup use Supabase email OTP. NextAuth continues to issue the wallet session, and PostgreSQL/Neon continues to store users, balances, and transactions. Password sign-in remains available. Email OTP is an alternative sign-in method, not mandatory two-factor authentication.

## Environment

Set these in `apps/user-app/.env`, Vercel's deployment environment, or `.env.docker`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

This workspace's ignored local `.env` is configured with the supplied Supabase project. The publishable key is sufficient: no service-role key is needed. Server-only aliases `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are also supported and take precedence. The server reads configuration at request time for container deployment.

Keep `DATABASE_URL`, `NEXTAUTH_SECRET` (or the existing `JWT_SECRET`), `NEXTAUTH_URL`, `APP_URL`, and `BANK_ACCOUNT_ENCRYPTION_KEY` configured as before. No wallet schema migration is needed for email OTP. Historical phone-verification tables/data are retained; Twilio and console OTP adapters are no longer used.

## Required Supabase dashboard configuration

Open the supplied project's [Authentication settings](https://supabase.com/dashboard/project/qeerodplkmmjujmyuqoh/auth/providers).

1. Enable the Email provider and allow new users. Existing wallet accounts are enrolled in Supabase when first requesting an email code.
2. Set email OTP length to **6 digits**, expiry to **600 seconds**, and resend interval to at least **60 seconds**. The app's code-entry screen expires after ten minutes.
3. In Authentication > Email Templates, include the code in both **Confirm signup** and **Magic Link** templates. New and returning Supabase users may receive different templates:

   ```html
   <h2>Your EasePay verification code</h2>
   <p>Enter this code in EasePay:</p>
   <p><strong>{{ .Token }}</strong></p>
   <p>If you did not request this code, you can ignore this email.</p>
   ```

4. Configure custom SMTP for public users. Supabase's built-in sender delivers only to project organization team members and is limited to two emails per hour. SMTP credentials belong in Supabase, not the browser or this repository.
5. Set the Site URL to your deployed EasePay HTTPS URL and configure provider email rate limits for the intended traffic. The code-entry flow does not require a callback URL or magic-link redirect.

See [Supabase email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), and [rate limits](https://supabase.com/docs/guides/auth/rate-limits).

## Verification behavior

The server calls Supabase's `/auth/v1/otp` and `/auth/v1/verify` endpoints with the publishable key. It verifies the returned confirmed email matches the requested address. Codes and Supabase access/refresh tokens are never returned to the browser or stored in the NextAuth session. Supabase enforces code validity, expiry, single use, and rate limits; the UI also provides a sixty-second resend countdown. There are no fixed, console, or production bypass codes.

Signup verifies the code before creating the user, zero balance, and optional merchant in a database transaction. If account creation fails after the code is consumed, request a new code. Login maps the verified email to an existing wallet account; it never creates a wallet automatically. Users must sign up first. Email changes require the current password and a code sent to the new address.

Phone numbers remain required for wallet transfers and must be unique, but email OTP does not prove phone ownership or set `phoneVerifiedAt`. Existing users, balances, and payment mode are preserved. This integration does not move wallet data into Supabase.

## Validation

Unit/UI tests mock Supabase and database boundaries to check valid/invalid codes, mismatched identities, signup gating, session identity, email changes, password fallback, and error states. Actual email delivery requires the dashboard configuration above and a test with an address you control; it cannot be established by a successful build.
