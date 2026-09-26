import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { CompassField } from "@/components/brand/compass-field";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-void">
      <CompassField className="pointer-events-none absolute left-1/2 top-1/2 h-[1300px] w-[1300px] -translate-x-1/2 -translate-y-1/2 opacity-60" />
      <header className="relative flex h-16 items-center justify-between px-6">
        <Link href="/" aria-label="NSALGO home">
          <Logo />
        </Link>
        <Link href="/" className="text-[12.5px] text-steel-400 hover:text-chrome">
          Back to site
        </Link>
      </header>
      <main id="main" className="relative flex flex-1 items-center justify-center px-4 py-10">
        {children}
      </main>
      <footer className="relative px-6 py-6 text-center text-[11px] text-steel-500">
        Informational and educational use only. Not investment advice. ·{" "}
        <Link href="/terms" className="hover:text-steel-300">Terms</Link> · <Link href="/privacy" className="hover:text-steel-300">Privacy</Link>
      </footer>
    </div>
  );
}
