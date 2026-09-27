import { loadEnv, type Plugin } from "vite";
import envSchema from "../src/validations/schema/env.schema.ts";

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
