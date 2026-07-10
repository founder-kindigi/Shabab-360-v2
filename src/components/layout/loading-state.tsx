import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Loader2 className="size-8 animate-spin text-emerald-600" />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}