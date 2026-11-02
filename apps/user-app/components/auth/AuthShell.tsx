import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
export function AuthShell({
  children,
  signup = false,
}: {
  children: React.ReactNode;
  signup?: boolean;
}) {
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Link href="/" className="landing-logo">
          <span className="landing-logomark">
            <Icon name="arrow-up-right" size={25} />
          </span>
          easepay.
        </Link>
        <div className="auth-story-copy">
          <span className="landing-pill">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5b7b9c]" />
            Your everyday, with a little more ease.
          </span>
          <h1>
            {signup ? (
              <>
                Good things
                <br />
                start with
                <br />
                <span>you.</span>
              </>
            ) : (
              <>
                Welcome back
                <br />
                to a little
                <br />
                <span>more ease.</span>
              </>
            )}
          </h1>
          <p>
            {signup
              ? "A wallet for the little moments. A home for your next business chapter. Let’s make it yours."
              : "Your people. Your payments. Your next good idea. Pick up right where you left off."}
          </p>
          <div className="auth-illustration" aria-hidden="true">
            <div className="auth-illustration-card">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm flex items-center gap-2">
                  <Icon name="wallet" size={20} />
                  easepay.
                </span>
                <span className="text-[9px] opacity-40">
                  YOUR EVERYDAY WALLET
                </span>
              </div>
              <div className="mt-9 flex gap-3">
                {(["arrow-up-right", "scan-line", "landmark"] as const).map(
                  (name) => (
                    <span
                      key={name}
                      className="w-12 h-12 grid place-items-center bg-[#75b2ef] text-[#192a3b] rounded-full"
                    >
                      <Icon name={name} size={20} />
                    </span>
                  ),
                )}
              </div>
              <p className="text-xs mt-7 opacity-50">
                Made for life. Ready for business.
              </p>
            </div>
            <div className="auth-verification-badge">
              <span>
                <Icon name="shield-check" size={22} />
              </span>
              <div>
                <p className="text-[11px] font-semibold">
                  A little peace of mind.
                </p>
                <p className="text-[10px] mt-1 text-[#6180a0]">
                  Your email. Your verification code.
                </p>
              </div>
            </div>
          </div>
        </div>
        <p className="auth-story-footer">LESS FRICTION. MORE POSSIBILITY.</p>
      </section>
      <section className="auth-form-area">
        <div className="auth-topline">
          <Link href="/" className="flex items-center gap-2">
            <Icon name="arrow-left" size={14} />
            Back to home
          </Link>
          <span className="flex items-center gap-1.5">
            <Icon name="lock-keyhole" size={12} />
            Your space, protected.
          </span>
        </div>
        <div className="auth-form-content">{children}</div>
        <p className="auth-bottomline">
          EasePay is a wallet application, not a bank. Demo payments use
          simulated funds.
        </p>
      </section>
    </main>
  );
}
