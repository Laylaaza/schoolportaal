import { requireUser } from "@/lib/auth";
import { Shell } from "@/components/shell";
import { UserTable } from "@/components/records";
export default async function AdminPage() {
  const user = await requireUser("Administrator");
  return <Shell user={user} title="Beheerdersportaal"><p>Welkom, {user.username}</p>
    <h2>Gebruikers</h2><UserTable />
  </Shell>;
}
