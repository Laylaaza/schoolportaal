import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionUser } from "./repository";
import { dashboard } from "./roles";
import type { RoleName } from "./models";

export const SESSION_COOKIE = "school_session";
// Basic server session lookup; expiry is checked on each page request.
// SECURITY VERSION 2: add session rotation, idle timeout and audit logging.
export async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? sessionUser(token) : null;
}
export async function requireUser(role?: RoleName) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (role && user.role !== role) redirect(dashboard[user.role]);
  return user;
}
