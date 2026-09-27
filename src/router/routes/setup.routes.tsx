// src/router/routes/setup.route.tsx
import { createRoute, Outlet } from "@tanstack/react-router";

import { rootRoute } from "@/router/root.route";

export const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/setup",
  component: () => <Outlet />,
});