import type envSchema from "@/validations/schema/env.schema";
import type z from "zod";

export type EnvironmentVariables = z.infer<typeof envSchema>;
