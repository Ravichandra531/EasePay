import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LandingNav } from "@/components/LandingNav";
import { LandingExperience } from "@/components/LandingExperience";
import { Icon, type IconName } from "@/components/ui/Icon";

export default async function Home() {
  const session = await getServerSession(authOptions);
  return (
    <div className="landing">
      <LandingNav signedIn={!!session?.user} />
      <main>
        <section className="landing-container landing-hero">
          <div className="hero-copy">
            <div className="landing-pill">
              <span className="w-1.5 h-1.5 bg-[#496581] rounded-full" />
              Your people. Your payments.
            </div>
            <h1>
              Pay friends.
              <br />
              Live more.
              <br />
              <span className="hero-word">With EasePay.</span>
            </h1>
            <p className="landing-copy max-w-[410px] mt-7">
              From your morning coffee to your next big idea. Send, pay, and get
              paid with a wallet that feels refreshingly simple.
            </p>
            <div className="flex flex-wrap items-center gap-5 mt-9">
              <Link
                href={session?.user ? "/dashboard" : "/signup"}
                className="landing-button"
              >
                {session?.user ? "Open your wallet" : "Get started"}
                <Icon name="arrow-up-right" size={17} />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-[13px] font-semibold"
              >
                See how it works
                <Icon name="chevron-right" size={15} />
              </a>
            </div>
            <div className="mt-9 flex items-center gap-2 text-[11px] text-[#5e7d9d]">
              <Icon name="shield-check" size={15} />
              Review before you pay. Track every move.
            </div>
          </div>
          <div className="landing-hero-art">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="hero-art-label">
              <span className="text-[#6a88a6]">01 /</span> YOUR EVERYDAY,
              UPGRADED
            </div>
            <div className="floating-capsule">
              <span className="w-8 h-8 bg-[#e4ecf4] rounded-full grid place-items-center">
                <Icon name="zap" size={15} />
              </span>
              <div>
                <span className="text-[10px] text-[#5a7896]">
                  Less waiting. More living.
                </span>
                <p className="text-xs font-semibold">
                  Payments, in your rhythm.
                </p>
              </div>
            </div>
            <div className="wallet-preview">
              <div className="flex justify-between items-center">
                <span className="font-semibold flex gap-2 items-center">
                  <Icon name="wallet" size={20} />
                  easepay.
                </span>
                <span className="text-[9px] uppercase tracking-widest opacity-40">
                  Wallet preview
                </span>
              </div>
              <div className="mt-9">
                <p className="text-[11px] opacity-50">
                  A little room for everything.
                </p>
                <p className="text-[42px] font-medium tracking-tight mt-2">
                  ₹12,450<span className="text-2xl opacity-40">.00</span>
                </p>
              </div>
              <div className="flex gap-4 mt-7">
                {[
                  {
                    icon: "arrow-up-right",
                    label: "Send",
                    href: "/transfer?tab=send",
                  },
                  { icon: "scan-line", label: "Scan", href: "/scan" },
                  { icon: "plus", label: "Add", href: "/transfer?tab=add" },
                ].map((a) => (
                  <Link
                    key={a.label}
                    href={a.href}
                    className="flex-1 text-center group"
                  >
                    <span className="mx-auto w-11 h-11 rounded-full bg-[#75b2ef] text-[#192a3b] grid place-items-center group-hover:bg-white transition-colors">
                      <Icon name={a.icon as IconName} size={19} />
                    </span>
                    <span className="text-[10px] opacity-60 block mt-2">
                      {a.label}
                    </span>
                  </Link>
                ))}
              </div>
              <div className="border-t border-white/10 mt-7 pt-4 flex justify-between text-[9px] opacity-40 tracking-widest">
                <span>PERSONAL WALLET</span>
                <span>INR · ₹</span>
              </div>
            </div>
            <div className="merchant-preview">
              <span className="h-10 w-10 grid place-items-center rounded-xl bg-[#dfe8f0]">
                <Icon name="coffee" size={20} />
              </span>
              <div className="flex-1">
                <p className="text-[10px] text-[#6987a5]">
                  Another good day at the café.
                </p>
                <p className="text-xs font-semibold mt-1">Payment received</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">+ ₹450</p>
                <span className="text-[9px] text-[#5f7e9e] flex items-center gap-1 mt-1">
                  <Icon name="circle-check" size={10} />
                  Complete
                </span>
              </div>
            </div>
            <div className="art-sticker">
              <Icon name="qr-code" size={27} />
            </div>
            <p className="art-footnote">ILLUSTRATIVE BALANCE & ACTIVITY</p>
          </div>
        </section>
        <section className="landing-container">
          <div className="landing-proof-row">
            {[
              {
                icon: "arrow-left-right",
                title: "Everyday payments",
                desc: "A number. A scan. A simple send.",
              },
              {
                icon: "store",
                title: "Business, made personal",
                desc: "Less payment admin. More possibility.",
              },
              {
                icon: "landmark",
                title: "A way back to your bank",
                desc: "Clear status, from wallet to withdrawal.",
              },
            ].map((p) => (
              <div key={p.title} className="flex gap-4 items-start">
                <span className="text-[#516b86] mt-1">
                  <Icon name={p.icon as IconName} size={22} />
                </span>
                <div>
                  <h3 className="text-[13px] font-semibold">{p.title}</h3>
                  <p className="text-xs text-[#6a87a5] mt-2 leading-5">
                    {p.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section id="personal" className="landing-container landing-section">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-5 mb-10">
            <div>
              <p className="landing-eyebrow">
                Money fits into life. Not the other way around.
              </p>
              <h2 className="landing-heading mt-5">
                One wallet.
                <br />
                All your little moments.
              </h2>
            </div>
            <p className="landing-copy max-w-xs">
              The everyday essentials, brought together with a little more
              thought.
            </p>
          </div>
          <div className="landing-feature-grid">
            <Link
              href="/transfer?tab=send"
              className="landing-feature bg-[#e6ecf2]"
            >
              <div className="feature-icon">
                <Icon name="arrow-up-right" size={25} />
              </div>
              <h3>
                Send a little
                <br />
                something.
              </h3>
              <p>
                Find a friend by name or number. Review. Send. Make their day.
              </p>
              <div className="mini-avatars">
                <span>AS</span>
                <span>RK</span>
                <span>JM</span>
                <span className="!bg-[#192a3b] !text-white">
                  <Icon name="plus" size={17} />
                </span>
              </div>
              <span className="feature-arrow">
                <Icon name="arrow-up-right" size={20} />
              </span>
            </Link>
            <Link href="/scan" className="landing-feature bg-[#f2eee5]">
              <div className="feature-icon">
                <Icon name="scan-line" size={25} />
              </div>
              <h3>
                Good things.
                <br />
                One scan away.
              </h3>
              <p>
                The coffee run. The corner store. Open a merchant QR and pay.
              </p>
              <div className="mini-qr">
                <Icon name="qr-code" size={54} />
                <span className="scan-line" />
              </div>
              <span className="feature-arrow">
                <Icon name="arrow-up-right" size={20} />
              </span>
            </Link>
            <Link href="/withdraw" className="landing-feature bg-[#e9eef3]">
              <div className="feature-icon">
                <Icon name="landmark" size={25} />
              </div>
              <h3>
                Back to
                <br />
                your bank.
              </h3>
              <p>
                Link your account, review your withdrawal, and follow its
                progress.
              </p>
              <div className="mini-bank">
                <Icon name="wallet" size={24} />
                <span className="border-t border-dashed border-[#839cb5] w-12" />
                <Icon name="arrow-right" size={15} />
                <Icon name="landmark" size={24} />
              </div>
              <span className="feature-arrow">
                <Icon name="arrow-up-right" size={20} />
              </span>
            </Link>
          </div>
        </section>
        <section id="business" className="landing-business">
          <div className="landing-container grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <p className="landing-eyebrow !text-[#8aa1b9]">
                EasePay for business
              </p>
              <h2 className="landing-heading mt-6 !text-[#e6eef5]">
                You make the good stuff.
                <br />
                <span className="text-[#75b2ef]">We make paying easy.</span>
              </h2>
              <p className="text-sm leading-7 text-[#92a7bd] mt-7 max-w-md">
                Your neighbourhood shop or your next venture. Give customers one
                QR, see every receipt, and keep your earnings moving.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  "A payment QR that’s yours to share",
                  "Every customer payment, in one place",
                  "Bank withdrawals with a clear trail",
                ].map((t) => (
                  <p
                    key={t}
                    className="text-xs flex items-center gap-3 text-[#b7c6d4]"
                  >
                    <Icon
                      name="circle-check"
                      size={17}
                      className="text-[#75b2ef]"
                    />
                    {t}
                  </p>
                ))}
              </div>
              <Link
                href="/merchant"
                className="landing-button !bg-[#75b2ef] !text-[#16293d] mt-9"
              >
                Let’s talk business
                <Icon name="arrow-up-right" size={17} />
              </Link>
            </div>
            <div className="business-visual">
              <div className="business-paper">
                <div className="flex justify-between text-[10px] text-[#6886a5]">
                  <span>EASEPAY BUSINESS</span>
                  <Icon name="store" size={17} />
                </div>
                <h3 className="text-xl font-bold mt-7">The Daily Grind</h3>
                <p className="text-[10px] text-[#6886a5] mt-1">
                  Good coffee. Even better company.
                </p>
                <div className="business-qr">
                  <Icon name="qr-code" size={105} />
                </div>
                <p className="text-xs font-semibold">
                  A simple scan for the little things.
                </p>
                <p className="text-[9px] text-[#6886a5] mt-3">
                  Product illustration · Your QR is generated in Business
                </p>
              </div>
              <div className="business-receipt">
                <span className="w-9 h-9 grid place-items-center rounded-full bg-[#75b2ef]">
                  <Icon name="check" size={18} />
                </span>
                <div>
                  <p className="text-[10px] text-[#6886a5]">
                    From another happy customer
                  </p>
                  <p className="text-sm font-semibold mt-1">₹280.00 received</p>
                </div>
                <Icon name="bell" size={17} />
              </div>
            </div>
          </div>
        </section>
        <section
          id="how-it-works"
          className="landing-container landing-section"
        >
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <LandingExperience />
            <div className="landing-steps">
              {[
                {
                  n: "01",
                  icon: "user-round",
                  title: "Find your kind of wallet.",
                  text: "Create a personal account or set up your business. Your phone number is your wallet identity.",
                },
                {
                  n: "02",
                  icon: "wallet",
                  title: "Give it a little fuel.",
                  text: "Top up your wallet through the payment flow. See the status every step of the way.",
                },
                {
                  n: "03",
                  icon: "sparkles",
                  title: "Get on with the good stuff.",
                  text: "Send to a friend, scan to pay, collect a payment, or withdraw to your bank.",
                },
              ].map((s) => (
                <div key={s.n} className="landing-step">
                  <span className="text-xs text-[#738fab] font-mono">
                    {s.n}
                  </span>
                  <span className="step-icon">
                    <Icon name={s.icon as IconName} size={20} />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{s.title}</h3>
                    <p className="text-xs leading-6 text-[#5d7c9b] mt-2">
                      {s.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="security" className="landing-container pb-24">
          <div className="landing-security">
            <div className="flex items-center gap-4">
              <span className="security-shield">
                <Icon name="shield-check" size={40} />
              </span>
              <div>
                <p className="landing-eyebrow">A little peace of mind</p>
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-3">
                  Thoughtful on the inside, too.
                </h2>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-8 mt-10">
              {[
                {
                  icon: "lock-keyhole",
                  title: "Your details stay yours.",
                  text: "Hashed passwords and encrypted bank account numbers.",
                },
                {
                  icon: "circle-check",
                  title: "Review. Then confirm.",
                  text: "See the recipient, bank, and amount before you commit.",
                },
                {
                  icon: "receipt",
                  title: "Every move has a story.",
                  text: "Payment references, receipts, and clear status tracking.",
                },
              ].map((s) => (
                <div key={s.title}>
                  <Icon
                    name={s.icon as IconName}
                    size={20}
                    className="text-[#516b86]"
                  />
                  <h3 className="text-[13px] font-semibold mt-4">{s.title}</h3>
                  <p className="text-xs text-[#5d7c9b] leading-6 mt-2">
                    {s.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="faq" className="landing-container pb-24">
          <div className="grid md:grid-cols-[.8fr_1.2fr] gap-12">
            <div>
              <p className="landing-eyebrow">The little questions</p>
              <h2 className="landing-heading mt-5">Glad you asked.</h2>
            </div>
            <div>
              {[
                {
                  q: "Can I use EasePay for my business?",
                  a: "Yes. Create a business account at signup, or open Business from your existing wallet. You can share a payment QR, collect wallet payments, and see your receipts.",
                },
                {
                  q: "How do QR payments work?",
                  a: "Open the merchant’s payment link, scan their QR with EasePay, or use your phone camera. Sign in, enter an amount, and review before confirming.",
                },
                {
                  q: "Can I move money to my bank?",
                  a: "Link a bank account in Withdraw, choose an amount, and confirm with your EasePay password. Demo withdrawals are simulated. Provider-backed payouts depend on the app’s banking configuration.",
                },
                {
                  q: "Does the demo move real money?",
                  a: "No. Demo balances and payments use simulated funds. Provider test mode also uses test funds. Live banking requires a configured, approved provider account; demo funds cannot be paid out to a real bank.",
                },
              ].map((f) => (
                <details key={f.q} className="landing-faq">
                  <summary>
                    {f.q}
                    <Icon name="plus" size={17} />
                  </summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section className="landing-final">
          <div className="landing-container text-center">
            <span className="inline-flex bg-[#75b2ef] rounded-2xl p-4">
              <Icon name="arrow-up-right" size={30} />
            </span>
            <h2 className="landing-heading mt-8">
              Make room for
              <br />a little more ease.
            </h2>
            <p className="landing-copy mt-5">
              Your everyday wallet. Your next business chapter.
            </p>
            <Link href="/signup" className="landing-button mt-8">
              Get started with EasePay
              <Icon name="arrow-up-right" size={17} />
            </Link>
            <p className="text-[10px] text-[#738fab] mt-5">
              Personal or business. Start with what feels like you.
            </p>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="landing-container footer-grid">
          <div>
            <Link href="/" className="landing-logo">
              <span className="landing-logomark">
                <Icon name="wallet" size={22} />
              </span>
              easepay.
            </Link>
            <p className="footer-intro">
              For the coffee runs, the shared plans, and the businesses you
              love. Bring your everyday payments together.
            </p>
            <a
              href="https://x.com/1Ravichandra5"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social"
            >
              Follow Ravichandra on X <Icon name="arrow-up-right" size={16} />
            </a>
          </div>
          <nav aria-label="Footer personal">
            <h3>For you</h3>
            <Link href="/dashboard">Your wallet</Link>
            <Link href="/transfer?tab=send">Send money</Link>
            <Link href="/scan">Scan & pay</Link>
            <Link href="/withdraw">Withdraw to bank</Link>
          </nav>
          <nav aria-label="Footer business">
            <h3>For business</h3>
            <Link href="/signup">Create an account</Link>
            <Link href="/merchant">Merchant dashboard</Link>
            <a href="#business">Accept payments</a>
            <Link href="/transactions">Payment activity</Link>
          </nav>
          <nav aria-label="Footer help">
            <h3>Explore</h3>
            <a href="#how-it-works">How it works</a>
            <a href="#security">Security</a>
            <a href="#faq">Common questions</a>
            <Link href="/login">Log in</Link>
          </nav>
        </div>
        <div className="landing-container footer-bottom">
          <p>© {new Date().getFullYear()} EasePay. Built by Ravichandra.</p>
          <p>
            EasePay is a wallet application. Demo and test payments use
            simulated funds. Live payments require provider setup and approval.
          </p>
        </div>
      </footer>
    </div>
  );
}
