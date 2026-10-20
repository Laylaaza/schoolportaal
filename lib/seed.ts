import type { Database } from "./models";

// Local teaching fixture only. SECURITY VERSION 2: hash passwords before storing them.
export function seedDatabase(): Database {
  return {
    roles: [{ id: 1, name: "Student" }, { id: 2, name: "Teacher" }, { id: 3, name: "Administrator" }],
    users: [
      { id: 1, username: "student1", password: "student1", role_id: 1 },
      { id: 2, username: "teacher1", password: "teacher1", role_id: 2 },
      { id: 3, username: "admin1", password: "admin1", role_id: 3 },
    ],
    students: [
      { id: 1, user_id: 1, student_number: "S1001", first_name: "Student", last_name: "One", email: "student1@school.local" },
      // These records do not have login accounts yet.
      { id: 2, user_id: null, student_number: "S1002", first_name: "Student", last_name: "Two", email: "student2@school.local" },
      { id: 3, user_id: null, student_number: "S1003", first_name: "Student", last_name: "Three", email: "student3@school.local" },
    ],
    sessions: [],
  };
}
