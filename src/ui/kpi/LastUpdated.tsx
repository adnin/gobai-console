import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";

type LastUpdatedProps = {
  lastUpdated?: Date | string;
  onRefresh?: () => void;
  refreshing?: boolean;
  className?: string;
};

export function LastUpdated({ lastUpdated, onRefresh, refreshing = false, className }: LastUpdatedProps) {
  const displayTime = lastUpdated ? formatRelativeTime(lastUpdated) : "never";

  return (
    <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className || ""}`}>
      <span>Last updated {displayTime}</span>
      {onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          className="h-auto p-1 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      )}
    </div>
  );
}