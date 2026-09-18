import type { EnvironmentVariables } from "@/types/app.types";
import envSchema from "@/validations/schema/env.schema";
import { loadEnv, type Plugin } from "vite";

// Env vars are validated at build time via the Vite plugin in vite.config.ts.
// This cast is safe because the build/dev server will not start if validation fails.
const env = import.meta.env as unknown as EnvironmentVariables;

export function validateEnv(): Plugin {
  return {
    name: "validate-env",
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, config.envPrefix);
      const result = envSchema.safeParse(env);

      if (!result.success) {
        console.error("\n❌ Environment variable validation failed:\n");
        for (const issue of result.error.issues) {
          console.error(`  • ${issue.path.join(".")}: ${issue.message}`);
        }
        console.error();
        process.exit(1);
      }
    },
  };
}
export default env;
