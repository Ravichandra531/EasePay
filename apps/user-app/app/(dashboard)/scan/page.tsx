import { QRScanner } from "@/components/QRScanner";
export default function ScanPage() {
  return (
    <div className="py-8 wallet-enter">
      <p className="eyebrow">Point. Scan. Pay.</p>
      <h1 className="text-3xl font-bold mt-3 mb-8">
        Good things are a scan away.
      </h1>
      <QRScanner />
    </div>
  );
}
