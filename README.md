# Security Playground — Version 2

The existing Next.js/MySQL portal now fixes the six requested Version 1 issues. Routes, styling, infrastructure, database grants, cookie settings and distinct login error messages remain unchanged.

Read **[SECURITY_VERSION_2_VIDEO_GUIDE.md](SECURITY_VERSION_2_VIDEO_GUIDE.md)** for the complete before/after report, final source line references, six recording scripts and migration instructions. `VIDEO_TESTS.md` is retained as the historical Version 1 recording plan; its vulnerable outcomes no longer describe these six Version 2 behaviours.

## Deploy on SRV WEB01

Use the existing project directory and existing server-side environment configuration. Stop the portal service and take a private lab/database backup or VM snapshot before migration. Do not commit that backup. Then run:

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

If a service manager normally runs the portal, restart that service instead of starting a second `npm start` process. No service name is assumed here. The existing loopback binding and reverse proxy remain unchanged.

`migrate:passwords` without arguments is a preview. `--apply` hashes existing plaintext passwords inside a transaction; existing recognised bcrypt hashes are skipped. Repeating the preview afterwards should report zero passwords to migrate. No migration is performed on application startup. Login rejects unmigrated plaintext: run the explicit migration before making Version 2 available to users.

The migration requires an InnoDB `users` table and a `password` column holding at least 60 characters. It does not alter the schema. If capacity is too short, enlarge only that column (typically VARCHAR(255), preserving its other attributes) after checking the existing definition and taking a backup, then rerun the preview. Empty or over-72-byte legacy passwords and unrecognised `$2` formats cause an abort before any row is updated. Review those exceptions manually instead of silently truncating or double-hashing them. The script prints counts/error codes, never passwords, hashes or tokens. A fully bcrypt-shaped legacy plaintext is indistinguishable from a stored hash without separate metadata: review any unexpected skipped count against your known lab dataset.

## Changes

- `components/records.tsx`: server-side student ownership check; uses the renamed safe search function.
- `app/admin/users/page.tsx`: requires Administrator before loading users.
- `app/actions.ts`: server-side username allowlist, session deletion before cookie deletion, bcrypt verification.
- `lib/repository.ts`: parameterised student search and password hashing before user insertion.
- `lib/passwords.cjs`: shared bcryptjs helper, cost 12, explicit 72-byte limit.
- `scripts/migrate-passwords.cjs`: preview/apply password migration with preflight and rollback.
- `package.json`, `package-lock.json`: bcryptjs dependency and migration command.
- `tests/database.test.cjs`: regression tests for the six fixes and migration.

The runtime still reads/writes MySQL via the existing environment-based connection. No JSON fallback, ORM, new topology, grants, firewall rules or unrelated features were introduced. Username enumeration, cookie hardening and the existing framework advisory remain out of this six-fix scope.

## Validation

`npm run test:db`: 24 passing tests (actual hashing, simulated database I/O). `npm run build`: passed; Next.js emitted its existing dependency security advisory. Dependency upgrades beyond bcryptjs were not performed.

The live read-only database check timed out (`ETIMEDOUT`) from this computer on 28 October 2026. No live MySQL migration or account login has been claimed. Complete the after-tests from the video guide on SRV WEB01 after migration.
