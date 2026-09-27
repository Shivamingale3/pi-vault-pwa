import type envSchema from "@/validations/schema/env.schema";
import type z from "zod";

export type EnvironmentVariables = z.infer<typeof envSchema>;

export type TrustStatus =
  | "checking"
  | "needs-login"
  | "needs-setup"
  | "locked"
  | "unlocked";

export type ResolvedTheme = "light" | "dark";

export type ThemePreference = "light" | "dark" | "system";
