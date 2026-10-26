export type RoleName = "Student" | "Teacher" | "Administrator";
export type Role = { id: number; name: RoleName };
export type User = { id: number; username: string; password: string; role_id: number };
export type Student = {
  id: number; user_id: number | null; student_number: string;
  first_name: string; last_name: string; email: string;
};
export type Session = {
  id: number; user_id: number; session_id: string; created_at: string; expires_at: string;
};

