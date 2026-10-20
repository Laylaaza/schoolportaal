import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { dashboard } from "@/lib/roles";
import { LoginForm } from "@/components/forms";
export default async function Login() {
  const user = await currentUser();
  if (user) redirect(dashboard[user.role]);
  return <main className="login"><p className="brand">Security Playground</p>
    <h1>Inloggen schoolportaal</h1><LoginForm />
  </main>;
}
