"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, SESSION_COOKIE } from "@/lib/auth";
import { createSession, createUser, findLoginUser, listRoles, updateRole } from "@/lib/repository";
import { DatabaseUnavailableError } from "@/lib/db";
import { dashboard } from "@/lib/roles";
export type FormState = { error: string };

export async function login(_state: FormState, form: FormData): Promise<FormState> {
  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "");
  let destination: string;
  try {
    const user = await findLoginUser(username);
    // SECURITY VERSION 2: use one generic authentication error message
    if (!user) return { error: "Gebruiker niet gevonden." };
    // SECURITY VERSION 2: replace plain text passwords with secure password hashing
    if (user.password !== password) return { error: "Onjuist wachtwoord." };
    const session = await createSession(user.id);
    // SECURITY VERSION 2: harden cookie flags (HttpOnly/Secure/SameSite) for deployment.
    (await cookies()).set(SESSION_COOKIE, session.session_id, { path: "/", expires: new Date(session.expires_at) });
    destination = dashboard[user.role];
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) return { error: "Inloggen is tijdelijk niet mogelijk. Probeer het later opnieuw." };
    throw error;
  }
  // Redirect throws a Next.js control-flow exception; keep it outside the error handler.
  redirect(destination);
}
export async function logout() {
  const jar = await cookies();
  // SECURITY VERSION 2: invalidate the active server side session on logout
  // Lab baseline: the saved token still works until its existing eight-hour expiry.
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
// Basic role gate on mutations. SECURITY VERSION 2: strengthen validation and auditing.
export async function addUser(_state: FormState, form: FormData): Promise<FormState> {
  try {
    await requireUser("Administrator");
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "");
    const role_id = Number(form.get("role_id"));
    // SECURITY VERSION 2: validate and allowlist input server side
    // Username format is checked only by the browser; required fields and role integrity remain.
    if (!username || !password || !(await listRoles()).some(role => role.id === role_id)) {
      return { error: "Vul alle velden in en kies een geldige rol." };
    }
    if (!await createUser({ username, password, role_id })) return { error: "Deze gebruikersnaam bestaat al." };
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) return { error: "Opslaan is tijdelijk niet mogelijk. Probeer het later opnieuw." };
    throw error;
  }
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  redirect("/admin/users");
}
export async function changeRole(form: FormData) {
  await requireUser("Administrator");
  await updateRole(Number(form.get("user_id")), Number(form.get("role_id")));
  revalidatePath("/", "layout");
  redirect("/admin/users");
}
