// src/contexts/trust.context.ts
import { createContext } from "react";

import type { TrustContextValue } from "@/interfaces/props/app.props";

export const TrustContext = createContext<TrustContextValue | null>(null);
