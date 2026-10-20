import { requireUser } from "@/lib/auth";
import { Shell } from "@/components/shell";
import { UserTable } from "@/components/records";
export default async function UsersPage() {
  const user = await requireUser("Administrator");
  return <Shell user={user} title="Gebruikers"><UserTable /></Shell>;
}
