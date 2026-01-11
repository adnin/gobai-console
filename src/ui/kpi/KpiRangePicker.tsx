import { cn } from "@/lib/utils";

export type KpiRangeValue = "today" | "7d" | "30d" | (string & {});

export type KpiRangePickerOption = {
  label: string;
  value: KpiRangeValue;
};

type KpiRangePickerProps = {
  value: KpiRangeValue;
  onValueChange: (value: KpiRangeValue) => void;
  options?: KpiRangePickerOption[];
  disabled?: boolean;
  className?: string;
};

const DEFAULT_OPTIONS: KpiRangePickerOption[] = [
  { label: "Today", value: "today" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
];

export function KpiRangePicker({
  value,
  onValueChange,
  options = DEFAULT_OPTIONS,
  disabled = false,
  className,
}: KpiRangePickerProps) {
  return (
    <div
      className={cn("inline-flex items-center gap-1 rounded-full border border-border bg-background p-1", className)}
      role="radiogroup"
      aria-label="Select KPI range"
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => !disabled && !isActive && onValueChange(opt.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              isActive ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground",
              disabled && "opacity-50"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
