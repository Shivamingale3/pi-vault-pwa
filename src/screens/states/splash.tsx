// src/screens/states/splash.tsx
export function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3.5 bg-background">
      <div className="flex size-11.5 items-center justify-center rounded-2xl bg-primary text-[21px] font-extrabold text-primary-foreground">
        π
      </div>
      <span className="font-mono text-[9.5px] font-bold tracking-label text-subtle-foreground">
        PIVAULT
      </span>
    </div>
  );
}