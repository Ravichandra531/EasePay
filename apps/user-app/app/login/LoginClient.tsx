"use client";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { safeCallback } from "@/lib/format";
import { requestEmailOtp } from "@/lib/actions/emailOtp";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  EmailCodeForm,
  type EmailChallenge,
} from "@/components/auth/EmailCodeForm";
import { Icon } from "@/components/ui/Icon";
export function LoginClient() {
  const router = useRouter(),
    params = useSearchParams(),
    callback = safeCallback(params.get("callbackUrl"));
  const [method, setMethod] = useState<"otp" | "password">("otp"),
    [email, setEmail] = useState(""),
    [identifier, setIdentifier] = useState(""),
    [password, setPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [challenge, setChallenge] = useState<EmailChallenge | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  async function send() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await requestEmailOtp(email);
      if (!result.success) setError(result.message);
      else setChallenge(result);
    } catch {
      setError("Could not request a code. Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function login(code?: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result =
        code && challenge
          ? await signIn("email-otp", {
              email,
              code,
              redirect: false,
              callbackUrl: callback,
            })
          : await signIn("credentials", {
              identifier,
              password,
              redirect: false,
              callbackUrl: callback,
            });
      if (!result || result.error) {
        setError(
          code
            ? "We couldn’t sign you in. Check the code, or create an account if you’re new here."
            : "Email, phone, or password is incorrect. Please try again.",
        );
        return;
      }
      router.push(callback);
      router.refresh();
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <AuthShell>
      {challenge ? (
        <EmailCodeForm
          challenge={challenge}
          email={email}
          busy={busy}
          error={error}
          onConfirm={login}
          onResend={send}
          onBack={() => {
            setChallenge(null);
            setError("");
          }}
        />
      ) : (
        <>
          <p className="auth-eyebrow">YOUR WALLET, RIGHT WHERE YOU LEFT IT</p>
          <h2 className="auth-heading">Hello again.</h2>
          <p className="auth-description">
            A quick sign-in, then back to the good stuff.
          </p>
          <div className="auth-methods" aria-label="Sign-in method">
            {(
              [
                { id: "otp", label: "Email code", icon: "mail" },
                { id: "password", label: "Password", icon: "lock-keyhole" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMethod(m.id);
                  setError("");
                }}
                aria-pressed={method === m.id}
                className={method === m.id ? "selected" : ""}
                disabled={busy}
              >
                <Icon name={m.icon} size={15} />
                {m.label}
              </button>
            ))}
          </div>
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (method === "otp") void send();
              else void login();
            }}
          >
            {method === "otp" ? (
              <div>
                <label htmlFor="login-email" className="auth-label">
                  Email address
                </label>
                <input
                  id="login-email"
                  className="auth-input"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={254}
                  required
                  disabled={busy}
                />
                <p className="auth-help">
                  We’ll email a one-time code to the address linked to your
                  wallet.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="login-identifier" className="auth-label">
                    Email or phone number
                  </label>
                  <input
                    id="login-identifier"
                    className="auth-input"
                    placeholder="you@example.com or 9876543210"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    required
                    disabled={busy}
                  />
                </div>
                <div>
                  <label htmlFor="login-password" className="auth-label">
                    Password
                  </label>
                  <div className="auth-password">
                    <input
                      id="login-password"
                      className="auth-input"
                      type={showPassword ? "text" : "password"}
                      placeholder="Your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      disabled={busy}
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </>
            )}
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="landing-button auth-submit"
              disabled={busy}
            >
              {busy
                ? method === "otp"
                  ? "Sending code…"
                  : "Signing in…"
                : method === "otp"
                  ? "Send verification code"
                  : "Sign in"}
              <Icon name="arrow-right" size={17} />
            </button>
          </form>
          <div className="auth-divider">
            <span />a little new here?
            <span />
          </div>
          <p className="auth-alternate">
            Make yourself at home.{" "}
            <Link href="/signup">
              Create an account
              <Icon name="arrow-up-right" size={14} />
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
