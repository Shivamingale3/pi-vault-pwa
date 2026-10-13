// src/router/routes/public.route.tsx
import { createRoute, Outlet, redirect } from "@tanstack/react-router";

import { rootRoute } from "@/router/root.routes";

export const publicRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "public",
  beforeLoad: ({ context }) => {
    if (context.trust.status === "unlocked") {
      throw redirect({ to: "/" });
    }
  },
  component: () => <Outlet />,
});