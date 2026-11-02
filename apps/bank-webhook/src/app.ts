import express from "express";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { settleDeposit, WalletError } from "@repo/db/wallet";

export const app = express();
app.use(express.json({ limit: "16kb" }));
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
const positiveInteger = z
  .union([z.string().regex(/^\d+$/).transform(Number), z.number()])
  .pipe(z.number().int().positive().max(2_147_483_647));
const schema = z.object({
  token: z.string().min(1).max(200),
  user_identifier: positiveInteger.optional(),
  amount: positiveInteger.optional(),
  status: z.enum(["Success", "Failure"]).default("Success"),
});
app.post(["/hdfcWebhook", "/bankWebhook"], async (req, res) => {
  const secret = process.env.WEBHOOK_SECRET,
    incoming = req.get("x-webhook-secret");
  if (!secret) {
    res.status(503).json({ message: "Webhook secret is not configured" });
    return;
  }
  if (
    !incoming ||
    Buffer.byteLength(incoming) !== Buffer.byteLength(secret) ||
    !timingSafeEqual(Buffer.from(incoming), Buffer.from(secret))
  ) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid callback payload" });
    return;
  }
  try {
    const result = await settleDeposit(parsed.data.token, parsed.data.status, {
      userId: parsed.data.user_identifier,
      mode: "sandbox",
      amount: parsed.data.amount,
    });
    res.json({
      message: result.alreadyProcessed ? "Already processed" : "Captured",
      status: result.status,
    });
  } catch (error) {
    if (!(error instanceof WalletError))
      console.error("Bank callback failed", error);
    res.status(error instanceof WalletError ? error.status : 500).json({
      message:
        error instanceof WalletError
          ? error.message
          : "Callback could not be processed",
    });
  }
});
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    res.status(error instanceof SyntaxError ? 400 : 500).json({
      message:
        error instanceof SyntaxError
          ? "Invalid JSON payload"
          : "Request failed",
    });
  },
);
