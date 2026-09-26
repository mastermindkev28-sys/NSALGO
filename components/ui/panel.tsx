import * as React from "react";
import { cn } from "@/lib/utils";

/** Card primitive. "Panel" in the NSALGO system: hairline border, faint top light, restrained radius. */
export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("panel", className)} {...props} />;
}

export function PanelHeader({
  title,
  eyebrow,
  description,
  actions,
  className,
  children,
}: {
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-line px-4 py-3 sm:px-5", className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="eyebrow mb-1">{eyebrow}</div> : null}
        {title ? <h2 className="truncate text-[13.5px] font-medium tracking-[-0.005em] text-steel-50">{title}</h2> : null}
        {description ? <p className="mt-0.5 text-xs text-steel-400">{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PanelBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 sm:p-5", className)} {...props} />;
}

export function PanelFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-t border-line px-4 py-2.5 text-xs text-steel-400 sm:px-5", className)} {...props} />;
}
