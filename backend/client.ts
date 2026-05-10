import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true, // This equates to verify-full
  },
});
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
});
