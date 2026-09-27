// src/hooks/useTheme.ts
import { useContext } from "react";

import { ThemeContext } from "@/contexts/theme.context";
import type { ThemeContextValue } from "@/interfaces/props/app.props";

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
