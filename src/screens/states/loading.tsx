import type { LoadingProps } from "@/interfaces/props/app.props";

// src/screens/states/loading.tsx
export function Loading({ message }: LoadingProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background">
      <svg viewBox="0 0 104 104" className="size-26 animate-[spin_1.15s_linear_infinite]">
        <circle cx="52" cy="52" r="46" fill="none" stroke="var(--border)" strokeWidth="5" />
        <path
          d="M52 6a46 46 0 0140.6 24.3"
          fill="none"
          stroke="var(--foreground)"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
      {message && (
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      )}
    </div>
  );
}