"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { requestEmailOtp } from "@/lib/actions/emailOtp";
import { updateProfile } from "@/lib/actions/updateProfile";

export function ProfileClient({
  user,
}: {
  user: {
    id: number;
    name: string | null;
    email: string | null;
    number: string;
  };
}) {
  const [name, setName] = useState(user.name ?? ""),
    [email, setEmail] = useState(user.email ?? ""),
    [password, setPassword] = useState(""),
    [emailCode, setEmailCode] = useState(""),
    [sentTo, setSentTo] = useState(""),
    [resendAt, setResendAt] = useState(0),
    [loading, setLoading] = useState(false),
    [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
      null,
    );
  const router = useRouter(),
    { update } = useSession();
  const emailChanged = email.trim().toLowerCase() !== user.email?.toLowerCase();
  async function sendCode() {
    if (loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const result = await requestEmailOtp(email);
      if (result.success) {
        setSentTo(email.trim().toLowerCase());
        setEmailCode("");
        setResendAt(Date.now() + result.resendAfter * 1000);
        setMessage({
          ok: true,
          text: "Verification code sent. Check your new email address.",
        });
      } else setMessage({ ok: false, text: result.message });
    } catch {
      setMessage({
        ok: false,
        text: "Could not send a code. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const result = await updateProfile(name, email, password, emailCode);
      setMessage({ ok: result.success, text: result.message });
      if (result.success) {
        setPassword("");
        setEmailCode("");
        setSentTo("");
        await update();
        router.refresh();
      }
    } catch {
      setMessage({
        ok: false,
        text: "Could not save changes. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }
  const initials = (user.name || user.number)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6">
      <form onSubmit={save} className="wallet-card p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-4 mb-7">
          <span className="w-16 h-16 grid place-items-center rounded-2xl bg-blue-300 text-blue-950 text-xl font-bold">
            {initials}
          </span>
          <div>
            <h2 className="font-semibold">{user.name || "Your account"}</h2>
            <p className="text-xs text-neutral-500 mt-2">
              Personal wallet · INR
            </p>
          </div>
        </div>
        <div>
          <label htmlFor="profile-name" className="wallet-label">
            Full name
          </label>
          <input
            id="profile-name"
            className="wallet-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={100}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="profile-email" className="wallet-label">
            Email address
          </label>
          <input
            id="profile-email"
            className="wallet-input"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailCode("");
              setSentTo("");
            }}
            autoComplete="email"
            required
            disabled={loading}
          />
        </div>
        {emailChanged && (
          <div className="space-y-3">
            <p className="text-xs text-neutral-500">
              Verify your new email address before saving it.
            </p>
            <button
              type="button"
              className="primary-button"
              disabled={loading}
              onClick={() => {
                if (Date.now() < resendAt) {
                  setMessage({
                    ok: false,
                    text: "Please wait 60 seconds before requesting another code.",
                  });
                } else void sendCode();
              }}
            >
              {sentTo ? "Resend email code" : "Send email code"}
            </button>
            {sentTo === email.trim().toLowerCase() && (
              <>
                <label htmlFor="profile-email-code" className="wallet-label">
                  Email verification code
                </label>
                <input
                  id="profile-email-code"
                  className="wallet-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={emailCode}
                  onChange={(e) =>
                    setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  disabled={loading}
                />
              </>
            )}
          </div>
        )}
        <div>
          <label htmlFor="profile-phone" className="wallet-label">
            Phone number
          </label>
          <input
            id="profile-phone"
            className="wallet-input opacity-50"
            value={user.number}
            readOnly
          />
          <p className="text-xs text-neutral-500 mt-2">
            Your phone number is your wallet identity and cannot be edited.
          </p>
        </div>
        <div className="border-t border-white/10 pt-5">
          <label htmlFor="profile-password" className="wallet-label">
            Confirm your current password
          </label>
          <input
            id="profile-password"
            className="wallet-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Required to save account changes"
            required
            disabled={loading}
          />
        </div>
        {message && (
          <p
            role={message.ok ? "status" : "alert"}
            className={`text-sm rounded-xl p-4 ${message.ok ? "text-blue-300 bg-blue-400/10" : "text-red-300 bg-red-400/10"}`}
          >
            {message.text}
          </p>
        )}
        <button
          type="submit"
          className="primary-button w-full"
          disabled={loading}
        >
          {loading ? "Saving changes…" : "Save changes"}
        </button>
      </form>
      <aside className="wallet-card p-6 h-fit">
        <p className="eyebrow">Account details</p>
        <dl className="mt-6 space-y-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-500">Wallet ID</dt>
            <dd>EP-{String(user.id).padStart(6, "0")}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Currency</dt>
            <dd>Indian rupee (INR)</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Status</dt>
            <dd className="text-blue-300">● Active</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
