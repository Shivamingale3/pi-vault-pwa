// src/router/route-tree.ts

import { loginRoute } from "@/router/routes/login.routes";
import { unlockRoute } from "@/router/routes/unlock.routes";

import { setupRoute } from "@/router/routes/setup.routes";
import { setupPinRoute } from "@/router/routes/setup-pin.routes";
import { setupConfirmRoute } from "@/router/routes/setup-confirm.routes";

import { guardedRoute } from "@/router/routes/guarded.routes";
import { homeRoute } from "@/router/routes/home.routes";
import { passwordsRoute } from "@/router/routes/passwords.routes";
import { rootRoute } from "@/router/root.routes";
import { setupRecoveryRoute } from "@/router/routes/setup-recovery.route";
import { recoverRoute } from "@/router/routes/recover.routes";
import { notesRoute } from "@/router/routes/notes.routes";
import { settingsRoute } from "@/router/routes/settings.routes";
import { publicRoute } from "@/router/routes/public.routes";

const routeTree = rootRoute.addChildren([
  publicRoute.addChildren([
    loginRoute,
    unlockRoute,
    recoverRoute,
    setupRoute.addChildren([
      setupPinRoute,
      setupRecoveryRoute,
      setupConfirmRoute,
    ]),
  ]),

  guardedRoute.addChildren([
    homeRoute,
    passwordsRoute,
    notesRoute,
    settingsRoute,
  ]),
]);

export default routeTree;
