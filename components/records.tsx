import Link from "next/link";
import { notFound } from "next/navigation";
import { changeRole } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { findStudent, listRoles, listStudents, listUsers, searchStudents } from "@/lib/repository";
import { dashboard, roleLabel } from "@/lib/roles";
import type { Student } from "@/lib/models";
import { Shell } from "./shell";

export function StudentData({ student }: { student: Student }) {
  return <dl className="student-data">
    <div><dt>Studentnummer</dt><dd>{student.student_number}</dd></div>
    <div><dt>Naam</dt><dd>{student.first_name} {student.last_name}</dd></div>
    <div><dt>E-mail</dt><dd>{student.email}</dd></div>
  </dl>;
}
export async function StudentTable({ search = "" }: { search?: string }) {
  const students = search ? await searchStudents(search) : await listStudents();
  return <div className="table-scroll"><table><thead><tr>
    <th>Studentnummer</th><th>Naam</th><th>Actie</th>
  </tr></thead><tbody>{students.map(student => <tr key={student.id}>
    <td>{student.student_number}</td><td>{student.first_name} {student.last_name}</td>
    <td><Link href={`/teacher/students/${student.id}`}>Bekijken</Link></td>
  </tr>)}</tbody></table></div>;
}
export async function UserTable({ canManage = true }: { canManage?: boolean }) {
  const [roles, users] = await Promise.all([listRoles(), listUsers()]);
  return <>
    {canManage && <p><Link className="button" href="/admin/users/new">Gebruiker toevoegen</Link></p>}
    <div className="table-scroll"><table><thead><tr><th>Gebruikersnaam</th><th>Rol</th>{canManage && <th>Actie</th>}</tr></thead>
      <tbody>{users.map(user => <tr key={user.id}>
        <td>{user.username}</td><td>{roleLabel[user.role]}</td>
        {canManage && <td><form action={changeRole} className="inline-form">
          <input type="hidden" name="user_id" value={user.id} />
          <label className="sr-only" htmlFor={`role-${user.id}`}>Rol voor {user.username}</label>
          <select id={`role-${user.id}`} name="role_id" defaultValue={user.role_id}>
            {roles.map(role => <option key={role.id} value={role.id}>{roleLabel[role.name]}</option>)}
          </select><button className="secondary">Rol wijzigen</button>
        </form></td>}
      </tr>)}</tbody></table></div>
  </>;
}
export async function StudentDetail({ id, teacher = false }: { id: string; teacher?: boolean }) {
  const user = await requireUser(teacher ? "Teacher" : "Student");
  const student = await findStudent(Number(id));
  if (!student || (user.role === "Student" && student.user_id !== user.id)) notFound();
  return <Shell user={user} title="Studentgegevens"><StudentData student={student} />
    <Link href={teacher ? "/teacher/students" : dashboard[user.role]}>Terug</Link>
  </Shell>;
}
