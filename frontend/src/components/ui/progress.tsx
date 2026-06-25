type ProgressProps = {
  value: number;
  className?: string;
};

export function Progress({ value, className }: ProgressProps) {
  return (
    <div className={["h-2 w-full overflow-hidden rounded-full bg-white/10", className].filter(Boolean).join(" ")}>
      <div className="h-full rounded-full bg-secondary" style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}
