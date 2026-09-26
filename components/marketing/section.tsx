import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-[1400px] px-4 sm:px-6", className)} {...props} />;
}

export function Section({ className, children, id }: { className?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className={cn("py-16 sm:py-24", className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  hrefLabel,
  className,
  align = "left",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  href?: string;
  hrefLabel?: string;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 sm:mb-10 md:flex-row md:items-end md:justify-between", align === "center" && "items-center text-center md:flex-col md:items-center", className)}>
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow ? <div className="eyebrow mb-3">{eyebrow}</div> : null}
        <h2 className="text-[26px] font-medium uppercase leading-[1.08] tracking-[-0.02em] text-chrome sm:text-[34px]">{title}</h2>
        {description ? <p className="mt-3 text-[15px] leading-relaxed text-steel-400">{description}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="group inline-flex shrink-0 items-center gap-1.5 text-[13px] text-steel-300 transition-colors hover:text-chrome">
          {hrefLabel ?? "View all"} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}

export function PageHero({ eyebrow, title, description, children, className }: { eyebrow?: string; title: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden border-b border-line", className)}>
      <div className="hairline-grid pointer-events-none absolute inset-0 fade-mask-b opacity-60" aria-hidden />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[900px] -translate-x-1/2 rounded-full bg-polar-500/[0.07] blur-3xl" aria-hidden />
      <Container className="relative py-12 sm:py-16">
        {eyebrow ? <div className="eyebrow mb-3">{eyebrow}</div> : null}
        <h1 className="max-w-4xl text-[32px] font-medium uppercase leading-[1.03] tracking-[-0.025em] text-chrome sm:text-[48px]">{title}</h1>
        {description ? <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-steel-400">{description}</p> : null}
        {children}
      </Container>
    </div>
  );
}
