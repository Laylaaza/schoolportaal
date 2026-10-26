const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the actual TypeScript modules with a fake driver; no live database is modified.
function load(file, dependencies) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require(name) {
    if (name === 'server-only') return {};
    if (name in dependencies) return dependencies[name];
    if (name === 'node:crypto') return require(name);
    throw new Error('Unexpected dependency: ' + name);
  }, console, Date });
  return module.exports;
}
class DatabaseUnavailableError extends Error {}
function repository(execute, logs = []) {
  return load('lib/repository.ts', { './db': {
    getDb: () => ({ execute }), DatabaseUnavailableError,
    logDatabaseError: (operation) => logs.push(operation),
  } });
}
for (const [stored, expected] of [['student','Student'],['teacher','Teacher'],['admin','Administrator']]) {
  test('database role ' + stored + ' maps to existing UI role', async () => {
    const repo = repository(async (sql, values) => {
      assert.match(sql, /JOIN roles/); assert.match(sql, /username = \?/);
      assert.equal(values[0], 'database-user');
      return [[{ id: 42, username: 'database-user', password: 'database-password', role_id: 7, role: stored }]];
    });
    const user = await repo.findLoginUser('database-user');
    assert.equal(user.role, expected); assert.equal(user.password, 'database-password');
  });
}
test('unknown user and missing student return no record', async () => {
  const repo = repository(async () => [[]]);
  assert.equal(await repo.findLoginUser('missing'), null);
  assert.equal(await repo.findStudent(999), undefined);
});
test('student ownership relationship and deliberate ID lookup remain distinct', async () => {
  const sqls = [];
  const repo = repository(async (sql, values) => { sqls.push(sql); assert.equal(values[0], 2); return [[]]; });
  await repo.findOwnStudent(2); await repo.findStudent(2);
  assert.match(sqls[0], /WHERE user_id = \?/);
  assert.match(sqls[1], /WHERE id = \?/);
  assert.doesNotMatch(sqls[1], /AND user_id/);
});
test('session persists UUID and eight-hour expiry, checks expiry and revokes token', async () => {
  const calls = [];
  const repo = repository(async (sql, values) => { calls.push({sql, values}); return sql.startsWith('SELECT') ? [[]] : [{insertId:9, affectedRows:1}]; });
  const session = await repo.createSession(42);
  assert.equal(session.user_id,42);
  assert.match(session.session_id,/^[a-f0-9-]{36}$/);
  assert.equal(Date.parse(session.expires_at)-Date.parse(session.created_at),8*60*60*1000);
  await repo.sessionUser(session.session_id); await repo.deleteSession(session.session_id);
  assert.match(calls[1].sql,/expires_at > \?/);
  assert.match(calls[2].sql,/DELETE FROM sessions/);
  assert.equal(calls[2].values[0],session.session_id);
});
test('raw database errors are replaced with safe errors', async () => {
  const logs=[];
  const repo=repository(async()=> { throw new Error('raw SQL and secret credentials'); },logs);
  await assert.rejects(repo.listStudents(),DatabaseUnavailableError);
  assert.deepEqual(logs,['students']);
});
test('create-user binds submitted values and handles duplicate keys', async () => {
  const repo=repository(async(sql,values)=> {
    if(sql.startsWith('SELECT')) return [[]];
    assert.match(sql,/VALUES \(\?, \?, \?\)/);
    assert.equal(values[0],"name'quoted");
    throw {code:'ER_DUP_ENTRY'};
  });
  assert.equal(await repo.createUser({username:"name'quoted",password:'plain',role_id:1}),false);
});
function actions(user, unavailable=false) {
  const cookieWrites=[];
  const redirect=(url)=> {throw Object.assign(new Error('redirect'),{redirect:url});};
  const action=load('app/actions.ts', {
    'next/headers':{cookies:async()=>({set:(...args)=>cookieWrites.push(args)})},
    'next/navigation':{redirect}, 'next/cache':{revalidatePath:()=>{}},
    '@/lib/auth':{SESSION_COOKIE:'school_session'},
    '@/lib/db':{DatabaseUnavailableError},
    '@/lib/roles':{dashboard:{Student:'/student',Teacher:'/teacher',Administrator:'/admin'}},
    '@/lib/repository':{
      findLoginUser:async()=>{if(unavailable)throw new DatabaseUnavailableError();return user;},
      createSession:async(id)=>({session_id:'test-session',expires_at:new Date(Date.now()+10000).toISOString()}),
    },
  });
  return {action,cookieWrites};
}
for(const [role,url] of [['Student','/student'],['Teacher','/teacher'],['Administrator','/admin']]) {
  test('login uses database password and redirects '+role,async()=>{
    const {action,cookieWrites}=actions({id:42,username:'custom',password:'from-database',role});
    const form=new FormData();form.set('username','custom');form.set('password','from-database');
    await assert.rejects(action.login({error:''},form),error=>error.redirect===url);
    assert.equal(cookieWrites.length,1);
  });
}
test('invalid credentials and connection failure produce simple form errors',async()=>{
  const form=new FormData();form.set('username','custom');form.set('password','wrong');
  for(const user of [null,{password:'correct'}]) {
    const {action,cookieWrites}=actions(user);
    const result=await action.login({error:''},form);
    assert.equal(result.error,'Gebruikersnaam of wachtwoord is onjuist.');assert.equal(cookieWrites.length,0);
  }
  const {action}=actions(null,true);
  assert.equal((await action.login({error:''},form)).error,'Inloggen is tijdelijk niet mogelijk. Probeer het later opnieuw.');
});
