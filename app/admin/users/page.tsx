import { requireUser } from "@/lib/auth";
import { Shell } from "@/components/shell";
import { UserTable } from "@/components/records";
export default async function UsersPage() {
  // SECURITY VERSION 2: require admin role server side
  // Only this user-list read is login-only; admin mutations retain their role checks.
  const user = await requireUser();
  return <Shell user={user} title="Gebruikers"><UserTable canManage={user.role === "Administrator"} /></Shell>;
}
