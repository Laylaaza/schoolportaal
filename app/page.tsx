import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { dashboard } from "@/lib/roles";
export default async function Home() {
  const user = await currentUser();
  redirect(user ? dashboard[user.role] : "/login");
}
