import z from "zod";

const envSchema = z.object({
  VITE_PUBLIC_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  VITE_PUBLIC_API_BASE_URL: z.url("VITE_PUBLIC_API_BASE_URL is required!"),
});

export default envSchema;
