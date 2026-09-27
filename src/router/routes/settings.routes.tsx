// src/router/routes/settings.route.tsx
import { guardedRoute } from "@/router/routes/guarded.routes";
import { createRoute } from "@tanstack/react-router";

export const settingsRoute = createRoute({
  getParentRoute: () => guardedRoute,
  path: "/settings",
  component: () => <div>settings</div>,
});