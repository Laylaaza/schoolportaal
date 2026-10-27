import { requireUser } from "@/lib/auth";
import { Shell } from "@/components/shell";
import { StudentTable } from "@/components/records";
import { StudentSearch } from "@/components/student-search";
export default async function TeacherPage() {
  const user = await requireUser("Teacher");
  return <Shell user={user} title="Docentenportaal"><p>Welkom, {user.username}</p>
    <h2>Studenten</h2><StudentSearch /><StudentTable />
  </Shell>;
}
