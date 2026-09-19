import type { EnvironmentVariables } from "@/types/app.types";

// Env vars are validated at build/dev start via the Vite plugin in vite.config.ts.
// This cast is safe because the build/dev server will not start if validation fails.
const env = import.meta.env as unknown as EnvironmentVariables;

export default env;
