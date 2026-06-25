import { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn("rounded-lg border border-white/10 bg-surface/90 shadow-soft", className)}
      {...props}
    />
  );
}
