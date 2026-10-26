import "server-only";
import mysql, { type Pool } from "mysql2/promise";

// Reuse one pool during development reloads. Configuration stays on the server.
const globalDb = globalThis as typeof globalThis & { schoolPool?: Pool };
export function getDb() {
  if (globalDb.schoolPool) return globalDb.schoolPool;
  for (const key of ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]) {
    if (!process.env[key]) throw new Error(`Missing database setting: ${key}`);
  }
  globalDb.schoolPool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    connectTimeout: 5000,
    timezone: "Z",
  });
  return globalDb.schoolPool;
}

// Log only a driver error code: never SQL, connection options, values or credentials.
export function logDatabaseError(operation: string, error: unknown) {
  const code = (error as { code?: unknown })?.code;
  console.error(`[database:${operation}]`, typeof code === "string" && /^[A-Z0-9_]+$/.test(code) ? code : "DATABASE_ERROR");
}
export class DatabaseUnavailableError extends Error {
  constructor() { super("De gegevens zijn tijdelijk niet beschikbaar. Probeer het later opnieuw."); }
}
