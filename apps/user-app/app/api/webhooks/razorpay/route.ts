import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { settleDeposit } from "@repo/db/wallet";
import { paymentMode, razorpay, validSignature } from "@/lib/banking";
import { reconcilePayout } from "@/lib/payouts";
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret)
    return NextResponse.json(
      { message: "Webhook is not configured" },
      { status: 503 },
    );
  const raw = await request.text();
  if (
    raw.length > 1_000_000 ||
    !validSignature(
      raw,
      request.headers.get("x-razorpay-signature") ?? "",
      secret,
    )
  )
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  try {
    const event = JSON.parse(raw) as {
      event?: string;
      payload?: {
        payment?: { entity?: { id?: string } };
        payout?: { entity?: { id?: string } };
      };
    };
    if (event.event === "payment.captured" || event.event === "order.paid") {
      const id = event.payload?.payment?.entity?.id;
      if (!id || !/^pay_[A-Za-z0-9]+$/.test(id))
        return NextResponse.json(
          { message: "Invalid payment event" },
          { status: 400 },
        );
      const payment = await razorpay<{
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
      }>(`payments/${id}`);
      const deposit = await prisma.onRampTransaction.findUnique({
        where: { providerOrderId: payment.order_id },
      });
      if (!deposit) return NextResponse.json({ received: true });
      if (
        deposit.mode !== paymentMode() ||
        payment.currency !== "INR" ||
        payment.status !== "captured" ||
        payment.amount !== deposit.amount
      )
        return NextResponse.json(
          { message: "Payment mismatch" },
          { status: 400 },
        );
      await prisma.onRampTransaction.update({
        where: { id: deposit.id },
        data: { providerPaymentId: payment.id },
      });
      await settleDeposit(deposit.token, "Success", {
        amount: payment.amount,
        mode: paymentMode(),
      });
    } else if (event.event?.startsWith("payout.")) {
      const id = event.payload?.payout?.entity?.id;
      if (!id || !/^pout_[A-Za-z0-9]+$/.test(id))
        return NextResponse.json(
          { message: "Invalid payout event" },
          { status: 400 },
        );
      await reconcilePayout(id);
    }
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { message: "Event could not be processed. Retry delivery." },
      { status: 500 },
    );
  }
}
