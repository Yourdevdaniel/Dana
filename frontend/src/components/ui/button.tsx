import { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-all duration-200 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60",
        variant === "primary" && "bg-primary text-white shadow-[0_10px_30px_rgba(124,58,237,0.25)] hover:-translate-y-0.5 hover:bg-violet-500 hover:shadow-[0_14px_36px_rgba(124,58,237,0.34)]",
        variant === "secondary" && "bg-white/10 text-white hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-[0_12px_28px_rgba(15,23,42,0.26)]",
        variant === "ghost" && "text-slate-300 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white",
        className,
      )}
      {...props}
    />
  );
}
