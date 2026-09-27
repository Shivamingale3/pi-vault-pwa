// src/router/routes/passwords.route.tsx
import { createRoute } from "@tanstack/react-router";
import { guardedRoute } from "@/router/routes/guarded.routes";

export const passwordsRoute = createRoute({
  getParentRoute: () => guardedRoute,
  path: "/passwords",
  component: () => <div>passwords</div>,
});