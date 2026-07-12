import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Loader2 className="size-8 animate-spin text-[#4B0A8F] dark:text-[#8A40B0]" />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}