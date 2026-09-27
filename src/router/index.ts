// src/router/index.ts
import { createRouter } from "@tanstack/react-router";
import routeTree from "@/router/router.tree";

export const router = createRouter({
  routeTree,
  context: {
    trust: { status: "checking" },
  },
  defaultPreload: false,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
