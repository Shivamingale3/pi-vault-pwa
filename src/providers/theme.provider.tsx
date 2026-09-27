// src/providers/theme.provider.tsx
import { useEffect, useState, type PropsWithChildren } from "react";

import { ThemeContext } from "@/contexts/theme.context";
import {
  applyTheme,
  prefersDark,
  readThemePreference,
  writeThemePreference,
} from "@/lib/theme";
import type { ResolvedTheme, ThemePreference } from "@/types/app.types";

export function ThemeProvider({ children }: PropsWithChildren) {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    readThemePreference,
  );
  const [systemDark, setSystemDark] = useState<boolean>(prefersDark);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    applyTheme(preference);
  }, [preference, systemDark]);

  const setPreference = (next: ThemePreference) => {
    writeThemePreference(next);
    setPreferenceState(next);
  };

  const resolved: ResolvedTheme =
    preference === "system" ? (systemDark ? "dark" : "light") : preference;

  return (
    <ThemeContext value={{ preference, resolved, setPreference }}>
      {children}
    </ThemeContext>
  );
}