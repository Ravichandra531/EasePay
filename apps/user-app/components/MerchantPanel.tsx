"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveMerchant, readNotifications } from "@/lib/actions/merchant";
import { PaymentQR } from "./ui/PaymentQR";
import { Icon } from "./ui/Icon";
import { qrSvg } from "@/lib/qr";
export function MerchantPanel({
  merchant,
  baseUrl,
  notifications,
}: {
  merchant: {
    name: string | null;
    slug: string;
    description: string;
    category: string;
  } | null;
  baseUrl: string;
  notifications: { id: string; message: string; read: boolean }[];
}) {
  const [name, setName] = useState(merchant?.name ?? ""),
    [description, setDescription] = useState(merchant?.description ?? ""),
    [category, setCategory] = useState(merchant?.category ?? "Other"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  const url = merchant ? `${baseUrl}/pay/${merchant.slug}` : "";
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await saveMerchant({
        name,
        description,
        category: category as "Other",
      });
      setMessage(result.message);
      if (result.success) router.refresh();
    } catch {
      setMessage("Could not save your business. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  function download() {
    const objectUrl = URL.createObjectURL(
      new Blob([qrSvg(url)], { type: "image/svg+xml" }),
    );
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = "easepay-merchant-qr.svg";
    a.click();
    URL.revokeObjectURL(objectUrl);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Payment link copied");
    } catch {
      setMessage("Copy unavailable. Select the payment link to copy it.");
    }
  }
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="wallet-card p-6 sm:p-8">
        {merchant ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <Icon name="qr-code" className="text-blue-300" />
              <h2 className="font-semibold">Your counter just went digital.</h2>
            </div>
            <div className="bg-[#e7eef4] rounded-2xl p-6 text-[#16293d] text-center">
              <p className="text-lg font-bold">{merchant.name}</p>
              <p className="text-xs mt-1 opacity-60">
                Scan. Pay. Get on with your day.
              </p>
              <PaymentQR
                value={url}
                className="w-56 max-w-full rounded-xl mx-auto my-5"
              />
              <div className="inline-flex items-center gap-2 font-bold">
                <Icon name="wallet" size={17} />
                EasePay
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-5">
              <button className="primary-button" onClick={download}>
                <Icon name="download" size={16} />
                Download QR
              </button>
              <button className="secondary-button" onClick={copy}>
                <Icon name="copy" size={16} />
                Copy payment link
              </button>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs break-all text-blue-300 mt-5 hover:underline"
            >
              {url}
            </a>
            <p className="text-xs text-neutral-500 leading-6 mt-3">
              Customers can scan with their phone camera, use EasePay’s scanner,
              or open the link. A shared QR needs an app address accessible from
              their device.
            </p>
          </>
        ) : (
          <div className="py-8 text-center">
            <Icon
              name="store"
              size={48}
              className="text-blue-300 mx-auto mb-5"
            />
            <h2 className="text-2xl font-semibold">Meet EasePay Business.</h2>
            <p className="text-sm text-neutral-500 leading-7 mt-4">
              One payment QR. A clear view of every receipt. Start by telling
              customers a little about your business.
            </p>
          </div>
        )}
      </div>
      <div className="space-y-6">
        <form onSubmit={save} className="wallet-card p-6 space-y-5">
          <h2 className="font-semibold">Business details</h2>
          <div>
            <label htmlFor="business-name" className="wallet-label">
              Business name
            </label>
            <input
              id="business-name"
              className="wallet-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={100}
              required
            />
          </div>
          <div>
            <label htmlFor="business-category" className="wallet-label">
              Category
            </label>
            <select
              id="business-category"
              className="wallet-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {["Food & Drink", "Retail", "Services", "Other"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="business-description" className="wallet-label">
              Short description
            </label>
            <textarea
              id="business-description"
              className="wallet-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              rows={3}
            />
          </div>
          <button className="primary-button w-full" disabled={busy}>
            {busy
              ? "Saving…"
              : merchant
                ? "Save business details"
                : "Create merchant account"}
          </button>
        </form>
        {notifications.length > 0 && (
          <div className="wallet-card p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold flex gap-2 items-center">
                <Icon name="bell" size={17} />
                Payment notifications
              </h2>
              <button
                onClick={async () => {
                  await readNotifications();
                  router.refresh();
                }}
                className="text-xs text-blue-300"
              >
                Mark read
              </button>
            </div>
            {notifications.map((n) => (
              <p
                key={n.id}
                className={`border-b last:border-0 border-white/5 py-3 text-sm ${n.read ? "text-neutral-500" : "text-blue-200"}`}
              >
                {n.message}
              </p>
            ))}
          </div>
        )}
        <p role="status" className="text-sm text-blue-300">
          {message}
        </p>
      </div>
    </div>
  );
}
