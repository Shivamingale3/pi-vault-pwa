// src/contexts/theme.context.ts
import { createContext } from "react";

import type { ThemePreference, ResolvedTheme } from "@/types/app.types";

export interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
