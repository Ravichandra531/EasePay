# EasePay banking setup

The application has three modes: local demo (`sandbox`), Razorpay test, and Razorpay live. Demo/test funds cannot be withdrawn through the live payout adapter. Existing wallet balances are classified as demo funds by the migration.

## Local demo

Keep `PAYMENT_PROVIDER=sandbox` and `BANK_SANDBOX_ENABLED=true` in `apps/user-app/.env`. The bank account encryption key has already been generated in this workspace. Do not replace it after linking bank accounts.

Apply the migrations to your reachable PostgreSQL database:

```sh
npm run db:migrate
npm run dev
```

Open http://localhost:3001. Register a personal account or select Business account during signup. An existing user can open Business to create a merchant profile.

Merchant flow: Business → create profile → download QR or copy link → a second user opens `/pay/<merchant-code>` → enters amount → reviews → confirms. Receipts and a merchant notification are written with the transfer.

Withdrawals: Withdraw → link an account with your EasePay password → choose amount → review → confirm. Demo withdrawals reserve funds until you complete or cancel them using the history controls. They never contact a real bank.

QRs contain an EasePay payment URL, not a UPI address. Ordinary phone cameras can open them. In-app camera/image scanning uses the browser's BarcodeDetector API where available, with a manual payment-link fallback. Camera access requires HTTPS or localhost. A phone cannot reach another computer's localhost; use an app address reachable by the device and configure `APP_URL` accordingly. The local QR encoder supports payment URLs up to 106 UTF-8 bytes and includes Reed-Solomon error correction.

## Razorpay test integration

Set these variables locally. Do not paste keys into chat, commit `.env`, or put secret keys in `NEXT_PUBLIC_` variables.

```dotenv
PAYMENT_PROVIDER=razorpay
BANK_SANDBOX_ENABLED=false
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAYX_KEY_ID=rzp_test_...
RAZORPAYX_KEY_SECRET=...
RAZORPAYX_ACCOUNT_NUMBER=...
RAZORPAY_WEBHOOK_SECRET=...
LIVE_PAYMENTS_ENABLED=false
```

Checkout creates server-side INR orders. The success handler verifies the signature against the stored order ID, fetches the payment from Razorpay, and credits only a captured payment whose order, currency, and amount match. A verified server webhook handles payment completion if the browser is closed.

Payouts create a contact and a bank fund account, then send an IMPS payout with the withdrawal UUID as `X-Payout-Idempotency`. Funds remain reserved on network/provider uncertainty. Use Refresh bank status for a known payout, or supply your password and choose Retry submission safely to resubmit the same immutable request. Confirmed failed or reversed payouts restore funds once.

Configure the following public webhook endpoint in your provider dashboards:

```
https://your-app-domain/api/webhooks/razorpay
```

Subscribe to `payment.captured` (and/or `order.paid`) plus relevant payout lifecycle events, including `payout.processed`, `payout.failed`, and `payout.reversed`. Configure the same webhook secret in both dashboards if using the shared endpoint. The receiver verifies HMAC against the raw body and fetches authoritative provider status before changing the ledger. Unrelated payments are ignored. Demo bank webhook routes on port 3003 cannot settle provider-backed deposits.

RazorpayX requires its own account/product access and payout IP allowlisting. A publicly reachable webhook address is required. Localhost is not a provider webhook destination.

## Live integration

Live banking cannot be activated or verified without approved provider accounts and credentials. This workspace intentionally remains in demo mode.

After testing the application and provider integration, configure matching `rzp_live_` Checkout and RazorpayX credentials, the live funding account, `BANK_SANDBOX_ENABLED=false`, and `LIVE_PAYMENTS_ENABLED=true`. Existing demo/test funds remain ineligible for real payouts. Only captured live deposits and transfers of those funds increase `Balance.realAmount`.

Provider approval is also required for your intended wallet/payment use case. Implementing these API calls does not itself make EasePay a regulated bank or authorize stored-value services. Merchant Google OAuth, automatic scheduled settlement, chargeback/refund accounting, KYC onboarding, and provider reconciliation jobs are not included. Personal and merchant signup require Supabase email verification. Phone numbers remain wallet identifiers but are not verified by the email OTP flow. See [AUTH.md](AUTH.md).

## Storage and recovery

Bank account numbers use AES-256-GCM with randomized nonces; only masked digits appear in pages and history. Keep `BANK_ACCOUNT_ENCRYPTION_KEY` backed up securely. Losing or rotating the key without re-encrypting existing records prevents payout processing for those records.

Withdrawal state is persistent. A retry uses the same bank fund account, amount, currency, payout mode, reference, and idempotency key. Never manually release reserved funds for an uncertain provider response: first reconcile its authoritative status.

## Verification limits

Unit tests cover fund separation, reservation and replay handling, cancellation/reversal, input validation, authenticated encryption, signatures, request construction, and checkout review behavior. They mock the database/provider boundaries. Actual database transactions and Razorpay test/live calls still require verification with a reachable database and configured test keys.

## Provider documentation

- [Checkout integration and signatures](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/)
- [Bank-account payouts and idempotency](https://razorpay.com/docs/api/x/payouts/create/bank-account/)
- [Webhook signature validation](https://razorpay.com/docs/webhooks/validate-test/)
- [Fetch payment status](https://razorpay.com/docs/api/payments/fetch-with-id/)
