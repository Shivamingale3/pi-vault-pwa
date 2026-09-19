import path from "node:path";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { defineConfig, loadEnv, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";
import envSchema from "./src/validations/schema/env.schema.ts";

function validateEnv(): Plugin {
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    validateEnv(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
