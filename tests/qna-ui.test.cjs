// DOM integration test with mocked HTTP responses. Database permissions are tested separately.
const { JSDOM } = require('jsdom')
const { buildSync } = require('esbuild')
const assert = require('node:assert/strict')
const root = require('node:path').resolve(__dirname, '..')
const source = buildSync({
  absWorkingDir: root,
  stdin: {
    contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {BrowserRouter,Routes,Route} from 'react-router-dom'; import {AuthProvider} from './src/lib/auth'; import Layout from './src/components/AcademyLayout'; import ProtectedRoute from './src/components/ProtectedRoute'; import Dashboard from './src/pages/academy-expert/AcademyExpertDashboard'; import Editor from './src/pages/academy-expert/AcademyCourseEditor'; import Learn from './src/pages/AcademyCourseLearn'; createRoot(document.getElementById('root')).render(<BrowserRouter><AuthProvider><Layout><Routes><Route path='/expert/dashboard' element={<ProtectedRoute requireExpert><Dashboard/></ProtectedRoute>}/><Route path='/expert/courses/:id/edit' element={<ProtectedRoute requireExpert><Editor/></ProtectedRoute>}/><Route path='/learn/:id' element={<ProtectedRoute><Learn/></ProtectedRoute>}/></Routes></Layout></AuthProvider></BrowserRouter>);`,
    resolveDir: root,
    loader: 'tsx',
  },
  bundle: true,
  write: false,
  format: 'iife',
  loader: { '.css': 'empty' },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': '"https://qna-test.supabase.co"',
    'import.meta.env.VITE_SUPABASE_ANON_KEY': '"test-key"',
  },
  jsx: 'automatic',
}).outputFiles[0].text
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const course = {
  id: 'c1',
  expert_id: 'e1',
  title: '투자의 기초',
  subtitle: '처음 시작하는 투자',
  category: '투자',
  price: 0,
  qna_enabled: true,
  curriculum: [{ title: '복리의 이해', durationMin: 1 }],
  what_you_learn: [],
  detail_blocks: [],
  lesson_count: 1,
  duration_min: 1,
  cover: 'from-brand-900 to-brand-600',
}
let question = {
  id: '11111111-1111-4111-8111-111111111111',
  course_id: 'c1',
  user_id: uid(1),
  author_name: '수강생',
  content: '복리는 언제 적용되나요?',
  is_public: false,
  lesson_index: 0,
  lesson_title: '복리의 이해',
  answered_at: null,
  created_at: '2026-10-06T02:00:00Z',
  updated_at: '2026-10-06T02:00:00Z',
  answer: null,
  course: { id: 'c1', title: course.title, expert_id: 'e1' },
}
let notifications = [
  {
    id: '22222222-2222-4222-8222-222222222222',
    expert_id: 'e1',
    course_id: 'c1',
    question_id: question.id,
    review_id: null,
    kind: 'question',
    read_at: null,
    created_at: question.created_at,
    course: { title: course.title },
  },
]
const errors = []
function app(role, path) {
  const id = role === 'expert' ? uid(3) : uid(1)
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:4173' + path,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  })
  const w = dom.window
  w.addEventListener('error', (e) => errors.push(e.message))
  w.Response = Response
  w.Request = Request
  w.Headers = Headers
  w.TextEncoder = TextEncoder
  w.TextDecoder = TextDecoder
  w.structuredClone = structuredClone
  w.fetch = async (input, init = {}) => {
    const u = new URL(typeof input === 'string' ? input : input.url),
      table = u.pathname.split('/').pop(),
      method = init.method || 'GET'
    let data = [],
      count
    const p = init.body ? JSON.parse(init.body) : null
    if (u.pathname.includes('/auth/')) data = { id, email: 'test@example.invalid' }
    else if (table === 'profiles')
      data = {
        role,
        expert_id: role === 'expert' ? 'e1' : null,
        display_name: role === 'expert' ? '지도자' : '수강생',
        avatar_url: null,
      }
    else if (table === 'courses') {
      if (method === 'PATCH') Object.assign(course, p)
      data = [course]
    } else if (table === 'experts')
      data = [{ id: 'e1', name: '테스트 지도자', title: '투자 교육', avatar: '', bio: '' }]
    else if (table === 'enrollments') data = { item_id: 'c1', lesson_progress: {} }
    else if (table === 'course_questions') {
      if (method === 'POST') {
        question = { ...question, ...p }
        data = null
      } else {
        data = [question]
        count = 1
        if (u.searchParams.get('answered_at') === 'is.null' && question.answered_at) {
          data = []
          count = 0
        }
      }
    } else if (table === 'course_answers') {
      question = {
        ...question,
        answered_at: new Date().toISOString(),
        answer: { ...p, created_at: question.created_at, updated_at: new Date().toISOString() },
      }
      data = [{ question_id: question.id }]
    } else if (table === 'instructor_notifications') {
      if (method === 'PATCH') {
        notifications = notifications.map((n) => ({ ...n, read_at: p.read_at }))
        data = null
      } else {
        data =
          u.searchParams.get('read_at') === 'is.null'
            ? notifications.filter((n) => !n.read_at)
            : notifications
        count = data.length
      }
    } else if (table === 'course_reviews')
      data = [
        {
          id: 'r1',
          course_id: 'c1',
          user_name: '수강생',
          user_email: 'test@example.invalid',
          content: '설명이 쉬웠어요',
          rating: 5,
          created_at: '2026-10-06',
          hidden: false,
        },
      ]
    return new Response(method === 'HEAD' ? null : JSON.stringify(data), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        ...(count === undefined ? {} : { 'content-range': `0-${Math.max(count - 1, 0)}/${count}` }),
      },
    })
  }
  const token =
    Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url') +
    '.' +
    Buffer.from(
      JSON.stringify({ sub: id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }),
    ).toString('base64url') +
    '.test'
  w.localStorage.setItem(
    'sb-qna-test-auth-token',
    JSON.stringify({
      access_token: token,
      refresh_token: 'test',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: {
        id,
        email: 'test@example.invalid',
        aud: 'authenticated',
        role: 'authenticated',
        app_metadata: {},
        user_metadata: {},
      },
    }),
  )
  w.eval(source)
  return dom
}
const wait = async (test, label) => {
  for (let i = 0; i < 150; i++) {
    if (test()) return
    await new Promise((r) => setTimeout(r, 20))
  }
  throw new Error('Timed out: ' + label)
}
const textButton = (w, text) =>
  [...w.document.querySelectorAll('button')].find((b) => b.textContent.trim() === text)
function fill(w, node, value) {
  Object.getOwnPropertyDescriptor(w.HTMLTextAreaElement.prototype, 'value').set.call(node, value)
  node.dispatchEvent(new w.Event('input', { bubbles: true }))
}
const doms = []
;(async () => {
  const d = app('expert', '/expert/dashboard?tab=qna&question=' + question.id)
  doms.push(d)
  const w = d.window
  await wait(
    () => w.document.querySelector('textarea[id^="answer-"]'),
    'instructor Q&A deep link and auth resolution',
  )
  fill(w, w.document.querySelector('textarea'), '수익을 다시 투자할 때 적용됩니다.')
  await wait(
    () => textButton(w, '답변 등록') && !textButton(w, '답변 등록').disabled,
    'answer input',
  )
  textButton(w, '답변 등록').click()
  await wait(() => w.document.body.textContent.includes('답변 완료'), 'answer persisted')
  w.document.querySelector('button[aria-controls="instructor-notifications"]').click()
  await wait(
    () =>
      [...w.document.querySelectorAll('button')].some((b) =>
        b.textContent.includes('새 질문이 등록되었습니다'),
      ),
    'notification list',
  )
  ;[...w.document.querySelectorAll('button')]
    .find((b) => b.textContent.includes('새 질문이 등록되었습니다'))
    .click()
  await wait(() => notifications[0].read_at, 'notification read')
  textButton(w, '내 강의').click()
  await wait(
    () => [...w.document.querySelectorAll('a')].some((a) => a.textContent === '편집'),
    'courses tab',
  )
  ;[...w.document.querySelectorAll('a')].find((a) => a.textContent === '편집').click()
  await wait(() => w.document.querySelector('input[type="checkbox"]'), 'editor')
  const toggle = [...w.document.querySelectorAll('label')]
    .find((l) => l.textContent.includes('이 강의에서 Q&A 사용하기'))
    .querySelector('input')
  assert.equal(toggle.checked, true)
  toggle.click()
  await new Promise((r) => setTimeout(r, 30))
  textButton(w, '저장').click()
  await wait(() => course.qna_enabled === false, 'toggle persisted')
  console.log(
    'PASS DOM: instructor Q&A deep link, answer save, notification read/navigation, editor toggle',
  )
  d.window.close()
  course.qna_enabled = true
  const s = app('user', '/learn/c1?tab=qna')
  doms.push(s)
  const sw = s.window
  await wait(() => sw.document.body.textContent.includes('지도자 답변'), 'student answer display')
  fill(sw, sw.document.querySelector('#new-question'), '새 수강생 질문')
  await wait(() => !textButton(sw, '질문 등록').disabled, 'question input')
  textButton(sw, '질문 등록').click()
  await wait(() => sw.document.body.textContent.includes('질문을 등록했습니다.'), 'student submit')
  assert.equal(question.content, '새 수강생 질문')
  assert.equal(question.is_public, false)
  console.log('PASS DOM: student answer view, private-default question submission')
  assert.deepEqual(errors, [])
})()
  .catch((e) => {
    console.error(e.message)
    process.exitCode = 1
  })
  .finally(() => {
    doms.forEach((d) => d.window.close())
  })
