import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

// Real Postgres engine in WASM. No network or production data.
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
async function denied(name, query) {
  let error
  try {
    await sql(query)
  } catch (e) {
    error = e
  }
  assert.ok(error, `${name}: unexpectedly permitted`)
  assert.match(
    error.message,
    /permission denied|row-level security|로그인|질문|답변|회차|check constraint/,
  )
  passed++
  console.log(`PASS ${name}`)
}
async function as(n) {
  await sql('reset role')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [n ? uid(n) : ''])
  await sql(`set role ${n ? 'authenticated' : 'anon'}`)
}
async function adminSql(query) {
  await sql('reset role')
  await sql(query)
}
const migration = await readFile(
  new URL('../supabase/migrations/20261006025002_course_qna_notifications.sql', import.meta.url),
  'utf8',
)
const authorDeletionMigration = await readFile(
  new URL('../supabase/migrations/20261006055858_qna_answer_author_deletion.sql', import.meta.url),
  'utf8',
)
try {
  await sql(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  `)
  for (const file of [
    '20260608000000_init_biz.sql',
    '20260609000000_auth_orders_enroll.sql',
    '20260609000100_ebooks.sql',
    '20260619000100_ebook_reviews.sql',
    '20260624000000_review_author_trigger.sql',
  ]) {
    const source = await readFile(
      new URL(`../supabase/migrations/${file}`, import.meta.url),
      'utf8',
    )
    await sql(source.split('-- ── 시드')[0])
  }
  await sql(`
    insert into experts(id,name,title) values ('e1','지도자1','교육'),('e2','지도자2','교육');
    insert into courses(id,expert_id,title,category,price,curriculum) values
      ('c1','e1','무료 강의','투자',0,'[{"title":"원래 회차"}]'),
      ('c2','e2','유료 강의','투자',100,'[]'), ('off','e1','접수 중단','투자',0,'[]');
    insert into auth.users(id,email,raw_user_meta_data) values ${[1, 2, 3, 4, 5, 6].map((n) => `('${uid(n)}','test${n}@example.invalid','{"name":"수강생${n}"}')`).join(',')};
    update profiles set role='expert',expert_id='e1' where id='${uid(3)}';
    update profiles set role='expert',expert_id='e2' where id='${uid(4)}';
    update profiles set role='admin' where id='${uid(5)}';
    insert into enrollments(user_id,item_type,item_id) values
      ('${uid(1)}','course','c1'),('${uid(2)}','course','c1'),('${uid(1)}','course','off'),('${uid(2)}','course','c2');
  `)
  await sql(migration)
  await sql(migration)
  check(
    'migration is repeatable; existing courses default off',
    (await rows('select bool_and(not qna_enabled) as ok from courses'))[0].ok,
    true,
  )
  await sql("update courses set qna_enabled=true where id in ('c1','c2')")
  await as(1)
  const q1 = (
    await rows(
      "insert into course_questions(course_id,content,lesson_index) values ('c1','비공개 질문',0) returning id,lesson_title,user_id,is_public",
    )
  )[0]
  check('question uses authenticated author', q1.user_id, uid(1))
  check('private by default', q1.is_public, false)
  check('lesson title snapshot comes from server', q1.lesson_title, '원래 회차')
  const q2 = (
    await rows(
      "insert into course_questions(course_id,content,is_public) values ('c1','공개 질문',true) returning id",
    )
  )[0]
  await denied(
    'non-enrolled user cannot ask on paid course',
    "insert into course_questions(course_id,content) values ('c2','금지')",
  )
  await denied(
    'disabled course rejects new questions',
    "insert into course_questions(course_id,content) values ('off','금지')",
  )
  await denied(
    'invalid lesson rejected',
    "insert into course_questions(course_id,content,lesson_index) values ('c1','질문',999)",
  )
  await denied(
    'blank question rejected',
    "insert into course_questions(course_id,content) values ('c1','   ')",
  )
  await denied(
    'author spoof blocked',
    `insert into course_questions(course_id,content,user_id) values ('c1','위조','${uid(2)}')`,
  )
  await denied(
    'question ownership cannot be reassigned',
    `update course_questions set user_id='${uid(2)}' where id='${q1.id}'`,
  )
  await denied(
    'student cannot fake answered state',
    `update course_questions set answered_at=now() where id='${q1.id}'`,
  )
  await denied(
    'student cannot answer',
    `insert into course_answers(question_id,content) values ('${q1.id}','위조 답변')`,
  )
  await as(2)
  check(
    'peer sees only public question',
    (await rows('select id from course_questions')).map((x) => x.id),
    [q2.id],
  )
  check(
    'peer cannot edit question',
    (await rows(`update course_questions set content='변조' where id='${q2.id}' returning id`))
      .length,
    0,
  )
  await as(6)
  check(
    'non-enrolled user sees no questions',
    (await rows('select id from course_questions')).length,
    0,
  )
  await as(0)
  await denied('anonymous cannot read questions', 'select * from course_questions')
  await as(4)
  check(
    'other instructor cannot read private question',
    (await rows(`select id from course_questions where id='${q1.id}'`)).length,
    0,
  )
  await denied(
    'other instructor cannot answer',
    `insert into course_answers(question_id,content) values ('${q1.id}','다른 지도자')`,
  )
  check(
    'other instructor receives no notifications',
    (await rows('select id from instructor_notifications')).length,
    0,
  )
  await as(3)
  check(
    'owner receives exactly one notification per question',
    (await rows('select id from instructor_notifications')).length,
    2,
  )
  const notification = (await rows('select id from instructor_notifications limit 1'))[0]
  await sql(`update instructor_notifications set read_at=now() where id='${notification.id}'`)
  check(
    'owner can mark notification read',
    (await rows('select id from instructor_notifications where read_at is not null')).length,
    1,
  )
  await denied(
    'cannot spoof notification recipient',
    `update instructor_notifications set recipient_id='${uid(2)}' where id='${notification.id}'`,
  )
  await denied(
    'clients cannot manufacture alerts',
    `insert into instructor_notifications(recipient_id,expert_id,course_id,question_id,kind) values ('${uid(3)}','e1','c1','${q1.id}','question')`,
  )
  await as(1)
  check(
    'student cannot read instructor alerts',
    (await rows('select id from instructor_notifications')).length,
    0,
  )
  await sql(`update course_questions set content='수정된 질문' where id='${q1.id}'`)
  await as(3)
  check(
    'question edits do not generate more alerts',
    (await rows('select id from instructor_notifications')).length,
    2,
  )
  await sql(`insert into course_answers(question_id,content) values ('${q1.id}','첫 답변')`)
  check(
    'answer marks question answered',
    !!(await rows(`select answered_at from course_questions where id='${q1.id}'`))[0].answered_at,
    true,
  )
  await sql(`update course_answers set content='수정 답변' where question_id='${q1.id}'`)
  await as(1)
  check(
    'student reads saved answer',
    (await rows(`select content from course_answers where question_id='${q1.id}'`))[0].content,
    '수정 답변',
  )
  check(
    'answered question is not editable',
    (await rows(`update course_questions set content='바꿔치기' where id='${q1.id}' returning id`))
      .length,
    0,
  )
  await as(2)
  check(
    'peer cannot read private answer',
    (await rows(`select * from course_answers where question_id='${q1.id}'`)).length,
    0,
  )
  await as(5)
  check(
    'admin can read private question',
    (await rows(`select id from course_questions where id='${q1.id}'`)).length,
    1,
  )
  await sql(`insert into course_answers(question_id,content) values ('${q2.id}','관리자 답변')`)
  await as(3)
  await sql("update courses set qna_enabled=false where id='c1'")
  await sql(
    `update course_answers set content='접수 종료 후 답변 수정' where question_id='${q1.id}'`,
  )
  await as(1)
  check(
    'turning off Q&A preserves existing answers',
    (await rows(`select content from course_answers where question_id='${q1.id}'`))[0].content,
    '접수 종료 후 답변 수정',
  )
  await denied(
    'turning off Q&A is enforced by database',
    "insert into course_questions(course_id,content) values ('c1','새 질문')",
  )
  await sql(
    "insert into course_reviews(id,course_id,user_name,content) values ('r1','c1','fake','새 리뷰')",
  )
  await as(3)
  check(
    'review alert is independent of Q&A toggle',
    (await rows("select id from instructor_notifications where kind='review'")).length,
    1,
  )
  await sql("update course_reviews set hidden=true where id='r1'")
  check(
    'review edits do not duplicate alerts',
    (await rows("select id from instructor_notifications where kind='review'")).length,
    1,
  )
  await as(2)
  await sql("insert into course_questions(course_id,content) values ('c2','유료 수강 질문')")
  await as(4)
  check(
    'paid course routes notification only to its instructor',
    (await rows("select id from instructor_notifications where course_id='c2'")).length,
    1,
  )
  await as(3)
  check(
    'first instructor cannot read second instructor alert',
    (await rows("select id from instructor_notifications where course_id='c2'")).length,
    0,
  )
  await adminSql("update courses set expert_id='e2' where id='c1'")
  await as(3)
  check(
    'previous owner loses private Q&A access',
    (await rows(`select id from course_questions where id='${q1.id}'`)).length,
    0,
  )
  check(
    'previous owner loses alert access',
    (await rows('select id from instructor_notifications')).length,
    0,
  )
  await as(4)
  // Upgrade with existing answers, then verify the correction is repeatable.
  await adminSql(authorDeletionMigration)
  await adminSql(authorDeletionMigration)
  await as(4)
  await denied(
    'instructor cannot clear answer attribution directly',
    `update course_answers set author_id=null where question_id='${q1.id}'`,
  )
  await as(0)
  await sql('reset role')
  const beforeDeletion = (await rows(`select * from course_answers where question_id='${q1.id}'`))[0]
  const answeredAt = (await rows(`select answered_at from course_questions where id='${q1.id}'`))[0].answered_at
  await sql(`delete from auth.users where id='${uid(3)}'`)
  check(
    'deleting instructor without JWT preserves answer except attribution',
    (await rows(`select * from course_answers where question_id='${q1.id}'`))[0],
    { ...beforeDeletion, author_id: null },
  )
  check('deleted instructor notifications are removed',
    (await rows(`select id from instructor_notifications where recipient_id='${uid(3)}'`)).length, 0)
  check('account deletion preserves answered state',
    (await rows(`select answered_at from course_questions where id='${q1.id}'`))[0].answered_at, answeredAt)
  await denied('SQL Editor answer edits without JWT remain blocked',
    `update course_answers set content='운영 수정' where question_id='${q1.id}'`)
  await denied('SQL Editor question edits without JWT remain blocked',
    `update course_questions set content='운영 수정' where id='${q1.id}'`)
  await sql('set role service_role')
  await denied('service role cannot edit answer without a user',
    `update course_answers set content='운영 수정' where question_id='${q1.id}'`)
  await as(4)
  await adminSql(`delete from auth.users where id='${uid(5)}'`)
  check('deletion with another JWT does not reattribute answer',
    (await rows(`select author_id from course_answers where question_id='${q2.id}'`))[0].author_id, null)
  await as(4)
  await sql(`update course_answers set content='새 지도자 답변' where question_id='${q1.id}'`)
  check('current instructor can edit preserved answer',
    (await rows(`select author_id from course_answers where question_id='${q1.id}'`))[0].author_id, uid(4))
  await as(1)
  check('student can still read answer after original author deletion',
    (await rows(`select content from course_answers where question_id='${q1.id}'`))[0].content, '새 지도자 답변')
  console.log(`\n${passed} permission and notification checks passed.`)
} catch (e) {
  console.error(e.message, e.detail ?? '', e.where ?? '')
  process.exitCode = 1
} finally {
  await db.close()
}
