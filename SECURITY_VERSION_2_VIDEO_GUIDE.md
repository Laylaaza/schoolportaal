# SECURITY VERSION 2 VIDEO CHANGE REPORT

Date: 28 October 2026. Project: Security Playground, existing Next.js portal.

Only the six requested weaknesses are addressed. There is no redesign, route change, automatic schema change, MySQL grant change, network change or framework upgrade. Distinct login errors and existing cookie settings remain out of scope. Teacher access through the existing teacher routes and admin user management remain intact; no new admin access to student-detail routes is added.

The BEFORE snippets below were captured from this checkout before editing. AFTER snippets and line ranges were read from the final saved files. Links open the first line; the visible label gives the complete range. Student examples assume the existing lab records use IDs 1 and 2 and student1 owns record 1; substitute the actual IDs if needed. No real passwords, session tokens or environment values are included.

## Verification and limitations

- **24 tests passed** with actual bcrypt hashing and simulated MySQL/Next.js I/O: `npm run test:db`. Test source: [tests/database.test.cjs:1–222](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/tests/database.test.cjs:1>).
- **Production build passed**, including TypeScript: `npm run build`. Next.js emitted its existing dependency security advisory. The retry completed; the framework was not upgraded because that is outside the six fixes.
- **Live database check did not pass**: `npm run db:check` returned `ETIMEDOUT` from this computer. No live migration, real account login, actual SQL execution or network test is claimed. The real-server after-tests remain required.
- No migration was applied by this task. Version 2 login deliberately rejects remaining plaintext database values until the explicit migration is run.

## Exact deployment and migration procedure on SRV WEB01

Use the existing project directory. Stop the existing portal service with the service manager already used in your lab, and take a private database/VM snapshot first. The service name is not known here, so no service command is guessed. Keep your existing database environment configuration; do not put passwords into shell arguments or the report. Run:

```sh
npm ci
npm run db:check
npm run test:db
npm run build
npm run migrate:passwords
npm run migrate:passwords -- --apply
npm run migrate:passwords
npm start
```

The first migration command previews counts and changes nothing. Run the apply command only after checking the preview; it commits the replacements in one transaction. The second preview should show zero remaining candidates. Restart your existing service **instead of** `npm start` if a service manager runs the app. Do not run Version 1 alongside the migration or Version 2: it can insert new plaintext values.

The migration requires an InnoDB users table and a password column with capacity for at least 60 characters. It does not alter your schema. If the column is too short, inspect its current definition and enlarge only that column, typically to VARCHAR(255), preserving nullability/default/collation before retrying. Unsupported formats, empty passwords or passwords over 72 UTF-8 bytes abort without partial updates. Recognised 60-character bcrypt `$2a$`/`$2b$` values are skipped, so reruns do not double-hash. A legacy plaintext that exactly resembles a bcrypt hash cannot be distinguished automatically without extra metadata; investigate any unexpected skipped count in the known lab data. No values are printed.

After migration, log in with the **same original passwords**. For the password-storage video, inspect only the fictitious lab users with `SELECT username, password FROM users;`; the report itself contains no query output. Before each access-control video, establish a fresh login.

## Vulnerability 1 — Broken Access Control on student records

### Version 1 behaviour

The student route checked login and the Student role, but then loaded whichever numeric record ID appeared in the URL. The normal interface linked only to the owner’s record, yet changing the URL could reveal another student’s information.

### Version 2 behaviour

The server retains the existing role gate and compares the requested record’s user_id with the authenticated user ID for students. A missing, unlinked or foreign record returns the existing not-found result before rendering StudentData. Teachers can still view records through /teacher/students/[id].

### File changed

- `components/records.tsx`

### Exact line numbers

- [components/records.tsx:43–51](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/components/records.tsx:43>): lines 43–51.

These are final Version 2 line numbers, calculated from the saved files after the code edits.

### BEFORE code

**components/records.tsx (captured Version 1 source)**

```tsx
export async function StudentDetail({ id, teacher = false }: { id: string; teacher?: boolean }) {
  const user = await requireUser(teacher ? "Teacher" : "Student");
  // SECURITY VERSION 2: verify that the requested student belongs to the logged in user
  // VERSION 1 deliberately does NOT compare student.user_id with user.id.
  // A logged-in student can change /student/1 to /student/2 (Broken Access Control).
  const student = await findStudent(Number(id));
  if (!student) notFound();
  return <Shell user={user} title="Studentgegevens"><StudentData student={student} />
    <Link href={teacher ? "/teacher/students" : dashboard[user.role]}>Terug</Link>
  </Shell>;
}
```

### AFTER code

[components/records.tsx:43–51](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/components/records.tsx:43>)

```tsx
export async function StudentDetail({ id, teacher = false }: { id: string; teacher?: boolean }) {
  const user = await requireUser(teacher ? "Teacher" : "Student");
  // The existing route role gate is retained; students must also own the requested record.
  const student = await findStudent(Number(id));
  if (!student || (user.role === "Student" && student.user_id !== user.id)) notFound();
  return <Shell user={user} title="Studentgegevens"><StudentData student={student} />
    <Link href={teacher ? "/teacher/students" : dashboard[user.role]}>Terug</Link>
  </Shell>;
}
```

### What changed

Added the ownership comparison to the server component immediately after retrieving the requested record. The old vulnerable comment is replaced with an explanation of the enforced check.

### Why this fixes the vulnerability

Changing a route parameter changes only the requested record, not the authenticated session identity. The server now requires those identities to match for a student before returning the data. Hiding links is no longer the control.

### Exact before-test

1. Log in as student1.
2. Click **Mijn gegevens bekijken** and show /student/1.
3. Change only the ID to /student/2. In Version 1, Student Two appeared.

### Exact after-test

1. After migration, log in as student1 with the original password.
2. Open /student/1, then manually open /student/2.
3. As teacher1, open /teacher/students/2 to verify the intended teacher workflow still works.

### Expected VERSION 2 result

Own record is visible. The other record gives **Niet gevonden** with no student details. Teacher access on the teacher route still works. Anonymous requests redirect to /login.

### Video script

In versie 1 kon ik als student1 het nummer in de URL veranderen en daardoor gegevens van een andere student bekijken. Alleen de link naar mijn eigen gegevens verbergen was dus niet voldoende. In StudentDetail in components/records.tsx vergelijk ik nu op de server de user_id van het record met de ingelogde gebruiker. Als die niet overeenkomen, wordt de informatie niet weergegeven. Ik herhaal dezelfde test: mijn eigen record werkt, maar student 2 geeft nu Niet gevonden. Daarmee laat ik zien dat de server bepaalt welke gegevens ik mag zien.

## Vulnerability 2 — Broken Access Control on the admin users page

### Version 1 behaviour

The /admin/users route used requireUser() with no role argument. Any authenticated student or teacher could therefore see usernames and roles by entering the URL, despite not having an Admin navigation link.

### Version 2 behaviour

The route calls requireUser("Administrator") before returning the user overview. Anonymous users go to login, students to /student and teachers to /teacher; administrators retain their existing management controls.

### File changed

- `app/admin/users/page.tsx`

### Exact line numbers

- [app/admin/users/page.tsx:4–8](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/app/admin/users/page.tsx:4>): lines 4–8.

These are final Version 2 line numbers, calculated from the saved files after the code edits.

### BEFORE code

**app/admin/users/page.tsx (captured Version 1 source)**

```tsx
export default async function UsersPage() {
  // SECURITY VERSION 2: require Administrator role server-side
  // Only this user-list read is login-only; admin mutations retain their role checks.
  const user = await requireUser();
  return <Shell user={user} title="Gebruikers"><UserTable canManage={user.role === "Administrator"} /></Shell>;
}
```

### AFTER code

[app/admin/users/page.tsx:4–8](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/app/admin/users/page.tsx:4>)

```tsx
export default async function UsersPage() {
  // Authorize the page on the server, before loading the user overview.
  const user = await requireUser("Administrator");
  return <Shell user={user} title="Gebruikers"><UserTable canManage={user.role === "Administrator"} /></Shell>;
}
```

### What changed

Replaced the login-only check with the existing server-side role check. No UI changes or broader admin access were introduced.

### Why this fixes the vulnerability

Authentication identifies the user; authorisation checks whether that identity may access this operation. The route now requires the correct role before user-list rendering can occur, so a manual URL bypass no longer works.

### Exact before-test

Log in as student1, show the absence of an Admin link, then type /admin/users. In Version 1, the user list appeared.

### Exact after-test

Repeat the same steps as student1. Also try as teacher1, with no session, and finally as admin1.

### Expected VERSION 2 result

Student and teacher are redirected to their own dashboards. Anonymous users go to /login. Admin1 can see the list and still create users/change roles.

### Video script

Bij deze test was ik wel ingelogd, maar ik had niet de juiste rol. In versie 1 kon ik toch rechtstreeks naar de gebruikerslijst gaan. In app/admin/users/page.tsx heb ik de controle aangepast naar requireUser met Administrator als vereiste rol. Die controle draait op de server, voordat de lijst wordt opgebouwd. Als ik nu dezelfde URL als student1 open, kom ik terug op mijn studentendashboard. Als admin1 blijft de normale beheerfunctie werken.

## Vulnerability 3 — Client-side-only username validation

### Version 1 behaviour

The HTML pattern rejected names such as lab!demo, but the server only checked required fields and a valid role ID. Removing the browser pattern allowed the unexpected name to be inserted into the database.

### Version 2 behaviour

The addUser server action enforces 3–30 ASCII letters, digits or underscores before creating a user. Leading/trailing whitespace is also rejected rather than silently normalised. The existing browser pattern remains unchanged for usability.

### File changed

- `app/actions.ts`

### Exact line numbers

- [app/actions.ts:43–60](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/app/actions.ts:43>): lines 43–60.

These are final Version 2 line numbers, calculated from the saved files after the code edits.

### BEFORE code

**app/actions.ts (captured Version 1 source)**

```ts
export async function addUser(_state: FormState, form: FormData): Promise<FormState> {
  try {
    await requireUser("Administrator");
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "");
    const role_id = Number(form.get("role_id"));
    // SECURITY VERSION 2: validate and allowlist input server side
    // Username format is checked only by the browser; required fields and role integrity remain.
    if (!username || !password || !(await listRoles()).some(role => role.id === role_id)) {
      return { error: "Vul alle velden in en kies een geldige rol." };
    }
    if (!await createUser({ username, password, role_id })) return { error: "Deze gebruikersnaam bestaat al." };
```

### AFTER code

[app/actions.ts:43–60](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/app/actions.ts:43>)

```ts
export async function addUser(_state: FormState, form: FormData): Promise<FormState> {
  try {
    await requireUser("Administrator");
    const username = String(form.get("username") || "");
    const password = String(form.get("password") || "");
    const role_id = Number(form.get("role_id"));
    // Same ASCII allowlist and length as the HTML pattern; never trust that pattern alone.
    if (!/^[A-Za-z0-9_]{3,30}$/.test(username) || username.trim() !== username) {
      return { error: "Gebruik voor de gebruikersnaam 3 tot 30 letters, cijfers of underscores." };
    }
    // bcrypt processes at most 72 UTF-8 bytes; reject longer values instead of truncating.
    if (!validPasswordLength(password)) {
      return { error: "Vul een wachtwoord in van maximaal 72 UTF-8-bytes." };
    }
    if (!username || !password || !(await listRoles()).some(role => role.id === role_id)) {
      return { error: "Vul alle velden in en kies een geldige rol." };
    }
    if (!await createUser({ username, password, role_id })) return { error: "Deze gebruikersnaam bestaat al." };
```

### What changed

Added an anchored server allowlist and length rule matching the form, including a whitespace check for the JavaScript end-anchor edge case. The adjacent password-byte check belongs to the bcrypt fix described in vulnerability 6.

### Why this fixes the vulnerability

Browser attributes are editable and therefore cannot be trusted as enforcement. The server now validates the submitted value on every request before the database insertion function is called.

### Exact before-test

As admin1, enter a unique lab!demo-style name and a normal password/role on /admin/users/new. Show the browser rejection, remove pattern from the username input in DevTools Elements, then submit again. Version 1 accepted it.

### Exact after-test

Repeat with a new invalid name, for example lab!demo_v2, after removing pattern. Then submit a valid unique name such as lab_demo_v2 with a valid role and password.

### Expected VERSION 2 result

Invalid input returns **Gebruik voor de gebruikersnaam 3 tot 30 letters, cijfers of underscores.** and creates no row. The valid name is created and appears in the user list.

### Video script

In versie 1 vertrouwde ik op het pattern-attribuut van het formulier. Dat kon ik met DevTools verwijderen, waarna een ongeldige gebruikersnaam toch werd opgeslagen. In de addUser-actie in app/actions.ts controleer ik nu hetzelfde formaat op de server. De naam moet uit drie tot dertig letters, cijfers of underscores bestaan. Ik verwijder het browserpattern opnieuw, maar de server weigert de naam nu alsnog. Een geldige naam wordt wel opgeslagen, dus normaal gebruik blijft mogelijk.

## Vulnerability 4 — Old sessions usable after logout

### Version 1 behaviour

Logout removed only school_session from the browser. The matching MySQL session remained active, so restoring the copied cookie restored access until its existing expiry time.

### Version 2 behaviour

Logout reads the active cookie token, awaits deletion of the matching database session and only then removes the cookie. Restoring that old token no longer finds a valid session. If database deletion fails, the action does not claim logout succeeded.

### File changed

- `app/actions.ts`
- `lib/repository.ts`
- `lib/repository.ts`

### Exact line numbers

- [app/actions.ts:34–40](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/app/actions.ts:34>): lines 34–40.
- [lib/repository.ts:93–94](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/lib/repository.ts:93>): lines 93–94.
- [lib/repository.ts:87–91](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/lib/repository.ts:87>): lines 87–91.

These are final Version 2 line numbers, calculated from the saved files after the code edits.

### BEFORE code

**app/actions.ts (captured Version 1 source)**

```ts
export async function logout() {
  const jar = await cookies();
  // SECURITY VERSION 2: invalidate the active server side session on logout
  // Lab baseline: the saved token still works until its existing eight-hour expiry.
  jar.delete(SESSION_COOKIE);
  redirect("/login");
```

### AFTER code

[app/actions.ts:34–40](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/app/actions.ts:34>)

```ts
export async function logout() {
  const jar = await cookies();
  // Revoke the server session first; if deletion fails, do not report a successful logout.
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  jar.delete(SESSION_COOKIE);
  redirect("/login");
```

[lib/repository.ts:93–94](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/lib/repository.ts:93>)

```ts
export async function deleteSession(token: string) {
  await write("logout", "DELETE FROM sessions WHERE session_id = ?", [token]);
```

[lib/repository.ts:87–91](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/lib/repository.ts:87>)

```ts
export async function sessionUser(token: string) {
  const [user] = await rows<{ id: number; username: string; role: string }>("session",
    "SELECT u.id, u.username, r.name AS role FROM sessions s JOIN users u ON u.id = s.user_id JOIN roles r ON r.id = u.role_id WHERE s.session_id = ? AND s.expires_at > ? LIMIT 1",
    [token, new Date()]);
  return user ? { ...user, role: roleName(user.role) } : null;
```

### What changed

The existing deleteSession helper is now actually called during logout. Its DELETE is awaited before cookie deletion; the unchanged session lookup cannot authenticate a token whose database row has been removed.

### Why this fixes the vulnerability

A browser cookie is only a reference to server-side state. Invalidating that state prevents replay, even if someone retained the old cookie value. Deleting just the browser copy cannot provide that guarantee.

### Exact before-test

1. Log in as student1 and copy the school_session value privately from browser storage.
2. Log out.
3. Restore the cookie on the same host/protocol with Path /.
4. Open /student/1. Version 1 allowed access again.

### Exact after-test

Perform exactly those four steps with a fresh Version 2 login. Do not paste the token into the report or video notes. Optionally verify privately in MySQL that the active session row was removed.

### Expected VERSION 2 result

After logout, restoring the cookie still redirects the protected page to /login. A fresh login works and creates a new session. Other users’ sessions are not deleted.

### Video script

Een sessie bestaat niet alleen uit de cookie in mijn browser. In versie 1 verwijderde logout die cookie, maar bleef de sessie in MySQL geldig. In app/actions.ts lees ik nu eerst het token uit en verwijder ik de bijbehorende serversessie. Pas als dat gelukt is, wordt de cookie gewist. Ik plak daarna dezelfde oude cookie terug en probeer mijn studentpagina te openen. Ik kom nu weer op het inlogscherm, omdat de server het oude token niet meer accepteert.

## Vulnerability 5 — SQL Injection in student search

### Version 1 behaviour

searchStudentsUnsafeV1 inserted the raw search string directly into an SQL statement. A quote and OR condition could close the name filter and make the database return all students.

### Version 2 behaviour

The renamed searchStudents function uses execute through the existing rows helper. The SQL contains LIKE ? and the partial-search value is passed separately. Normal partial matching remains available.

### File changed

- `lib/repository.ts`
- `components/records.tsx`

### Exact line numbers

- [lib/repository.ts:97–102](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/lib/repository.ts:97>): lines 97–102.
- [components/records.tsx:17–18](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/components/records.tsx:17>): lines 17–18.

These are final Version 2 line numbers, calculated from the saved files after the code edits.

### BEFORE code

**lib/repository.ts (captured Version 1 source)**

```ts
// Isolated local-lab SQL injection point. All other queries retain bound values.
export async function searchStudentsUnsafeV1(search: string): Promise<Student[]> {
  // SECURITY VERSION 2: replace string concatenation with a parameterised query
  const sql = "SELECT " + studentColumns + " FROM students WHERE CONCAT(first_name, ' ', last_name) LIKE '%" + search + "%' ORDER BY id";
  try {
    const [result] = await getDb().query<RowDataPacket[]>(sql);
    return result as Student[];
  } catch (error) {
    logDatabaseError("student-search-v1", error);
    throw new DatabaseUnavailableError();
  }
}
```

### AFTER code

[lib/repository.ts:97–102](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/lib/repository.ts:97>)

```ts
// The statement and search value are sent separately; input cannot change SQL syntax.
export async function searchStudents(search: string): Promise<Student[]> {
  return rows<Student>("student-search",
    "SELECT " + studentColumns + " FROM students WHERE CONCAT(first_name, ' ', last_name) LIKE ? ORDER BY id",
    [`%${search}%`]);
}
```

[components/records.tsx:17–18](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/components/records.tsx:17>)

```tsx
export async function StudentTable({ search = "" }: { search?: string }) {
  const students = search ? await searchStudents(search) : await listStudents();
```

### What changed

Removed the unsafe query call and replaced interpolation of user input with a bound parameter. Updated the sole component caller to the safe function name. The SELECT column list remains a constant, not user input.

### Why this fixes the vulnerability

The database receives statement structure separately from the value, so quotes, OR and comments in the submitted value cannot become SQL instructions. LIKE wildcard semantics are retained for search; that does not allow the input to alter SQL syntax.

### Exact before-test

As teacher1, search zz_no_match, then search `zz_no_match%' OR 1=1 -- ` with a trailing space. Version 1 returned no rows for the first input and all students for the second.

### Exact after-test

Repeat both exact searches in the same teacher form after deployment. Also search a normal partial name that exists, such as Student or part of an actual lab surname.

### Expected VERSION 2 result

The injected text is handled as a search value and does not reveal all records. With the existing demonstration data, both zz_no_match inputs yield no rows, while a real partial name still matches.

### Video script

De zoekfunctie bouwde in versie 1 de SQL-query op door tekst aan elkaar te plakken. Daardoor kon mijn zoekinvoer onderdeel worden van de SQL-instructie. In lib/repository.ts gebruik ik nu een vraagteken in de query en geef ik de zoekwaarde apart mee. De functie heet daarom ook niet meer UnsafeV1. Dezelfde invoer met OR 1=1 verandert nu de query niet meer en geeft bij deze test geen resultaten. Een gewone zoekopdracht op een deel van een naam blijft wel werken.

## Vulnerability 6 — Plain-text password storage

### Version 1 behaviour

Login directly compared the submitted password with users.password, and user creation inserted the submitted password unchanged. Anyone inspecting the lab database could read those values; existing accounts had no hash metadata or migration step.

### Version 2 behaviour

New users get a salted bcrypt hash before insertion, and login verifies the submitted password with bcrypt.compare. Existing accounts require the explicit preview/apply migration; login never falls back to plaintext. Original passwords still work after successful migration.

### File changed

- `app/actions.ts`
- `lib/repository.ts`
- `lib/passwords.cjs`
- `app/actions.ts`
- `scripts/migrate-passwords.cjs`
- `scripts/migrate-passwords.cjs`
- `package.json`
- `package.json`

### Exact line numbers

- [app/actions.ts:18–23](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/app/actions.ts:18>): lines 18–23.
- [lib/repository.ts:58–64](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/lib/repository.ts:58>): lines 58–64.
- [lib/passwords.cjs:1–19](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/lib/passwords.cjs:1>): lines 1–19.
- [app/actions.ts:53–57](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/app/actions.ts:53>): lines 53–57.
- [scripts/migrate-passwords.cjs:4–36](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/scripts/migrate-passwords.cjs:4>): lines 4–36.
- [scripts/migrate-passwords.cjs:43–70](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/scripts/migrate-passwords.cjs:43>): lines 43–70.
- [package.json:12–12](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/package.json:12>): lines 12–12.
- [package.json:16–16](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/package.json:16>): lines 16–16.

These are final Version 2 line numbers, calculated from the saved files after the code edits.

### BEFORE code

**app/actions.ts (captured Version 1 source)**

```ts
    // SECURITY VERSION 2: replace plain text passwords with secure password hashing
    if (user.password !== password) return { error: "Onjuist wachtwoord." };
    const session = await createSession(user.id);
```

**lib/repository.ts (captured Version 1 source)**

```ts
export async function createUser(input: Omit<User, "id">) {
  if (await findLoginUser(input.username)) return false;
  try {
    await getDb().execute("INSERT INTO users (username, password, role_id) VALUES (?, ?, ?)",
      [input.username, input.password, input.role_id]);
    return true;
```

### AFTER code

[app/actions.ts:18–23](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/app/actions.ts:18>)

```ts
    const user = await findLoginUser(username);
    // SECURITY VERSION 2: use one generic authentication error message
    if (!user) return { error: "Gebruiker niet gevonden." };
    // Accept only migrated bcrypt hashes; no plaintext fallback.
    if (!await verifyPassword(password, user.password)) return { error: "Onjuist wachtwoord." };
    const session = await createSession(user.id);
```

[lib/repository.ts:58–64](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/lib/repository.ts:58>)

```ts
export async function createUser(input: Omit<User, "id">) {
  if (await findLoginUser(input.username)) return false;
  const passwordHash = await hashPassword(input.password);
  try {
    await getDb().execute("INSERT INTO users (username, password, role_id) VALUES (?, ?, ?)",
      [input.username, passwordHash, input.role_id]);
    return true;
```

[lib/passwords.cjs:1–19](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/lib/passwords.cjs:1>)

```ts
const bcrypt = require("bcryptjs");

// Shared by the server and the explicit migration; never accepts plaintext as a hash.
const PASSWORD_COST = 12;
function isPasswordHash(value) {
  return typeof value === "string" && value.length === 60 && /^\$2[ab]\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$/.test(value);
}
function validPasswordLength(password) {
  return typeof password === "string" && password.length > 0 && Buffer.byteLength(password, "utf8") <= 72;
}
async function hashPassword(password) {
  if (!validPasswordLength(password)) throw new Error("PASSWORD_LENGTH_INVALID");
  return bcrypt.hash(password, PASSWORD_COST);
}
async function verifyPassword(password, storedHash) {
  if (!validPasswordLength(password) || !isPasswordHash(storedHash)) return false;
  return bcrypt.compare(password, storedHash);
}
module.exports = { PASSWORD_COST, isPasswordHash, validPasswordLength, hashPassword, verifyPassword };
```

[scripts/migrate-passwords.cjs:4–36](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/scripts/migrate-passwords.cjs:4>)

```ts
async function migratePasswords(db, { apply = false } = {}) {
  const [[table]] = await db.execute(
    "SELECT ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'");
  const [[column]] = await db.execute(
    "SELECT CHARACTER_MAXIMUM_LENGTH AS capacity FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password'");
  if (table?.engine !== "InnoDB") throw new Error("USERS_MUST_SUPPORT_TRANSACTIONS");
  if (!column || Number(column.capacity) < 60) throw new Error("PASSWORD_COLUMN_REQUIRES_AT_LEAST_60_CHARACTERS");

  await db.beginTransaction();
  try {
    const [users] = await db.execute("SELECT id, password FROM users ORDER BY id FOR UPDATE");
    let skipped = 0;
    const pending = [];
    // Validate every row before modifying any row. Never log passwords or hashes.
    for (const user of users) {
      if (isPasswordHash(user.password)) { skipped++; continue; }
      if (typeof user.password !== "string" || user.password.startsWith("$2")) {
        throw new Error("UNRECOGNISED_PASSWORD_FORMAT");
      }
      if (!validPasswordLength(user.password)) throw new Error("LEGACY_PASSWORD_LENGTH_INVALID");
      pending.push(user);
    }
    if (apply) {
      for (const user of pending) {
        const passwordHash = await hashPassword(user.password);
        const [result] = await db.execute("UPDATE users SET password = ? WHERE id = ?", [passwordHash, user.id]);
        if (result.affectedRows !== 1) throw new Error("PASSWORD_UPDATE_FAILED");
      }
      await db.commit();
    } else {
      await db.rollback();
    }
    return { pending: pending.length, skipped, applied: apply };
```

### What changed

Added bcryptjs with cost 12, a shared hashing/verification helper, hashed insertion and a transactional migration. Inputs over bcrypt’s 72-byte limit are rejected rather than silently truncated. Existing recognised hashes are skipped on rerun; no database structure changes are made automatically.

### Why this fixes the vulnerability

A salted password hash is used for verification without storing the readable original password. Bcrypt deliberately makes each password guess more expensive; a salt means equal passwords need not produce identical stored values. This does not replace least privilege or other controls outside this task.

### Exact before-test

Inspect fictitious lab records with SELECT username, password FROM users; and show readable values. Log in with the known original password. Create a lab account as admin and observe its readable stored password in Version 1.

### Exact after-test

1. Stop the portal and take the lab backup/snapshot.
2. Run the deployment and migration commands at the top of this report.
3. Inspect the same users/password query: values should now be 60-character bcrypt strings, normally beginning with $2b$12$.
4. Log in as student1, teacher1 and admin1 using their original passwords, not hashes.
5. As admin1, create a valid new account, verify its stored value is a hash, and log in with its original password.
6. Rerun the preview; already-hashed accounts must be skipped.

### Expected VERSION 2 result

No readable passwords remain among successfully migrated rows. All original account passwords still verify, incorrect passwords fail, and new accounts store hashes immediately. A second migration does not hash hashes again. These live outcomes are expected, not claimed verified from this unreachable database.

### Video script

In versie 1 stonden de wachtwoorden leesbaar in de database en vergeleek ik ze rechtstreeks bij het inloggen. Ik heb nu bcrypt toegevoegd, met de gedeelde functies in lib/passwords.cjs. Bij het toevoegen van een gebruiker slaat lib/repository.ts alleen de hash op, en de loginactie gebruikt bcrypt om het ingevoerde wachtwoord te controleren. Voor bestaande gebruikers heb ik een apart migratiescript gemaakt dat eerst een preview geeft en bestaande hashes overslaat. Na het toepassen zie ik hashes in de database, maar kan ik nog steeds inloggen met de oorspronkelijke wachtwoorden. Daarmee toon ik zowel de bescherming van de opslag als het behoud van de normale functionaliteit aan.

## Password implementation references

The bcryptjs API and 72-byte limit are documented in [the bcryptjs project documentation](https://github.com/dcodeIO/bcrypt.js). Cost 12 exceeds OWASP’s bcrypt minimum work factor of 10; see [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Bcrypt was chosen to match this task’s preference. These references do not imply that the entire portal has undergone a complete security audit.

## Changed-file inventory

- Application: `app/actions.ts`, `app/admin/users/page.tsx`, `components/records.tsx`, `lib/repository.ts`.
- Added: `lib/passwords.cjs`, `scripts/migrate-passwords.cjs`, this guide.
- Dependency/commands: `package.json`, `package-lock.json`.
- Verification/documentation: `tests/database.test.cjs`, `README.md`, `ACCEPTANCE.md`.
- Browser forms, styling, routes, connection settings and other source files are unchanged.

## Final summary table

| Vulnerability | Version 1 | Version 2 | File | Final lines | Video test |
|---|---|---|---|---|---|
| Student ownership | URL ID selected any record | Foreign record denied | [components/records.tsx:43–51](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/components/records.tsx:43>) | 43–51 | /student/1 → /student/2 |
| Admin overview | Any logged-in role could read users | Administrator required | [app/admin/users/page.tsx:4–8](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/app/admin/users/page.tsx:4>) | 4–8 | student1 opens /admin/users |
| Username validation | Browser pattern only | Server allowlist and length | [app/actions.ts:43–60](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/app/actions.ts:43>) | 43–60 | Remove pattern; submit lab!demo_v2 |
| Logout replay | Cookie cleared; DB session survived | DB session deleted before cookie | [app/actions.ts:34–40](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/app/actions.ts:34>) | 34–40 | Restore saved cookie after logout |
| Student search SQLi | Concatenated SQL input | Bound LIKE parameter | [lib/repository.ts:97–102](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/lib/repository.ts:97>) | 97–102 | Repeat zz_no_match%' OR 1=1 -- (trailing space) |
| Password storage | Plaintext storage/comparison | Bcrypt insert/verify; explicit migration | [lib/passwords.cjs:1–19](<C:/Users/Layla/OneDrive/Pictures/Documents/ChatGPT/figma/security-playground/lib/passwords.cjs:1>) | 1–19 | Inspect hashes; log in with original passwords |

Password call sites and migration also have exact ranges in vulnerability 6 above; they are part of the same fix. The SQLi row’s trailing space is specified in the detailed test. Repeat all six on the reachable lab before recording a claim of live acceptance.
