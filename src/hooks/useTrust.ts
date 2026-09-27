// src/hooks/useTrust.ts
import { useContext } from "react";

import { TrustContext } from "@/contexts/trust.context";
import type { TrustContextValue } from "@/interfaces/props/app.props";

export function useTrust(): TrustContextValue {
  const context = useContext(TrustContext);

  if (!context) {
    throw new Error("useTrust must be used inside TrustProvider");
  }

  return context;
}
