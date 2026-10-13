import type { RouterContext } from "@/types/router.types";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";


export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});