// src/router/routes/home.route.tsx
import { createRoute } from "@tanstack/react-router";

import { guardedRoute } from "@/router/routes/guarded.routes";

export const homeRoute = createRoute({
  getParentRoute: () => guardedRoute,
  path: "/",
  component: () => <div>home</div>,
});