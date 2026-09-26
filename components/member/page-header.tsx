import { cn } from "@/lib/utils";

export function MemberPageHeader({ eyebrow, title, description, actions, children, className }: { eyebrow?: string; title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("border-b border-line", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4 px-4 pb-4 pt-6 sm:px-6 lg:px-8">
        <div className="min-w-0">
          {eyebrow ? <div className="eyebrow mb-1.5">{eyebrow}</div> : null}
          <h1 className="text-[22px] font-medium tracking-[-0.015em] text-chrome sm:text-[26px]">{title}</h1>
          {description ? <p className="mt-1 max-w-3xl text-[13px] text-steel-400">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="px-4 sm:px-6 lg:px-8">{children}</div> : null}
    </div>
  );
}

export function MemberBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-6 px-4 py-6 sm:px-6 lg:px-8", className)} {...props} />;
}
