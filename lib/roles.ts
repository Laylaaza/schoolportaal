import type { RoleName } from "./models";
export const dashboard: Record<RoleName, string> = {
  Student: "/student", Teacher: "/teacher", Administrator: "/admin",
};
export const roleLabel: Record<RoleName, string> = {
  Student: "Student", Teacher: "Docent", Administrator: "Beheerder",
};
