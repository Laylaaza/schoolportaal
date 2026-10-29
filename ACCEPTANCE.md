# Version 2 acceptance — 28 October 2026

## Executed locally

- `npm run test:db`: 24 tests passed.
- `npm run build`: compilation, TypeScript, page generation and final build passed. Existing Next.js dependency advisory was reported; no unrelated framework upgrade performed.
- Student record ownership checked in the actual server component: own record allowed, other/unlinked/missing records denied; teacher detail access preserved.
- Actual admin route uses the real auth helper with simulated sessions: anonymous, student and teacher denied; Administrator allowed.
- Add-user action rejects invalid formats and lengths before insert, including removal of browser validation; valid input remains accepted.
- Logout deletes the server session before clearing the cookie; simulated replay redirects to login. A database deletion failure does not claim success.
- Search SQL is invariant for normal and malicious-looking input; term is sent separately to execute.
- Real bcryptjs tests: original passwords verify, wrong/plaintext values fail, new user insert stores a hash, over-72-byte passwords are rejected rather than truncated.
- Migration: dry-run changes nothing, apply hashes plaintext, rerun skips hashes, short columns/invalid rows abort, write failure rolls back all rows.

## Not verified live

`npm run db:check` returned ETIMEDOUT from this computer. No live migration was applied. Tests mock database responses and do not prove actual MySQL connectivity, schema compatibility or current lab account contents.

## Server checklist

Follow `SECURITY_VERSION_2_VIDEO_GUIDE.md`: stop service, snapshot/backup, install, db:check, tests/build, preview migration, explicit apply, confirm zero remaining plaintext candidates, restart service. Repeat the same six Version 1 video tests. Confirm normal student/teacher/admin logins with their original passwords, teacher partial-name search, valid new user creation, and logout/replay rejection.

Database grants, network topology and firewall were not changed. The historical Version 1 test document is retained only for comparison.
