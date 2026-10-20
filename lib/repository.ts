import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { seedDatabase } from "./seed";
import type { Database, User } from "./models";

// Single-process local JSON adapter. Replace this module with database queries later.
// Synchronous read/modify/write keeps mutations together in this local Node process.
// SECURITY VERSION 2: use a database with transactions and parameterised queries.
const filename = path.join(process.cwd(), "data", process.env.PORTAL_TEST_MODE === "1" ? "acceptance.json" : "portal.json");
function save(db: Database) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(temporary, filename);
}
function read(): Database {
  if (!fs.existsSync(filename)) save(seedDatabase());
  return JSON.parse(fs.readFileSync(filename, "utf8")) as Database;
}
export function listRoles() { return read().roles; }
export function listUsers() {
  return read().users.map(({ password: _password, ...user }) => user);
}
export function findLoginUser(username: string) {
  return read().users.find(user => user.username === username);
}
export function listStudents() { return read().students; }
export function findStudent(id: number) { return read().students.find(student => student.id === id); }
export function findOwnStudent(userId: number) {
  return read().students.find(student => student.user_id === userId);
}
export function createUser(input: Omit<User, "id">) {
  const db = read();
  if (db.users.some(user => user.username === input.username)) return false;
  const id = Math.max(0, ...db.users.map(user => user.id)) + 1;
  db.users.push({ ...input, id });
  save(db);
  return true;
}
export function updateRole(id: number, roleId: number) {
  const db = read();
  const user = db.users.find(user => user.id === id);
  if (!user || !db.roles.some(role => role.id === roleId)) return false;
  user.role_id = roleId;
  save(db);
  return true;
}
export function createSession(userId: number) {
  const db = read();
  const now = new Date();
  db.sessions = db.sessions.filter(session => Date.parse(session.expires_at) > now.getTime());
  const session = {
    id: Math.max(0, ...db.sessions.map(s => s.id)) + 1,
    user_id: userId, session_id: randomUUID(), created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(),
  };
  db.sessions.push(session);
  save(db);
  return session;
}
export function sessionUser(token: string) {
  const db = read();
  const session = db.sessions.find(s => s.session_id === token && Date.parse(s.expires_at) > Date.now());
  const user = session && db.users.find(u => u.id === session.user_id);
  const role = user && db.roles.find(r => r.id === user.role_id);
  return user && role ? { id: user.id, username: user.username, role: role.name } : null;
}
export function deleteSession(token: string) {
  const db = read();
  db.sessions = db.sessions.filter(session => session.session_id !== token);
  save(db);
}

