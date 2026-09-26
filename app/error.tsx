"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="eyebrow">Unexpected error</div>
      <h1 className="text-[24px] font-medium text-chrome">Something went wrong loading this view.</h1>
      <p className="max-w-md text-[13.5px] text-steel-400">Other parts of NSALGO are unaffected. Try again, or return to the dashboard.{error.digest ? ` Reference: ${error.digest}` : ""}</p>
      <div className="flex gap-3">
        <Button variant="primary" onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
