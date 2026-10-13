import { createRoute, Outlet, redirect } from "@tanstack/react-router";

import { rootRoute } from "@/router/root.routes";

export const guardedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "guarded",
  beforeLoad: ({ context }) => {
    switch (context.trust.status) {
      case "needs-login":
        throw redirect({ to: "/login" });
      case "needs-setup":
        throw redirect({ to: "/setup/pin" });
      case "locked":
        throw redirect({ to: "/unlock" });
    }
  },
  component: () => <Outlet />,
});