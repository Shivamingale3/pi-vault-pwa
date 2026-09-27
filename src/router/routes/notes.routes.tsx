// src/router/routes/notes.route.tsx
import { guardedRoute } from "@/router/routes/guarded.routes";
import { createRoute } from "@tanstack/react-router";

export const notesRoute = createRoute({
  getParentRoute: () => guardedRoute,
  path: "/notes",
  component: () => <div>notes</div>,
});