import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div>
        <div className="num text-[64px] font-medium tracking-[-0.04em] text-chrome">404</div>
        <p className="mt-2 text-[15px] text-steel-400">This page doesn&apos;t exist — or the symbol isn&apos;t covered.</p>
      </div>
      <div className="flex gap-3">
        <Button asChild variant="primary">
          <Link href="/">Home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/markets">Markets</Link>
        </Button>
      </div>
    </div>
  );
}
