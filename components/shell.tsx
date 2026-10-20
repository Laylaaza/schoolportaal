import Link from "next/link";
import { logout } from "@/app/actions";
import { dashboard, roleLabel } from "@/lib/roles";
import { findOwnStudent } from "@/lib/repository";
import type { RoleName } from "@/lib/models";

export function Shell({ user, title, children }: {
  user: { id: number; username: string; role: RoleName }; title: string; children: React.ReactNode;
}) {
  const student = user.role === "Student" ? findOwnStudent(user.id) : null;
  const secondary = user.role === "Teacher" ? { href: "/teacher/students", label: "Studenten" }
    : user.role === "Administrator" ? { href: "/admin/users", label: "Gebruikers" }
    : student ? { href: `/student/${student.id}`, label: "Mijn gegevens" } : null;
  return <>
    <header className="site-header"><strong>Security Playground</strong>
      <nav aria-label="Hoofdnavigatie">
        <Link href={dashboard[user.role]}>Dashboard</Link>
        {secondary && <Link href={secondary.href}>{secondary.label}</Link>}
        <form action={logout}><button className="secondary">Uitloggen</button></form>
      </nav>
    </header>
    <main className="page">
      <div className="identity">Ingelogd als: <strong>{user.username}</strong><span>Rol: <strong>{roleLabel[user.role]}</strong></span></div>
      <h1>{title}</h1>{children}
    </main>
  </>;
}
