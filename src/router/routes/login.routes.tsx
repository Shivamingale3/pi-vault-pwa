// src/router/routes/login.route.tsx
import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "@/router/root.route";

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: () => <div>login</div>,
});