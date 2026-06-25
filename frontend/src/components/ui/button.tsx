import { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition",
        variant === "primary" && "bg-primary text-white hover:bg-violet-500",
        variant === "secondary" && "bg-white/10 text-white hover:bg-white/15",
        variant === "ghost" && "text-slate-300 hover:bg-white/10 hover:text-white",
        className,
      )}
      {...props}
    />
  );
}
