import type * as React from "react";

import { cn } from "@/lib/utils";

interface StatProps extends Omit<React.ComponentProps<"dl">, "title"> {
  description?: React.ReactNode;
  title: React.ReactNode;
  value: React.ReactNode;
}

const Stat = ({ className, description, title, value, ...props }: StatProps) => (
  <dl
    className={cn(
      "flex flex-col rounded-3xl border border-border bg-card p-4 text-center",
      className,
    )}
    data-slot="stat"
    {...props}
  >
    <dd className="text-2xl font-semibold tracking-tight" data-slot="stat-value">
      {value}
    </dd>
    <dt className="truncate text-sm font-medium" data-slot="stat-title">
      {title}
    </dt>
    {description ? (
      <div className="text-sm text-muted-foreground" data-slot="stat-description">
        {description}
      </div>
    ) : null}
  </dl>
);

export { Stat };
export type { StatProps };
