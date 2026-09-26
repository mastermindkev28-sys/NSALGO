"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { Checkbox as RCheckbox, Dialog as RDialog, DropdownMenu as RMenu, Switch as RSwitch, Tabs as RTabs, Tooltip as RTooltip } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

/* ── Inputs ─────────────────────────────────────────────────────────────── */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-line-strong bg-graphite-950 px-3 text-sm text-steel-50 placeholder:text-steel-500 transition-colors",
        "hover:border-white/20 focus:border-polar-500/70 focus:outline-none focus:ring-2 focus:ring-polar-500/20 disabled:opacity-50",
        "aria-[invalid=true]:border-down/60",
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-md border border-line-strong bg-graphite-950 px-3 py-2.5 text-sm leading-relaxed text-steel-50 placeholder:text-steel-500",
        "hover:border-white/20 focus:border-polar-500/70 focus:outline-none focus:ring-2 focus:ring-polar-500/20",
        className,
      )}
      {...props}
    />
  );
});

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select
        className="h-10 w-full appearance-none rounded-md border border-line-strong bg-graphite-950 pl-3 pr-8 text-sm text-steel-50 hover:border-white/20 focus:border-polar-500/70 focus:outline-none focus:ring-2 focus:ring-polar-500/20"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-steel-400" />
    </div>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-[12px] font-medium text-steel-300", className)} {...props} />;
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 text-[12px] text-down" role="alert">
      {children}
    </p>
  );
}

export function Switch({ className, ...props }: React.ComponentProps<typeof RSwitch.Root>) {
  return (
    <RSwitch.Root
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-line-strong bg-graphite-700 transition-colors data-[state=checked]:border-polar-500/60 data-[state=checked]:bg-polar-600",
        className,
      )}
      {...props}
    >
      <RSwitch.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-steel-100 shadow transition-transform data-[state=checked]:translate-x-[18px]" />
    </RSwitch.Root>
  );
}

export function Checkbox({ className, ...props }: React.ComponentProps<typeof RCheckbox.Root>) {
  return (
    <RCheckbox.Root
      className={cn("flex size-4 shrink-0 items-center justify-center rounded-xs border border-line-strong bg-graphite-950 data-[state=checked]:border-polar-500 data-[state=checked]:bg-polar-600", className)}
      {...props}
    >
      <RCheckbox.Indicator>
        <Check className="size-3 text-white" />
      </RCheckbox.Indicator>
    </RCheckbox.Root>
  );
}

/* ── Tabs ───────────────────────────────────────────────────────────────── */
export const Tabs = RTabs.Root;
export function TabsList({ className, ...props }: React.ComponentProps<typeof RTabs.List>) {
  return <RTabs.List className={cn("flex items-center gap-0.5 border-b border-line", className)} {...props} />;
}
export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof RTabs.Trigger>) {
  return (
    <RTabs.Trigger
      className={cn(
        "relative -mb-px h-9 border-b border-transparent px-3 text-[12.5px] font-medium text-steel-400 transition-colors hover:text-steel-100",
        "data-[state=active]:border-chrome data-[state=active]:text-chrome",
        className,
      )}
      {...props}
    />
  );
}
export const TabsContent = RTabs.Content;

/* ── Segmented control (compact toggle group) ───────────────────────────── */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "sm",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
  size?: "xs" | "sm";
}) {
  return (
    <div role="radiogroup" className={cn("inline-flex items-center rounded-md border border-line bg-graphite-950 p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-sm font-medium transition-colors",
            size === "xs" ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-[12px]",
            value === o.value ? "bg-graphite-700 text-chrome shadow-[0_1px_0_0_#ffffff10_inset]" : "text-steel-400 hover:text-steel-100",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Tooltip ────────────────────────────────────────────────────────────── */
export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <RTooltip.Provider delayDuration={200}>{children}</RTooltip.Provider>;
}
export function Tooltip({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <RTooltip.Root>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content side={side} sideOffset={6} className="z-50 max-w-xs animate-fade-in rounded-sm border border-line-strong bg-graphite-800 px-2.5 py-1.5 text-[12px] leading-snug text-steel-100 shadow-[var(--shadow-float)]">
          {content}
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}

/* ── Modal & Drawer ─────────────────────────────────────────────────────── */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  className,
}: {
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  trigger?: React.ReactNode;
  className?: string;
}) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <RDialog.Trigger asChild>{trigger}</RDialog.Trigger> : null}
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-black/70 backdrop-blur-[2px]" />
        <RDialog.Content
          className={cn("panel fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 animate-fade-up p-0 shadow-[var(--shadow-float)] focus:outline-none", className)}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <RDialog.Title className="text-[15px] font-medium text-chrome">{title}</RDialog.Title>
              {description ? <RDialog.Description className="mt-1 text-[13px] text-steel-400">{description}</RDialog.Description> : null}
            </div>
            <RDialog.Close className="rounded-sm p-1 text-steel-400 hover:bg-white/5 hover:text-chrome" aria-label="Close">
              <X className="size-4" />
            </RDialog.Close>
          </div>
          <div className="p-5">{children}</div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export function Drawer({
  open,
  onOpenChange,
  title,
  children,
  side = "right",
  className,
  headerExtra,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: React.ReactNode;
  children: React.ReactNode;
  side?: "right" | "left" | "bottom";
  className?: string;
  headerExtra?: React.ReactNode;
}) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-black/60" />
        <RDialog.Content
          className={cn(
            "fixed z-50 flex flex-col border-line-strong bg-graphite-900 shadow-[var(--shadow-float)] focus:outline-none",
            side === "right" && "inset-y-0 right-0 w-full max-w-[720px] animate-fade-in border-l",
            side === "left" && "inset-y-0 left-0 w-[86vw] max-w-xs animate-fade-in border-r",
            side === "bottom" && "inset-x-0 bottom-0 max-h-[88dvh] animate-fade-up rounded-t-lg border-t",
            className,
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
            <RDialog.Title className="min-w-0 truncate text-sm font-medium text-chrome">{title}</RDialog.Title>
            <div className="flex items-center gap-2">
              {headerExtra}
              <RDialog.Close className="rounded-sm p-1 text-steel-400 hover:bg-white/5 hover:text-chrome" aria-label="Close">
                <X className="size-4" />
              </RDialog.Close>
            </div>
          </div>
          <RDialog.Description className="sr-only">Details panel</RDialog.Description>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

/* ── Dropdown ───────────────────────────────────────────────────────────── */
export const Dropdown = RMenu.Root;
export const DropdownTrigger = RMenu.Trigger;
export function DropdownContent({ className, ...props }: React.ComponentProps<typeof RMenu.Content>) {
  return (
    <RMenu.Portal>
      <RMenu.Content sideOffset={6} align="end" className={cn("z-50 min-w-44 animate-fade-in rounded-md border border-line-strong bg-graphite-850 p-1 shadow-[var(--shadow-float)]", className)} {...props} />
    </RMenu.Portal>
  );
}
export function DropdownItem({ className, ...props }: React.ComponentProps<typeof RMenu.Item>) {
  return (
    <RMenu.Item
      className={cn("flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-2 text-[13px] text-steel-200 outline-none data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-chrome [&_svg]:size-3.5", className)}
      {...props}
    />
  );
}
export function DropdownLabel({ className, ...props }: React.ComponentProps<typeof RMenu.Label>) {
  return <RMenu.Label className={cn("px-2.5 py-1.5 text-[11px] text-steel-500", className)} {...props} />;
}
export function DropdownSeparator() {
  return <RMenu.Separator className="my-1 h-px bg-line" />;
}
