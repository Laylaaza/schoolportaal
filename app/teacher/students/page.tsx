import { requireUser } from "@/lib/auth";
import { Shell } from "@/components/shell";
import { StudentTable } from "@/components/records";
import { StudentSearch } from "@/components/student-search";
export default async function StudentsPage({ searchParams }: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const user = await requireUser("Teacher");
  const query = (await searchParams).q;
  const search = typeof query === "string" ? query : "";
  return <Shell user={user} title="Studenten"><StudentSearch value={search} /><StudentTable search={search} /></Shell>;
}
