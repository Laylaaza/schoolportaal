import { requireUser } from "@/lib/auth";
import { Shell } from "@/components/shell";
import { StudentTable } from "@/components/records";
export default async function StudentsPage() {
  const user = await requireUser("Teacher");
  return <Shell user={user} title="Studenten"><StudentTable /></Shell>;
}
