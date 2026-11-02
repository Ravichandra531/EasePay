import { qrMatrix, qrPath } from "@/lib/qr";
export function PaymentQR({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  return (
    <svg
      role="img"
      aria-label="Scan to pay this merchant with EasePay"
      viewBox="0 0 45 45"
      className={className}
      shapeRendering="crispEdges"
    >
      <rect width="45" height="45" fill="white" />
      <path d={qrPath(qrMatrix(value))} fill="#101e2d" />
    </svg>
  );
}
