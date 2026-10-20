"use client";
import { useActionState } from "react";
import { addUser, login } from "@/app/actions";
import type { Role } from "@/lib/models";
import { roleLabel } from "@/lib/roles";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: "" });
  return <form action={action}>
    <label htmlFor="username">Gebruikersnaam</label>
    <input id="username" name="username" autoComplete="username" required />
    <label htmlFor="password">Wachtwoord</label>
    <input id="password" name="password" type="password" autoComplete="current-password" required />
    {state.error && <p className="error" role="alert">{state.error}</p>}
    <button disabled={pending}>{pending ? "Bezig met inloggen…" : "Inloggen"}</button>
  </form>;
}
export function AddUserForm({ roles }: { roles: Role[] }) {
  const [state, action, pending] = useActionState(addUser, { error: "" });
  return <form action={action} className="narrow-form">
    <label htmlFor="username">Gebruikersnaam</label>
    <input id="username" name="username" autoComplete="off" required maxLength={60} />
    <label htmlFor="password">Wachtwoord</label>
    <input id="password" name="password" type="password" autoComplete="new-password" required />
    <label htmlFor="role_id">Rol</label>
    <select id="role_id" name="role_id">{roles.map(role =>
      <option key={role.id} value={role.id}>{roleLabel[role.name]}</option>)}</select>
    {state.error && <p className="error" role="alert">{state.error}</p>}
    <button disabled={pending}>{pending ? "Opslaan…" : "Gebruiker toevoegen"}</button>
  </form>;
}
