import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { PRISMA_CONFIG } from "../config/config.js";

const pool = new pg.Pool({ connectionString: PRISMA_CONFIG.datasource.url });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
