"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./ui/Icon";
type Detector = {
  detect: (
    source: HTMLVideoElement | ImageBitmap,
  ) => Promise<{ rawValue: string }[]>;
};
type DetectorConstructor = new (options: { formats: string[] }) => Detector;
export function QRScanner() {
  const router = useRouter(),
    video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    frame = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState(false),
    [message, setMessage] = useState(""),
    [link, setLink] = useState("");
  function stop() {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (frame.current) clearTimeout(frame.current);
  }
  useEffect(() => () => stop(), []);
  function open(value: string) {
    try {
      const code = /^[a-z0-9-]{8,60}$/.test(value.trim())
        ? `/pay/${value.trim()}`
        : value.trim();
      const url = new URL(code, window.location.origin);
      if (
        url.origin !== window.location.origin ||
        !/^\/pay\/[a-z0-9-]{8,60}$/.test(url.pathname)
      )
        throw new Error();
      stop();
      setActive(false);
      router.push(url.pathname);
    } catch {
      setMessage("That is not an EasePay merchant link for this app.");
    }
  }
  function detector() {
    const Constructor = (
      window as unknown as { BarcodeDetector?: DetectorConstructor }
    ).BarcodeDetector;
    if (!Constructor)
      throw new Error(
        "This browser does not support built-in QR scanning. Open the link with your phone camera or paste the payment link below.",
      );
    return new Constructor({ formats: ["qr_code"] });
  }
  async function scan() {
    try {
      setMessage("");
      const reader = detector();
      stop();
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setActive(true);
      if (video.current) {
        video.current.srcObject = stream.current;
        await video.current.play();
      }
      const tick = async () => {
        if (!stream.current || !video.current) return;
        try {
          const codes = await reader.detect(video.current);
          if (codes[0]) {
            open(codes[0].rawValue);
            if (!stream.current) return;
          }
        } catch {
          /* A frame may arrive before the video is ready; try the next one. */
        }
        if (stream.current) frame.current = setTimeout(tick, 300);
      };
      void tick();
    } catch (error) {
      stop();
      setActive(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Camera unavailable. Use a payment link instead.",
      );
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    try {
      const reader = detector(),
        bitmap = await createImageBitmap(file);
      try {
        const codes = await reader.detect(bitmap);
        if (!codes[0])
          throw new Error(
            "No QR found. Try a clearer image or paste the link.",
          );
        open(codes[0].rawValue);
      } finally {
        bitmap.close();
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not read this image.",
      );
    }
  }
  return (
    <div className="wallet-card p-6 sm:p-8 max-w-xl mx-auto">
      <div className="relative aspect-square max-h-80 bg-[#090c10] rounded-3xl overflow-hidden border border-blue-300/10 flex items-center justify-center">
        <video
          ref={video}
          playsInline
          muted
          className={`w-full h-full object-cover ${active ? "block" : "hidden"}`}
        />
        {!active && (
          <div className="text-center text-blue-300/50">
            <Icon name="scan-line" size={80} className="mx-auto" />
            <p className="text-xs mt-5">One scan. One simple payment.</p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-10 border border-blue-300/40 rounded-xl" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mt-6">
        <button
          className="primary-button"
          onClick={
            active
              ? () => {
                  stop();
                  setActive(false);
                }
              : scan
          }
        >
          <Icon name="camera" size={17} />
          {active ? "Stop camera" : "Scan with camera"}
        </button>
        <label className="secondary-button cursor-pointer">
          <Icon name="image" size={17} />
          Upload QR image
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </label>
      </div>
      <p role="status" className="text-sm text-neutral-400 mt-5 leading-7">
        {message}
      </p>
      <form
        className="border-t border-white/10 mt-6 pt-6"
        onSubmit={(e) => {
          e.preventDefault();
          open(link);
        }}
      >
        <label htmlFor="payment-link" className="wallet-label">
          Or enter a merchant code or payment link
        </label>
        <input
          id="payment-link"
          className="wallet-input"
          placeholder="Paste an EasePay payment link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          required
        />
        <button className="secondary-button w-full mt-3" type="submit">
          Open payment <Icon name="arrow-right" size={16} />
        </button>
      </form>
    </div>
  );
}
