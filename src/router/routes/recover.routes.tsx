// src/router/routes/recover.route.tsx
import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "@/router/root.routes";

export const recoverRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recover",
  component: () => <div>recover</div>,
});