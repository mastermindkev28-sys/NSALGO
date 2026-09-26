import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background,color,border-color,box-shadow,opacity] duration-150 disabled:pointer-events-none disabled:opacity-45 select-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Chrome: brushed-silver primary action.
        primary:
          "text-obsidian bg-[linear-gradient(180deg,#f6f8fb_0%,#dfe4eb_55%,#c3cad4_100%)] shadow-[0_1px_0_0_#ffffff_inset,0_0_0_1px_#ffffff30,0_8px_24px_-12px_#e9edf380] hover:bg-[linear-gradient(180deg,#ffffff_0%,#e9edf3_55%,#ced4dd_100%)] active:translate-y-px",
        secondary: "text-steel-50 bg-graphite-800 border border-line-strong hover:bg-graphite-750 hover:border-white/20",
        outline: "text-steel-100 border border-line-strong bg-transparent hover:bg-white/[0.04] hover:text-chrome",
        ghost: "text-steel-200 hover:text-chrome hover:bg-white/[0.05]",
        accent: "text-white bg-polar-600 hover:bg-polar-500 shadow-[0_1px_0_0_#ffffff30_inset]",
        danger: "text-white bg-down/90 hover:bg-down",
        link: "text-polar-400 hover:text-polar-300 underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-sm",
        sm: "h-8 px-3 text-[13px] rounded-sm",
        md: "h-10 px-4 text-sm rounded-md",
        lg: "h-12 px-6 text-[13px] tracking-[0.14em] uppercase rounded-md",
        icon: "size-9 rounded-md",
        "icon-sm": "size-7 rounded-sm",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
