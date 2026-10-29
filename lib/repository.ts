import "server-only";
import { randomUUID } from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDb, logDatabaseError, DatabaseUnavailableError } from "./db";
import type { RoleName, User, Student } from "./models";
import { hashPassword } from "./passwords.cjs";

// All portal data comes from MySQL. There is no JSON or demo-data fallback.
function roleName(name: string): RoleName {
  if (name === "student") return "Student";
  if (name === "teacher") return "Teacher";
  if (name === "admin") return "Administrator";
  throw new DatabaseUnavailableError();
}
async function rows<T>(operation: string, sql: string, values: (string | number | Date)[] = []): Promise<T[]> {
  try {
    const [result] = await getDb().execute<RowDataPacket[]>(sql, values);
    return result as T[];
  } catch (error) {
    logDatabaseError(operation, error);
    throw new DatabaseUnavailableError();
  }
}
async function write(operation: string, sql: string, values: (string | number | Date)[]) {
  try {
    const [result] = await getDb().execute<ResultSetHeader>(sql, values);
    return result;
  } catch (error) {
    logDatabaseError(operation, error);
    throw new DatabaseUnavailableError();
  }
}
export async function listRoles() {
  const result = await rows<{ id: number; name: string }>("roles", "SELECT id, name FROM roles ORDER BY id");
  return result.map(role => ({ ...role, name: roleName(role.name) }));
}
export async function listUsers() {
  const result = await rows<Omit<User, "password"> & { role: string }>("users",
    "SELECT u.id, u.username, u.role_id, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id ORDER BY u.id");
  return result.map(user => ({ ...user, role: roleName(user.role) }));
}
export async function findLoginUser(username: string) {
  const [user] = await rows<User & { role: string }>("login",
    "SELECT u.id, u.username, u.password, u.role_id, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.username = ? LIMIT 1", [username]);
  return user ? { ...user, role: roleName(user.role) } : null;
}
const studentColumns = "id, user_id, student_number, first_name, last_name, email";
export async function listStudents() {
  return rows<Student>("students", `SELECT ${studentColumns} FROM students ORDER BY id`);
}
export async function findStudent(id: number) {
  if (!Number.isSafeInteger(id)) return undefined;
  return (await rows<Student>("student", `SELECT ${studentColumns} FROM students WHERE id = ? LIMIT 1`, [id]))[0];
}
export async function findOwnStudent(userId: number) {
  return (await rows<Student>("own-student", `SELECT ${studentColumns} FROM students WHERE user_id = ? LIMIT 1`, [userId]))[0];
}
export async function createUser(input: Omit<User, "id">) {
  if (await findLoginUser(input.username)) return false;
  const passwordHash = await hashPassword(input.password);
  try {
    await getDb().execute("INSERT INTO users (username, password, role_id) VALUES (?, ?, ?)",
      [input.username, passwordHash, input.role_id]);
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") return false;
    logDatabaseError("create-user", error);
    throw new DatabaseUnavailableError();
  }
}
export async function updateRole(id: number, roleId: number) {
  if (!(await listRoles()).some(role => role.id === roleId)) return false;
  const result = await write("update-role", "UPDATE users SET role_id = ? WHERE id = ?", [roleId, id]);
  return result.affectedRows > 0;
}
// Same UUID cookie and eight-hour lifetime; session rows now live in MySQL.
// UTC dates are used for both writes and expiry comparisons.
export async function createSession(userId: number) {
  const created = new Date();
  const expires = new Date(created.getTime() + 8 * 60 * 60 * 1000);
  const token = randomUUID();
  const result = await write("create-session",
    "INSERT INTO sessions (user_id, session_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    [userId, token, created, expires]);
  return { id: result.insertId, user_id: userId, session_id: token, created_at: created.toISOString(), expires_at: expires.toISOString() };
}
export async function sessionUser(token: string) {
  const [user] = await rows<{ id: number; username: string; role: string }>("session",
    "SELECT u.id, u.username, r.name AS role FROM sessions s JOIN users u ON u.id = s.user_id JOIN roles r ON r.id = u.role_id WHERE s.session_id = ? AND s.expires_at > ? LIMIT 1",
    [token, new Date()]);
  return user ? { ...user, role: roleName(user.role) } : null;
}
export async function deleteSession(token: string) {
  await write("logout", "DELETE FROM sessions WHERE session_id = ?", [token]);
}

// The statement and search value are sent separately; input cannot change SQL syntax.
export async function searchStudents(search: string): Promise<Student[]> {
  return rows<Student>("student-search",
    "SELECT " + studentColumns + " FROM students WHERE CONCAT(first_name, ' ', last_name) LIKE ? ORDER BY id",
    [`%${search}%`]);
}
