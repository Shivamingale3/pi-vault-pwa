// src/router/routes/guarded.route.tsx
import { createRoute, Outlet } from "@tanstack/react-router";

import { rootRoute } from "@/router/root.route";

export const guardedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "guarded",
  component: () => <Outlet />,
});