import { createRoute } from "@tanstack/react-router";

import { rootRoute } from "@/router/root.routes";

export const installRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/install",
  component: () => <div>install</div>,
});