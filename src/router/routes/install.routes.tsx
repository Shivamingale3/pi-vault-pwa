import { createRoute } from "@tanstack/react-router";

import { rootRoute } from "@/router/root.route";

export const installRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/install",
  component: () => <div>install</div>,
});