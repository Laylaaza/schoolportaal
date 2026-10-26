import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { findOwnStudent } from "@/lib/repository";
import { Shell } from "@/components/shell";
import { StudentData } from "@/components/records";
export default async function StudentPage() {
  const user = await requireUser("Student");
  const student = await findOwnStudent(user.id);
  return <Shell user={user} title="Studentenportaal"><p>Welkom, {user.username}</p>
    {student ? <><StudentData student={student} /><Link className="button" href={`/student/${student.id}`}>Mijn gegevens bekijken</Link></>
      : <p>Er zijn nog geen studentgegevens aan dit account gekoppeld.</p>}
  </Shell>;
}
