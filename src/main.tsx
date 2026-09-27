import { createRoot } from "react-dom/client";

import "./index.css";
import { ThemeProvider } from "@/providers/theme.provider";
import { PwaGate } from "@/providers/pwa-gate";
import { ErrorBoundary } from "@/providers/error-boundry";
import { TrustProvider } from "@/providers/trust.provider";
import { AppRouterProvider } from "@/providers/router.provider";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <ThemeProvider>
      <PwaGate>
        <TrustProvider>
          <AppRouterProvider />
        </TrustProvider>
      </PwaGate>
    </ThemeProvider>
  </ErrorBoundary>,
);
