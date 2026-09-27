import type {
  ResolvedTheme,
  ThemePreference,
  TrustStatus,
} from "@/types/app.types";
import type { ReactNode } from "react";

export interface FatalProps {
  title?: string;
  description?: string;
}

export interface ErrorBoundaryState {
  crashed: boolean;
}

export interface ErrorStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  secondary?: ReactNode;
}

export interface EmptyProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  secondary?: ReactNode;
}

export interface LoadingProps {
  message?: string;
}

export interface TrustContextValue {
  status: TrustStatus;
  vaultKey: CryptoKey | null;
  unlock: (pin: string) => Promise<void>;
  lock: () => void;
}

export interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}
