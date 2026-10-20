"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, SESSION_COOKIE } from "@/lib/auth";
import { createSession, createUser, deleteSession, findLoginUser, listRoles, updateRole } from "@/lib/repository";
import { dashboard } from "@/lib/roles";
export type FormState = { error: string };

// SECURITY VERSION 2: replace plaintext comparison, add throttling and review errors.
export async function login(_state: FormState, form: FormData): Promise<FormState> {
  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "");
  const user = findLoginUser(username);
  if (!user || user.password !== password) return { error: "Gebruikersnaam of wachtwoord is onjuist." };
  const role = listRoles().find(role => role.id === user.role_id)!;
  const session = createSession(user.id);
  // SECURITY VERSION 2: harden cookie flags (HttpOnly/Secure/SameSite) for deployment.
  (await cookies()).set(SESSION_COOKIE, session.session_id, { path: "/", expires: new Date(session.expires_at) });
  redirect(dashboard[role.name]);
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(token);
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
// Basic role gate on mutations. SECURITY VERSION 2: strengthen validation and auditing.
export async function addUser(_state: FormState, form: FormData): Promise<FormState> {
  await requireUser("Administrator");
  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "");
  const role_id = Number(form.get("role_id"));
  if (!username || !password || !listRoles().some(role => role.id === role_id)) {
    return { error: "Vul alle velden in en kies een geldige rol." };
  }
  if (!createUser({ username, password, role_id })) return { error: "Deze gebruikersnaam bestaat al." };
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  redirect("/admin/users");
}
export async function changeRole(form: FormData) {
  await requireUser("Administrator");
  updateRole(Number(form.get("user_id")), Number(form.get("role_id")));
  revalidatePath("/", "layout");
  redirect("/admin/users");
}
