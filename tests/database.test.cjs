const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const passwords = require('../lib/passwords.cjs');
const { migratePasswords } = require('../scripts/migrate-passwords.cjs');

// Load the actual modules, replacing only Next.js runtime and database I/O.
function load(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require(name) {
    if (name === 'server-only') return {};
    if (name in dependencies) return dependencies[name];
    if (name.endsWith('/passwords.cjs')) return passwords;
    if (name === 'node:crypto' || name === 'react/jsx-runtime') return require(name);
    throw new Error('Unexpected dependency: ' + name);
  }, console, Date });
  return module.exports;
}
class DatabaseUnavailableError extends Error {}
function repository(execute, logs = []) {
  return load('lib/repository.ts', { './db': {
    getDb: () => ({ execute }), DatabaseUnavailableError,
    logDatabaseError: operation => logs.push(operation),
  } });
}
function redirect(url) { throw Object.assign(new Error('redirect'), { redirect: url }); }
function makeAuth(identity, token = 'saved-token', repo) {
  return load('lib/auth.ts', {
    'next/headers': { cookies: async () => ({ get: () => token ? { value: token } : undefined }) },
    'next/navigation': { redirect },
    './repository': repo || { sessionUser: async () => identity },
    './roles': { dashboard: { Student: '/student', Teacher: '/teacher', Administrator: '/admin' } },
  });
}
function actions({ repo = {}, auth = makeAuth({ id: 3, role: 'Administrator' }), jar = {} } = {}) {
  return load('app/actions.ts', {
    'next/headers': { cookies: async () => ({ set() {}, ...jar }) },
    'next/navigation': { redirect }, 'next/cache': { revalidatePath() {} },
    '@/lib/auth': { ...auth, SESSION_COOKIE: 'school_session' },
    '@/lib/db': { DatabaseUnavailableError },
    '@/lib/roles': { dashboard: { Student: '/student', Teacher: '/teacher', Administrator: '/admin' } },
    '@/lib/repository': repo,
  });
}
function form(values) { const result = new FormData(); for (const [key, value] of Object.entries(values)) result.set(key, value); return result; }
const commonHash = passwords.hashPassword('OriginalDemo123');

for (const [stored, expected] of [['student', 'Student'], ['teacher', 'Teacher'], ['admin', 'Administrator']]) {
  test('MySQL role ' + stored + ' maps to existing UI role', async () => {
    const repo = repository(async (sql, values) => {
      assert.match(sql, /JOIN roles/); assert.match(sql, /username = \?/); assert.equal(values[0], 'database-user');
      return [[{ id: 42, username: 'database-user', password: await commonHash, role_id: 7, role: stored }]];
    });
    assert.equal((await repo.findLoginUser('database-user')).role, expected);
  });
}
for (const [role, url] of [['Student', '/student'], ['Teacher', '/teacher'], ['Administrator', '/admin']]) {
  test('original password logs in after hashing: ' + role, async () => {
    const writes = [];
    const action = actions({ repo: {
      findLoginUser: async () => ({ id: 1, username: 'demo', password: await commonHash, role }),
      createSession: async () => ({ session_id: 'test-token', expires_at: new Date(Date.now() + 10000).toISOString() }),
    }, jar: { set: (...args) => writes.push(args) } });
    await assert.rejects(action.login({}, form({ username: 'demo', password: 'OriginalDemo123' })), e => e.redirect === url);
    assert.equal(writes.length, 1);
  });
}
test('wrong passwords and unmigrated plaintext never create sessions', async () => {
  for (const stored of [await commonHash, 'OriginalDemo123']) {
    let sessions = 0;
    const action = actions({ repo: { findLoginUser: async () => ({ password: stored }), createSession: async () => sessions++ } });
    const result = await action.login({}, form({ username: 'demo', password: stored === 'OriginalDemo123' ? stored : 'wrong' }));
    assert.equal(result.error, 'Onjuist wachtwoord.'); assert.equal(sessions, 0);
  }
});
test('database failures stay generic; unrelated distinct username error stays unchanged', async () => {
  const absent = actions({ repo: { findLoginUser: async () => null } });
  assert.equal((await absent.login({}, form({ username: 'missing', password: 'x' }))).error, 'Gebruiker niet gevonden.');
  const unavailable = actions({ repo: { findLoginUser: async () => { throw new DatabaseUnavailableError(); } } });
  assert.equal((await unavailable.login({}, form({ username: 'demo', password: 'x' }))).error, 'Inloggen is tijdelijk niet mogelijk. Probeer het later opnieuw.');
});

function records(auth, student) {
  return load('components/records.tsx', {
    'next/link': { default: 'a', __esModule: true }, 'next/navigation': { notFound() { throw new Error('NOT_FOUND'); } },
    '@/app/actions': {}, '@/lib/auth': auth,
    '@/lib/repository': { findStudent: async () => student },
    '@/lib/roles': { dashboard: { Student: '/student', Teacher: '/teacher' } }, './shell': { Shell: 'shell' },
  });
}
test('student own record allowed, other or unlinked records denied server-side', async () => {
  const auth = makeAuth({ id: 1, username: 'student1', role: 'Student' });
  const owned = { id: 1, user_id: 1 };
  assert.equal((await records(auth, owned).StudentDetail({ id: '1' })).props.user.id, 1);
  for (const student of [{ id: 2, user_id: 2 }, { id: 3, user_id: null }, undefined]) {
    await assert.rejects(records(auth, student).StudentDetail({ id: '2' }), /NOT_FOUND/);
  }
});
test('teacher detail access remains allowed; student cannot use teacher route to bypass ownership', async () => {
  const student = { id: 2, user_id: 2 };
  await records(makeAuth({ id: 9, role: 'Teacher' }), student).StudentDetail({ id: '2', teacher: true });
  await assert.rejects(records(makeAuth({ id: 1, role: 'Student' }), student).StudentDetail({ id: '2', teacher: true }), e => e.redirect === '/student');
  await assert.rejects(records(makeAuth(null, null), student).StudentDetail({ id: '2' }), e => e.redirect === '/login');
});
for (const [identity, destination] of [[null, '/login'], [{ id: 1, role: 'Student' }, '/student'], [{ id: 2, role: 'Teacher' }, '/teacher']]) {
  test('admin overview denies ' + (identity?.role || 'anonymous'), async () => {
    const page = load('app/admin/users/page.tsx', { '@/lib/auth': makeAuth(identity), '@/components/shell': { Shell: 'shell' }, '@/components/records': { UserTable: 'users' } });
    await assert.rejects(page.default(), e => e.redirect === destination);
  });
}
test('admin overview retains management controls', async () => {
  const page = load('app/admin/users/page.tsx', { '@/lib/auth': makeAuth({ id: 3, role: 'Administrator' }), '@/components/shell': { Shell: 'shell' }, '@/components/records': { UserTable: 'users' } });
  assert.equal((await page.default()).props.children.props.canManage, true);
});
test('username format/length rejected before insertion, even without browser validation', async () => {
  let writes = 0;
  const action = actions({ repo: { listRoles: async () => [{ id: 1 }], createUser: async () => { writes++; return true; } } });
  for (const username of ['lab!demo', 'ab', 'a'.repeat(31), 'abc\n', ' abc', 'ééé', '']) {
    assert.ok((await action.addUser({}, form({ username, password: 'valid', role_id: '1' }))).error);
  }
  assert.equal(writes, 0);
  await assert.rejects(action.addUser({}, form({ username: 'lab_demo1', password: 'valid', role_id: '1' })), e => e.redirect === '/admin/users');
  assert.equal(writes, 1);
});
test('student cannot add users or change roles; admin role change still works', async () => {
  let writes = 0;
  const repo = { createUser: async () => writes++, updateRole: async () => writes++ };
  const student = actions({ auth: makeAuth({ id: 1, role: 'Student' }), repo });
  await assert.rejects(student.addUser({}, form({})), e => e.redirect === '/student');
  await assert.rejects(student.changeRole(form({})), e => e.redirect === '/student');
  assert.equal(writes, 0);
  await assert.rejects(actions({ repo }).changeRole(form({ user_id: '1', role_id: '1' })), e => e.redirect === '/admin/users');
  assert.equal(writes, 1);
});
test('new user insertion stores a bcrypt hash and original password verifies', async () => {
  let saved;
  const repo = repository(async (sql, values) => { if (sql.startsWith('SELECT')) return [[]]; saved = values; return [{ affectedRows: 1 }]; });
  assert.equal(await repo.createUser({ username: 'new_user', password: 'NewDemo123', role_id: 1 }), true);
  assert.notEqual(saved[1], 'NewDemo123'); assert.equal(await passwords.verifyPassword('NewDemo123', saved[1]), true);
});
test('password bounds prevent silent bcrypt truncation; malformed hashes are rejected', async () => {
  assert.equal(passwords.validPasswordLength('a'.repeat(72)), true);
  for (const value of ['', 'a'.repeat(73), 'é'.repeat(37)]) {
    await assert.rejects(passwords.hashPassword(value), /PASSWORD_LENGTH_INVALID/);
    assert.equal(await passwords.verifyPassword(value, await commonHash), false);
  }
  assert.equal(await passwords.verifyPassword('x', 'not-a-hash'), false);
});
test('search binds normal and SQL-looking input; SQL text stays identical', async () => {
  const queries = [];
  const repo = repository(async (sql, values) => { queries.push({ sql, values }); return [[]]; });
  const payload = "zz_no_match%' OR 1=1 -- ";
  for (const search of ['Student', 'zz_no_match', payload]) await repo.searchStudents(search);
  assert.match(queries[0].sql, /LIKE \?/);
  assert.equal(queries[0].sql, queries[2].sql);
  assert.ok(!queries[2].sql.includes(payload)); assert.equal(queries[2].values[0], '%' + payload + '%');
});
test('logout deletes database session before cookie; restoring token then fails auth', async () => {
  let active = true; const order = [];
  const repo = repository(async (sql, values) => {
    if (sql.startsWith('DELETE')) { assert.equal(values[0], 'saved-token'); active = false; order.push('database'); return [{ affectedRows: 1 }]; }
    assert.match(sql, /expires_at > \?/);
    return [active ? [{ id: 1, username: 'student1', role: 'student' }] : []];
  });
  const auth = makeAuth(null, 'saved-token', repo);
  assert.equal((await auth.requireUser()).username, 'student1');
  const action = actions({ repo, jar: { get: () => ({ value: 'saved-token' }), delete: () => order.push('cookie') } });
  await assert.rejects(action.logout(), e => e.redirect === '/login');
  assert.deepEqual(order, ['database', 'cookie']);
  await assert.rejects(auth.requireUser(), e => e.redirect === '/login');
});
test('failed session deletion does not falsely report successful logout', async () => {
  let cleared = false;
  const action = actions({ repo: { deleteSession: async () => { throw new DatabaseUnavailableError(); } }, jar: { get: () => ({ value: 'saved-token' }), delete: () => { cleared = true; } } });
  await assert.rejects(action.logout(), DatabaseUnavailableError); assert.equal(cleared, false);
});

// Transactional fake verifies migration flow, not actual MySQL execution.
function migrationDb(initial, { capacity = 255, failAt = 0 } = {}) {
  let committed = structuredClone(initial), working, writes = 0;
  return {
    values: () => committed,
    beginTransaction: async () => { working = structuredClone(committed); },
    commit: async () => { committed = working; }, rollback: async () => { working = undefined; },
    execute: async (sql, values) => {
      if (sql.includes('information_schema.TABLES')) return [[{ engine: 'InnoDB' }]];
      if (sql.includes('information_schema.COLUMNS')) return [[{ capacity }]];
      if (sql.startsWith('SELECT id')) return [structuredClone(working)];
      assert.match(sql, /UPDATE users SET password = \? WHERE id = \?/);
      if (++writes === failAt) throw new Error('SIMULATED_WRITE_FAILURE');
      working.find(u => u.id === values[1]).password = values[0]; return [{ affectedRows: 1 }];
    },
  };
}
test('migration dry-run changes nothing; apply hashes plaintext and rerun skips hashes', async () => {
  const hash = await commonHash;
  const db = migrationDb([{ id: 1, password: 'student1' }, { id: 2, password: hash }]);
  assert.deepEqual(await migratePasswords(db), { pending: 1, skipped: 1, applied: false });
  assert.equal(db.values()[0].password, 'student1');
  assert.deepEqual(await migratePasswords(db, { apply: true }), { pending: 1, skipped: 1, applied: true });
  assert.equal(await passwords.verifyPassword('student1', db.values()[0].password), true);
  assert.equal(db.values()[1].password, hash);
  assert.deepEqual(await migratePasswords(db, { apply: true }), { pending: 0, skipped: 2, applied: true });
});
test('migration preflight rejects short columns and invalid legacy values without writes', async () => {
  await assert.rejects(migratePasswords(migrationDb([{ id: 1, password: 'student1' }], { capacity: 20 }), { apply: true }), /PASSWORD_COLUMN/);
  for (const value of ['', 'a'.repeat(73), '$2b$broken']) {
    const db = migrationDb([{ id: 1, password: 'student1' }, { id: 2, password: value }]);
    await assert.rejects(migratePasswords(db, { apply: true })); assert.equal(db.values()[0].password, 'student1');
  }
});
test('migration rolls back every updated row if a later update fails', async () => {
  const initial = [{ id: 1, password: 'student1' }, { id: 2, password: 'teacher1' }];
  const db = migrationDb(initial, { failAt: 2 });
  await assert.rejects(migratePasswords(db, { apply: true }), /SIMULATED_WRITE_FAILURE/);
  assert.deepEqual(db.values(), initial);
});
