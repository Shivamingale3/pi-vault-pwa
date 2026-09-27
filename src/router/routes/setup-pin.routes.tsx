// src/router/routes/setup-pin.route.tsx
import { setupRoute } from "@/router/routes/setup.routes";
import { createRoute } from "@tanstack/react-router";
export const setupPinRoute = createRoute({
  getParentRoute: () => setupRoute,
  path: "/pin",
  component: () => <div>setup pin</div>,
});