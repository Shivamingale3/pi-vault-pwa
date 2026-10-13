// src/router/routes/unlock.route.tsx
import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "@/router/root.routes";

export const unlockRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/unlock",
  component: () => <div>unlock</div>,
});