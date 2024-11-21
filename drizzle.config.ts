import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
config({ path: ".env" });
export default defineConfig({
  schema: "./src/app/api/302/schema.ts",

  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});