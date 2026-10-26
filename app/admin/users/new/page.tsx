import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listRoles } from "@/lib/repository";
import { Shell } from "@/components/shell";
import { AddUserForm } from "@/components/forms";
export default async function NewUserPage() {
  const user = await requireUser("Administrator");
  return <Shell user={user} title="Gebruiker toevoegen"><AddUserForm roles={await listRoles()} />
    <p><Link href="/admin/users">Terug naar gebruikers</Link></p>
  </Shell>;
}
