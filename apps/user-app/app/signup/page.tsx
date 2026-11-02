"use client";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { signupSchema } from "@/lib/validation";
import { signUp } from "@/lib/actions/signUp";
import { requestPhoneOtp, verifySignupOtp } from "@/lib/actions/phoneOtp";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  PhoneCodeForm,
  type PhoneChallenge,
} from "@/components/auth/PhoneCodeForm";
import { Icon } from "@/components/ui/Icon";
export default function SignupPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<"personal" | "merchant">(
      "personal",
    ),
    [businessName, setBusinessName] = useState(""),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [phone, setPhone] = useState(""),
    [password, setPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [challenge, setChallenge] = useState<PhoneChallenge | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const input = { accountType, businessName, name, email, phone, password };
  async function send() {
    if (lock.current) return;
    const parsed = signupSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details.");
      return;
    }
    if (accountType === "merchant" && businessName.trim().length < 2) {
      setError("Enter your business name.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await requestPhoneOtp(phone, "signup");
      if (!result.success) setError(result.message);
      else setChallenge(result);
    } catch {
      setError("Could not send a verification code. Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function complete(code: string) {
    if (lock.current || !challenge) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const checked = await verifySignupOtp(challenge.challengeId, code);
      if (!checked.success) {
        setError(checked.message);
        return;
      }
      const created = await signUp({
        ...input,
        phoneVerificationId: checked.challengeId,
      });
      if (!created.success) {
        setError(created.message);
        return;
      }
      const login = await signIn("credentials", {
        identifier: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (!login || login.error) {
        router.push("/login");
        return;
      }
      router.push(accountType === "merchant" ? "/merchant" : "/dashboard");
      router.refresh();
    } catch {
      setError(
        "Could not finish creating your account. Try again, or sign in if it was already created.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <AuthShell signup>
      {challenge ? (
        <PhoneCodeForm
          signup
          challenge={challenge}
          phone={phone}
          busy={busy}
          error={error}
          onConfirm={complete}
          onResend={send}
          onBack={() => {
            setChallenge(null);
            setError("");
          }}
        />
      ) : (
        <>
          <div className="auth-step">
            <span className="active">1</span>
            <div />
            <span>2</span>
            <p>Your details · then a quick phone check</p>
          </div>
          <p className="auth-eyebrow">A FRESH START, WITH A LITTLE MORE EASE</p>
          <h2 className="auth-heading">Let’s make it yours.</h2>
          <p className="auth-description">
            One account for your everyday. Or your next big idea.
          </p>
          <div className="auth-methods" aria-label="Account type">
            {(
              [
                { id: "personal", label: "Personal", icon: "user-round" },
                { id: "merchant", label: "Business", icon: "store" },
              ] as const
            ).map((a) => (
              <button
                type="button"
                key={a.id}
                onClick={() => setAccountType(a.id)}
                aria-pressed={accountType === a.id}
                className={accountType === a.id ? "selected" : ""}
                disabled={busy}
              >
                <Icon name={a.icon} size={16} />
                {a.label}
              </button>
            ))}
          </div>
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            {accountType === "merchant" && (
              <div>
                <label htmlFor="signup-business" className="auth-label">
                  Business name
                </label>
                <input
                  id="signup-business"
                  className="auth-input"
                  placeholder="Your business, your name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                  disabled={busy}
                />
              </div>
            )}
            <div className="auth-field-row">
              <div>
                <label htmlFor="signup-name" className="auth-label">
                  Full name
                </label>
                <input
                  id="signup-name"
                  className="auth-input"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={100}
                  required
                  disabled={busy}
                />
              </div>
              <div>
                <label htmlFor="signup-email" className="auth-label">
                  Email address
                </label>
                <input
                  id="signup-email"
                  className="auth-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  disabled={busy}
                />
              </div>
            </div>
            <div>
              <label htmlFor="signup-phone" className="auth-label">
                Phone number
              </label>
              <div className="auth-phone">
                <span>
                  IN <span className="text-[#819ab4] mx-2">|</span> +91
                </span>
                <input
                  id="signup-phone"
                  className="auth-input"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  pattern="[0-9]{10}"
                  maxLength={10}
                  required
                  disabled={busy}
                />
              </div>
              <p className="auth-help">
                We’ll verify this number with a six-digit code.
              </p>
            </div>
            <div>
              <label htmlFor="signup-password" className="auth-label">
                Create a password
              </label>
              <div className="auth-password">
                <input
                  id="signup-password"
                  className="auth-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  disabled={busy}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {password && (
                <div
                  className="auth-password-strength"
                  aria-label="Password length"
                >
                  <span
                    style={{
                      width: `${Math.min(100, (password.length / 12) * 100)}%`,
                    }}
                  />
                  <p>
                    {password.length < 8
                      ? "A little longer — use at least 8 characters."
                      : "Ready. Choose a unique password you don’t use elsewhere."}
                  </p>
                </div>
              )}
            </div>
            {error && (
              <p role="alert" className="auth-error">
                {error}
              </p>
            )}
            <button className="landing-button auth-submit" disabled={busy}>
              {busy ? "Sending code…" : "Continue to phone verification"}
              <Icon name="arrow-right" size={17} />
            </button>
            <p className="auth-help text-center">
              Your wallet starts at zero. You’re always in control of what comes
              next.
            </p>
          </form>
          <p className="auth-alternate mt-7">
            Already at home here?{" "}
            <Link href="/login">
              Sign in
              <Icon name="arrow-up-right" size={14} />
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
