import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 whitespace-nowrap font-mono uppercase tracking-[0.08em] leading-none", {
  variants: {
    variant: {
      neutral: "text-steel-200 bg-white/[0.05] border border-line",
      outline: "text-steel-300 border border-line-strong",
      up: "text-up bg-up-soft border border-up/25",
      down: "text-down bg-down-soft border border-down/25",
      warn: "text-warn bg-warn-soft border border-warn/25",
      accent: "text-polar-300 bg-polar-500/12 border border-polar-500/30",
      solid: "text-obsidian bg-steel-100",
      mock: "text-warn bg-warn-soft border border-dashed border-warn/40",
    },
    size: {
      sm: "text-[9.5px] px-1.5 py-[3px] rounded-xs",
      md: "text-[10.5px] px-2 py-1 rounded-sm",
    },
  },
  defaultVariants: { variant: "neutral", size: "md" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}
