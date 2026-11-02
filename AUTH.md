# EasePay phone authentication

Login and signup share the landing page design. Login supports either a phone code or an existing password. Personal and merchant signup require a successful phone challenge before creating the account. OTP login is an alternative to password login, not mandatory two-factor authentication.

The selected Neon branch (`br-wispy-flower-ahvnwwju`, database `neondb`) already has the wallet, merchant/banking, and phone-verification migrations applied. Existing users and balances were preserved. New database installations should run `pnpm db:migrate` after configuring the same database URL in the app and Prisma environments.

## Local development

This workspace currently uses these settings in `apps/user-app/.env`:

```dotenv
OTP_PROVIDER=console
ALLOW_DEV_OTP=true
BANK_SANDBOX_ENABLED=true
LIVE_PAYMENTS_ENABLED=false
```

`OTP_SECRET` is generated locally and must stay private. Run `npm run dev` from the project root and open [login](http://localhost:3001/login) or [signup](http://localhost:3001/signup). When requesting a code, read the random six-digit code from the user-app terminal line labeled `EasePay DEVELOPMENT OTP`. No SMS is sent; the verification screen states this. Never share the code or terminal logs.

Restart the dev server after environment or Prisma-client changes. The console adapter only runs under `NODE_ENV=development` with the explicit flags above. It is rejected by a production build at runtime and when live payments are enabled. Console verification does not set `User.phoneVerifiedAt` or prove ownership of a real phone number.

## Real SMS through Twilio Verify

Create a Twilio Verify service with six-digit SMS codes, then configure these server-only variables in `apps/user-app/.env` or your deployment environment:

```dotenv
OTP_PROVIDER=twilio
ALLOW_DEV_OTP=false
OTP_SECRET=<separate-random-secret-of-at-least-32-bytes>
TWILIO_VERIFY_SERVICE_SID=<VA-service-SID>
TWILIO_API_KEY_SID=<API-key-SID>
TWILIO_API_KEY_SECRET=<API-key-secret>
```

Alternatively, leave both API-key variables unset and use `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`. Use a matched credential pair. Do not paste keys into chat, commit environment files, or expose them through `NEXT_PUBLIC_` variables. Ensure the provider account can deliver SMS to India and satisfies its account, destination, and sender requirements. Trial accounts may limit destinations. Restart the application after configuration.

The app accepts ten-digit Indian numbers and sends them to Twilio in `+91` format. Twilio handles delivery and verification; no SMS credentials are configured in this workspace, so actual SMS delivery has not been tested. See [Twilio Verify](https://www.twilio.com/docs/verify/api) and [verification checks](https://www.twilio.com/docs/verify/api/verification-check).

## Verification behavior

Challenges expire after ten minutes, allow at most five attempts, and require sixty seconds between sends. Send quotas are five per phone and fifteen per client per hourly bucket. Client-address limits assume a trusted reverse proxy that replaces `x-forwarded-for`; phone quotas are also enforced independently. Configure provider-side fraud controls and destination limits before public deployment.

Challenges are bound to an HttpOnly browser cookie, phone number, purpose, and provider. Successful proofs are consumed once, atomically with account creation or login. Local codes are stored as keyed hashes; codes are never returned in an HTTP response. Twilio verification stamps phone ownership, including when an existing user first logs in with a real code. Existing password login continues to work.

Expired challenges and rate-limit rows are retained; schedule database cleanup based on `expiresAt` for a long-running deployment. Unit/UI tests mock provider and database boundaries. They cover the OTP flow and protections but do not establish real SMS delivery or live concurrency behavior.
