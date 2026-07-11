import { cn } from "@/lib/utils";

const lineWidths = [100, 85, 70, 92, 60, 80, 75];

interface ShimmerSkeletonProps {
  className?: string;
  /** Number of skeleton lines (default 3) */
  lines?: number;
  /** If true, renders a card-like wrapper with rounded corners and padding */
  card?: boolean;
}

function ShimmerLine({ width }: { width: number }) {
  return (
    <div
      className="h-3.5 rounded-md bg-gradient-to-r from-transparent via-[#F3ECF6] to-transparent dark:via-[#1F086040] [background-size:200%_100%] animate-[shimmer_1.8s_ease-in-out_infinite]"
      style={{ width: `${width}%` }}
    />
  );
}

export function ShimmerSkeleton({
  className,
  lines = 3,
  card = false,
}: ShimmerSkeletonProps) {
  const linesArr = Array.from({ length: lines }, (_, i) => lineWidths[i % lineWidths.length]);

  return (
    <div
      className={cn(
        "space-y-3",
        card && "rounded-lg border border-border bg-card p-4",
        className
      )}
      aria-hidden="true"
    >
      {linesArr.map((width, i) => (
        <ShimmerLine key={i} width={width} />
      ))}
    </div>
  );
}

/** Compact card skeleton with a header bar + content lines */
export function ShimmerCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 space-y-4",
        className
      )}
      aria-hidden="true"
    >
      {/* Card header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-gradient-to-r from-transparent via-[#F3ECF6] to-transparent dark:via-[#1F086040] [background-size:200%_100%] animate-[shimmer_1.8s_ease-in-out_infinite]" />
        <div className="flex-1 space-y-2">
          <ShimmerLine width={50} />
          <ShimmerLine width={30} />
        </div>
      </div>
      {/* Card body */}
      <div className="space-y-2.5">
        <ShimmerLine width={100} />
        <ShimmerLine width={85} />
        <ShimmerLine width={70} />
      </div>
    </div>
  );
}