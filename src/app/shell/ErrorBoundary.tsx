import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return <DefaultErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, resetError }: { error?: Error; resetError: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-lg">
        <div className="mb-4 flex justify-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          An unexpected error occurred. Please try refreshing the page.
        </p>
        {process.env.NODE_ENV === "development" && error && (
          <details className="mb-4 text-left">
            <summary className="cursor-pointer text-sm font-medium">Error details</summary>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
        <div className="flex gap-2">
          <Button onClick={resetError} variant="outline" className="flex-1">
            Try again
          </Button>
          <Button onClick={() => window.location.reload()} className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh page
          </Button>
        </div>
      </div>
    </div>
  );
}