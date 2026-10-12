import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

// Real Postgres engine in WASM. pg_net and Vault are stubbed; nothing leaves the process.
const db = new PGlite()
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const sql = (query) => db.exec(query)
const rows = async (query) => (await db.query(query)).rows
let passed = 0
function check(name, actual, expected) {
  assert.deepEqual(actual, expected, name)
  passed++
  console.log(`PASS ${name}`)
}
async function as(n) {
  await sql('reset role')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [n ? uid(n) : ''])
  await sql(`set role ${n ? 'authenticated' : 'anon'}`)
}
const read = (file) => readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8')
const sent = async () => {
  await sql('reset role')
  return rows('select url, body from net.sent order by id')
}
const reset = () => sql('reset role; truncate net.sent')

try {
  await sql(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;

    -- pg_net stub: records requests instead of sending them.
    create schema net;
    create table net.sent(id serial primary key, url text, body jsonb);
    create table net.fail(on_ boolean);
    create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}',
      headers jsonb default '{}', timeout_milliseconds int default 5000) returns bigint
    language plpgsql as $$
    begin
      if exists (select 1 from net.fail where on_) then raise exception 'network down'; end if;
      insert into net.sent(url, body) values (url, body);
      return 1;
    end $$;
    -- Vault stub.
    create schema vault;
    create table vault.decrypted_secrets(name text primary key, decrypted_secret text);
  `)
  for (const file of [
    '20260608000000_init_biz.sql',
    '20260609000000_auth_orders_enroll.sql',
    '20260609000100_ebooks.sql',
    '20260619000100_ebook_reviews.sql',
    '20260621000000_review_ratings.sql',
    '20260624000000_review_author_trigger.sql',
    '20260613000000_settlements.sql',
    '20260806000000_withholding_tax.sql',
  ]) {
    await sql((await read(file)).split('-- ── 시드')[0])
  }
  await sql(await read('20261006025002_course_qna_notifications.sql'))
  const migration = (await read('20261012000000_telegram_ops_alerts.sql')).replace(
    'create extension if not exists pg_net;',
    '',
  )
  await sql(migration)
  await sql(migration)
  check('migration is repeatable', true, true)

  await sql(`
    insert into experts(id,name,title) values ('e1','김지도','교육');
    insert into courses(id,expert_id,title,category,price,qna_enabled) values ('c1','e1','주식 입문','투자',0,true);
    insert into auth.users(id,email) values ('${uid(1)}','student@example.invalid');
    insert into enrollments(user_id,item_type,item_id) values ('${uid(1)}','course','c1');
  `)

  // 1) Not configured → business insert succeeds, nothing sent.
  await sql(`insert into settlements(expert_id,amount,gross_amount,net_amount,withholding_amount)
             values ('e1',800000,1100000,773600,26400)`)
  check('unconfigured: settlement saved, no alert', (await sent()).length, 0)

  await sql(`insert into vault.decrypted_secrets values
    ('telegram_bot_token','123:ABC'),('telegram_chat_id','-100777'),('site_url','https://biz.example/')`)

  // 2) Settlement alert.
  await sql(`insert into settlements(expert_id,amount,gross_amount,net_amount,withholding_amount)
             values ('e1',1234567,1700000,1193827,40740)`)
  let [m] = await sent()
  check('settlement: bot API URL', m.url, 'https://api.telegram.org/bot123:ABC/sendMessage')
  check('settlement: chat id', m.body.chat_id, '-100777')
  assert.match(m.body.text, /정산 신청/)
  assert.match(m.body.text, /김지도/)
  assert.match(m.body.text, /1,234,567원/)
  assert.match(m.body.text, /실지급액: 1,193,827원 \(원천징수 40,740원\)/)
  assert.match(m.body.text, /https:\/\/biz\.example\/admin$/)
  check('settlement: message content', true, true)

  // 3) Student question — alert has no question body or student info.
  await reset()
  await as(1)
  const [q] = await rows(
    "insert into course_questions(course_id,content) values ('c1','제 계좌번호는 비밀입니다') returning id",
  )
  ;[m] = await sent()
  assert.match(m.body.text, /새 강의 질문 \(비공개\)/)
  assert.match(m.body.text, /주식 입문/)
  assert.ok(!m.body.text.includes('계좌번호'), 'question body leaked')
  assert.ok(!m.body.text.includes('student@'), 'student email leaked')
  assert.ok(m.body.text.endsWith(`/expert/dashboard?expert=e1&tab=qna&question=${q.id}`))
  check('question: alert without body, deep link', true, true)

  // 4) Course review.
  await reset()
  await as(1)
  await sql("insert into course_reviews(id,course_id,user_name,content,rating) values ('r1','c1','x','후기 본문',5)")
  ;[m] = await sent()
  assert.match(m.body.text, /새 강의 리뷰 \(별점 5\)/)
  assert.ok(!m.body.text.includes('후기 본문'), 'review body leaked')
  assert.ok(m.body.text.endsWith('/expert/dashboard?expert=e1&tab=reviews&review=r1'))
  check('review: alert without body, deep link', true, true)

  // 5) Telegram/pg_net failure never blocks the original write.
  await reset()
  await sql('insert into net.fail values (true)')
  await sql(`insert into settlements(expert_id,amount,gross_amount) values ('e1',1000,1400)`)
  check(
    'failure: settlement still saved',
    (await rows("select count(*)::int as n from settlements where amount=1000"))[0].n,
    1,
  )
  await sql('truncate net.fail')

  // 6) Rolled-back insert sends nothing (pg_net queue is transactional).
  await reset()
  await sql(`begin; insert into settlements(expert_id,amount,gross_amount) values ('e1',5,5); rollback;`)
  check('rollback: no alert', (await sent()).length, 0)

  // 7) Clients cannot call the sender or read secrets.
  for (const n of [0, 1]) {
    await as(n)
    let error
    try {
      await sql("select ops_private.telegram_send('spam')")
    } catch (e) {
      error = e
    }
    assert.match(error?.message ?? '', /permission denied/)
  }
  await reset()
  check('anon/authenticated cannot invoke sender', (await sent()).length, 0)

  console.log(`\n${passed} telegram alert checks passed.`)
} finally {
  await db.close()
}
