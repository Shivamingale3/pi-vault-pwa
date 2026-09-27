// src/router/routes/setup-confirm.route.tsx
import { setupRoute } from "@/router/routes/setup.routes";
import { createRoute } from "@tanstack/react-router";

export const setupConfirmRoute = createRoute({
  getParentRoute: () => setupRoute,
  path: "/confirm",
  component: () => <div>setup confirm</div>,
});