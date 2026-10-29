"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, SESSION_COOKIE } from "@/lib/auth";
import { createSession, createUser, deleteSession, findLoginUser, listRoles, updateRole } from "@/lib/repository";
import { DatabaseUnavailableError } from "@/lib/db";
import { dashboard } from "@/lib/roles";
import { verifyPassword, validPasswordLength } from "@/lib/passwords.cjs";
export type FormState = { error: string };

export async function login(_state: FormState, form: FormData): Promise<FormState> {
  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "");
  let destination: string;
  try {
    const user = await findLoginUser(username);
    // SECURITY VERSION 2: use one generic authentication error message
    if (!user) return { error: "Gebruiker niet gevonden." };
    // Accept only migrated bcrypt hashes; no plaintext fallback.
    if (!await verifyPassword(password, user.password)) return { error: "Onjuist wachtwoord." };
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
  // Revoke the server session first; if deletion fails, do not report a successful logout.
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
// Admin mutations validate input on the server, independently of browser controls.
export async function addUser(_state: FormState, form: FormData): Promise<FormState> {
  try {
    await requireUser("Administrator");
    const username = String(form.get("username") || "");
    const password = String(form.get("password") || "");
    const role_id = Number(form.get("role_id"));
    // Same ASCII allowlist and length as the HTML pattern; never trust that pattern alone.
    if (!/^[A-Za-z0-9_]{3,30}$/.test(username) || username.trim() !== username) {
      return { error: "Gebruik voor de gebruikersnaam 3 tot 30 letters, cijfers of underscores." };
    }
    // bcrypt processes at most 72 UTF-8 bytes; reject longer values instead of truncating.
    if (!validPasswordLength(password)) {
      return { error: "Vul een wachtwoord in van maximaal 72 UTF-8-bytes." };
    }
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
