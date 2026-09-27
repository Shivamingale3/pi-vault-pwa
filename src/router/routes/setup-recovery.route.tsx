// src/router/routes/setup-recovery.route.tsx
import { setupRoute } from "@/router/routes/setup.routes";
import { createRoute } from "@tanstack/react-router";

export const setupRecoveryRoute = createRoute({
  getParentRoute: () => setupRoute,
  path: "/recovery",
  component: () => <div>setup recovery</div>,
});