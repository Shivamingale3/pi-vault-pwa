// src/contexts/theme.context.ts
import { createContext } from "react";

import type { ThemeContextValue } from "@/interfaces/props/app.props";

export const ThemeContext = createContext<ThemeContextValue | null>(null);
