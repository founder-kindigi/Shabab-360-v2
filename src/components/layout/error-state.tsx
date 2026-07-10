import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Something went wrong. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full border-destructive/30">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="size-6 text-destructive" />
          </div>
          <div>
            <p className="font-medium text-destructive">Error</p>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
          {onRetry && (
            <Button variant="outline" onClick={onRetry} className="gap-2">
              <RefreshCw className="size-4" />
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}