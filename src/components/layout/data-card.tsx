import { type LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DataCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
}

export function DataCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  className,
}: DataCardProps) {
  return (
    <Card className={cn("border-l-4 border-l-emerald-500", className)}>
      <CardContent className="flex items-center gap-4 pt-0">
        <div className="rounded-lg bg-emerald-50 p-2.5 dark:bg-emerald-950/50">
          <Icon className="size-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground truncate">
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight mt-1">{value}</p>
        </div>
        {trend && trendValue && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              trend === "up" &&
                "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
              trend === "down" &&
                "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400",
              trend === "neutral" && "bg-muted text-muted-foreground"
            )}
          >
            {trend === "up" && <TrendingUp className="size-3" />}
            {trend === "down" && <TrendingDown className="size-3" />}
            {trend === "neutral" && <Minus className="size-3" />}
            {trendValue}
          </div>
        )}
      </CardContent>
    </Card>
  );
}