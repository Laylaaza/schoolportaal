// Read-only connectivity/schema check. Never prints passwords or raw driver errors.
const { loadEnvConfig } = require('@next/env');
const mysql = require('mysql2/promise');
loadEnvConfig(process.cwd());
(async () => {
  let db;
  try {
    for (const key of ['DB_HOST','DB_USER','DB_PASSWORD','DB_NAME']) {
      if (!process.env[key]) throw Object.assign(new Error(), { code: 'MISSING_' + key });
    }
    db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectTimeout: 5000 });
    const schema = {
      roles: 'id, name', users: 'id, username, password, role_id',
      students: 'id, user_id, student_number, first_name, last_name, email',
      sessions: 'id, user_id, session_id, created_at, expires_at',
    };
    for (const [table, columns] of Object.entries(schema)) {
      await db.execute(`SELECT ${columns} FROM ${table} LIMIT 0`);
      console.log(table + ': columns available');
    }
    const [roles] = await db.execute('SELECT name FROM roles');
    if (!['student','teacher','admin'].every(name => roles.some(role => role.name === name))) throw Object.assign(new Error(), { code: 'MISSING_EXPECTED_ROLES' });
    for (const table of ['users','sessions']) {
      const [columns] = await db.execute(`SHOW COLUMNS FROM ${table} WHERE Field = 'id'`);
      if (!columns[0]?.Extra.includes('auto_increment')) throw Object.assign(new Error(), { code: 'EXPECTED_AUTO_INCREMENT_ID' });
    }
    console.log('Connection, schema, roles and generated IDs verified. No data changed.');
  } catch (error) {
    const code = error.code || '';
    console.error('Database check failed:', /^[A-Z0-9_]+$/.test(code) ? code : 'DATABASE_ERROR');
    process.exitCode = 1;
  } finally { if (db) await db.end(); }
})();
