"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
export type PhoneChallenge = {
  challengeId: string;
  expiresAt: string;
  resendAfter: number;
  delivery: "sms" | "development";
};
export function PhoneCodeForm({
  challenge,
  phone,
  busy,
  error,
  onConfirm,
  onResend,
  onBack,
  signup = false,
}: {
  challenge: PhoneChallenge;
  phone: string;
  busy: boolean;
  error: string;
  onConfirm: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
  signup?: boolean;
}) {
  const [code, setCode] = useState(""),
    [seconds, setSeconds] = useState(challenge.resendAfter),
    [expired, setExpired] = useState(false);
  useEffect(() => {
    setCode("");
    setSeconds(challenge.resendAfter);
    setExpired(false);
    const timer = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
      setExpired(Date.now() > Date.parse(challenge.expiresAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [challenge.challengeId, challenge.resendAfter, challenge.expiresAt]);
  return (
    <>
      <div className="auth-step">
        <span>1</span>
        <div />
        <span className="active">2</span>
        <p>{signup ? "Verify your phone" : "Your sign-in code"}</p>
      </div>
      <div className="auth-icon">
        <Icon name="smartphone" size={25} />
      </div>
      <p className="auth-eyebrow">One last little step</p>
      <h2 className="auth-heading">Is that you?</h2>
      <p className="auth-description">
        {challenge.delivery === "sms"
          ? "Enter the six-digit code sent to"
          : "Verify the development code for"}
        <br />
        <strong className="text-[#192a3b] font-medium">+91 {phone}</strong>
      </p>
      {challenge.delivery === "development" && (
        <p className="auth-dev-notice">
          No SMS was sent. The development code is in the terminal running
          EasePay. Development codes cannot be used in production.
        </p>
      )}
      <form
        className="auth-form"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(code);
        }}
      >
        <label htmlFor="phone-code" className="auth-label">
          Verification code
        </label>
        <input
          id="phone-code"
          className="auth-input auth-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          pattern="[0-9]{6}"
          minLength={6}
          maxLength={6}
          required
          autoFocus
          disabled={busy || expired}
        />
        <p className="auth-help">
          {expired
            ? "This code expired. Request a new one below."
            : "Codes expire after 10 minutes. Never share yours."}
        </p>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="landing-button auth-submit"
          disabled={busy || expired || code.length !== 6}
        >
          {busy
            ? "Verifying…"
            : signup
              ? "Verify & create account"
              : "Verify & sign in"}
          <Icon name="arrow-right" size={17} />
        </button>
      </form>
      <div className="auth-resend">
        <p>Didn’t get a code?</p>
        <button type="button" disabled={busy || seconds > 0} onClick={onResend}>
          {seconds > 0 ? `Resend in ${seconds}s` : "Send a new code"}
        </button>
      </div>
      <button className="auth-back" onClick={onBack} disabled={busy}>
        <Icon name="arrow-left" size={14} />
        Change phone number
      </button>
    </>
  );
}
