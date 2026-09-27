// src/providers/router.provider.tsx
import { RouterProvider } from "@tanstack/react-router";
import { useEffect } from "react";

import { useTrust } from "@/hooks/useTrust";
import { router } from "@/router";

export function AppRouterProvider() {
  const { status } = useTrust();

  useEffect(() => {
    void router.invalidate();
  }, [status]);

  return <RouterProvider router={router} context={{ trust: { status } }} />;
}