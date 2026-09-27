// src/screens/states/error.tsx

import type { ErrorStateProps } from "@/interfaces/props/app.props";

export function ErrorState({ title, description, icon, action, secondary }: ErrorStateProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-gutter">
      <div className="flex size-26 animate-shake items-center justify-center rounded-[34px] bg-destructive-muted text-destructive">
        {icon}
      </div>
      <div className="text-center">
        <h1 className="text-[26px] font-extrabold tracking-title text-foreground">
          {title}
        </h1>
        <p className="mt-3 text-sm font-medium leading-[1.55] text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
      {secondary}
    </div>
  );
}