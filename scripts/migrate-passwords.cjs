// Explicit one-time lab migration. Dry-run by default; --apply commits atomically.
const { hashPassword, isPasswordHash, validPasswordLength } = require("../lib/passwords.cjs");

async function migratePasswords(db, { apply = false } = {}) {
  const [[table]] = await db.execute(
    "SELECT ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'");
  const [[column]] = await db.execute(
    "SELECT CHARACTER_MAXIMUM_LENGTH AS capacity FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password'");
  if (table?.engine !== "InnoDB") throw new Error("USERS_MUST_SUPPORT_TRANSACTIONS");
  if (!column || Number(column.capacity) < 60) throw new Error("PASSWORD_COLUMN_REQUIRES_AT_LEAST_60_CHARACTERS");

  await db.beginTransaction();
  try {
    const [users] = await db.execute("SELECT id, password FROM users ORDER BY id FOR UPDATE");
    let skipped = 0;
    const pending = [];
    // Validate every row before modifying any row. Never log passwords or hashes.
    for (const user of users) {
      if (isPasswordHash(user.password)) { skipped++; continue; }
      if (typeof user.password !== "string" || user.password.startsWith("$2")) {
        throw new Error("UNRECOGNISED_PASSWORD_FORMAT");
      }
      if (!validPasswordLength(user.password)) throw new Error("LEGACY_PASSWORD_LENGTH_INVALID");
      pending.push(user);
    }
    if (apply) {
      for (const user of pending) {
        const passwordHash = await hashPassword(user.password);
        const [result] = await db.execute("UPDATE users SET password = ? WHERE id = ?", [passwordHash, user.id]);
        if (result.affectedRows !== 1) throw new Error("PASSWORD_UPDATE_FAILED");
      }
      await db.commit();
    } else {
      await db.rollback();
    }
    return { pending: pending.length, skipped, applied: apply };
  } catch (error) {
    await db.rollback();
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--apply")) throw new Error("USE_NO_ARGUMENTS_OR_APPLY");
  require("@next/env").loadEnvConfig(process.cwd());
  for (const key of ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]) {
    if (!process.env[key]) throw new Error("MISSING_DATABASE_CONFIGURATION");
  }
  const db = await require("mysql2/promise").createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, connectTimeout: 5000,
  });
  try {
    const result = await migratePasswords(db, { apply: args.includes("--apply") });
    console.log(`${result.applied ? "Migrated" : "Would migrate"}: ${result.pending}; already hashed: ${result.skipped}.`);
    if (!result.applied) console.log("No values changed. Stop the portal, take a lab backup, then run npm run migrate:passwords -- --apply.");
  } finally {
    await db.end();
  }
}
if (require.main === module) {
  main().catch(error => {
    const code = error.code || error.message;
    console.error("Password migration failed:", /^[A-Z0-9_]+$/.test(code || "") ? code : "MIGRATION_ERROR");
    process.exitCode = 1;
  });
}
module.exports = { migratePasswords };
