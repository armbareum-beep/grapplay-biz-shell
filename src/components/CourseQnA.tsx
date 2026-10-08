import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import {
  createQuestion,
  editQuestion,
  listQuestions,
  errorMessage,
  QNA_PAGE_SIZE,
  type CourseQuestion,
} from '../lib/qnaApi'

export const qnaInput =
  'w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100'
export const qnaButton =
  'rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50'
export const qnaSecondary =
  'rounded-lg border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50 disabled:opacity-50'
export function QnaError({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
      {message}
    </p>
  ) : null
}
export function QnaPagination({
  page,
  count,
  onChange,
}: {
  page: number
  count: number
  onChange: (page: number) => void
}) {
  if (count <= QNA_PAGE_SIZE) return null
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <button className={qnaSecondary} disabled={page === 0} onClick={() => onChange(page - 1)}>
        이전
      </button>
      <span>
        {page + 1} / {Math.ceil(count / QNA_PAGE_SIZE)}
      </span>
      <button
        className={qnaSecondary}
        disabled={(page + 1) * QNA_PAGE_SIZE >= count}
        onClick={() => onChange(page + 1)}
      >
        다음
      </button>
    </div>
  )
}
export function QuestionHeading({ question: q }: { question: CourseQuestion }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
      <span
        className={`rounded-full px-2 py-1 font-semibold ${q.answered_at ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}
      >
        {q.answered_at ? '답변 완료' : '답변 대기'}
      </span>
      <span>{q.is_public ? '수강생 공개' : '비공개'}</span>
      <span>{q.author_name}</span>
      <time dateTime={q.created_at}>{new Date(q.created_at).toLocaleDateString('ko-KR')}</time>
      {q.lesson_title && (
        <span className="basis-full">
          질문 당시 {q.lesson_index! + 1}강 · {q.lesson_title}
        </span>
      )}
    </div>
  )
}
export default function CourseQnA({
  courseId,
  enabled,
  lessonIndex,
  lessonTitle,
}: {
  courseId: string
  enabled: boolean
  lessonIndex: number | null
  lessonTitle?: string
}) {
  const { user } = useAuth()
  const [mine, setMine] = useState(false)
  const [page, setPage] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const [rows, setRows] = useState<CourseQuestion[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [content, setContent] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    listQuestions({ courseId, userId: mine ? user?.id : undefined, page })
      .then((result) => {
        if (active) {
          setRows(result.rows)
          setCount(result.count)
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [courseId, user?.id, mine, page, refresh])
  const reload = () => setRefresh((v) => v + 1)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await createQuestion({ courseId, content, isPublic, lessonIndex })
      setContent('')
      setIsPublic(false)
      setPage(0)
      reload()
      setNotice('질문을 등록했습니다. 답변은 이곳에서 확인할 수 있어요.')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="space-y-5" aria-label="질문과 답변">
      {enabled ? (
        <form onSubmit={submit} className="space-y-3 rounded-xl bg-stone-50 p-4">
          <label htmlFor="new-question" className="block font-semibold">
            지도자에게 질문하기
          </label>
          {lessonTitle && <p className="text-xs text-stone-500">현재 회차: {lessonTitle}</p>}
          <textarea
            id="new-question"
            required
            maxLength={5000}
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={busy}
            className={qnaInput}
            placeholder="이해되지 않거나 적용하기 어려운 부분을 남겨주세요."
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublic}
              disabled={busy}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            같은 강의 수강생에게 공개
          </label>
          <p className="text-xs text-stone-500">
            선택하지 않으면 본인·담당 지도자·관리자만 볼 수 있어요. 개인정보는 적지 마세요.
          </p>
          <button disabled={busy || !content.trim()} className={qnaButton}>
            {busy ? '등록 중…' : '질문 등록'}
          </button>
        </form>
      ) : (
        <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-600">
          현재 새 질문을 받지 않습니다. 기존 질문과 답변은 계속 확인할 수 있어요.
        </p>
      )}
      <QnaError message={error} />
      {notice && (
        <p role="status" className="text-sm text-green-700">
          {notice}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          className={mine ? qnaSecondary : qnaButton}
          onClick={() => {
            setMine(false)
            setPage(0)
          }}
        >
          전체 질문
        </button>
        <button
          className={mine ? qnaButton : qnaSecondary}
          onClick={() => {
            setMine(true)
            setPage(0)
          }}
        >
          내 질문
        </button>
        <button className={`${qnaSecondary} ml-auto`} onClick={reload}>
          새로고침
        </button>
      </div>
      {loading ? (
        <p role="status" className="text-sm text-stone-500">
          질문을 불러오는 중…
        </p>
      ) : rows.length ? (
        rows.map((q) => (
          <StudentQuestion
            key={`${q.id}:${q.updated_at}:${q.answer?.updated_at}`}
            question={q}
            own={q.user_id === user?.id}
            onSaved={reload}
          />
        ))
      ) : (
        !error && <p className="py-8 text-center text-sm text-stone-500">아직 질문이 없습니다.</p>
      )}
      <QnaPagination page={page} count={count} onChange={setPage} />
    </section>
  )
}
function StudentQuestion({
  question: q,
  own,
  onSaved,
}: {
  question: CourseQuestion
  own: boolean
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(q.content)
  const [isPublic, setIsPublic] = useState(q.is_public)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await editQuestion(q.id, content, isPublic)
      setEditing(false)
      onSaved()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <article className="space-y-3 rounded-xl border border-stone-200 p-4">
      <QuestionHeading question={q} />
      {editing ? (
        <form onSubmit={save} className="space-y-3">
          <textarea
            aria-label="질문 수정"
            className={qnaInput}
            rows={4}
            maxLength={5000}
            required
            value={content}
            disabled={busy}
            onChange={(e) => setContent(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublic}
              disabled={busy}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            같은 강의 수강생에게 공개
          </label>
          <div className="flex gap-2">
            <button className={qnaButton} disabled={busy || !content.trim()}>
              저장
            </button>
            <button
              type="button"
              className={qnaSecondary}
              disabled={busy}
              onClick={() => {
                setEditing(false)
                setContent(q.content)
                setIsPublic(q.is_public)
              }}
            >
              취소
            </button>
          </div>
        </form>
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{q.content}</p>
      )}
      <QnaError message={error} />
      {own && !q.answered_at && !editing && (
        <button className={qnaSecondary} onClick={() => setEditing(true)}>
          질문 수정
        </button>
      )}
      {q.answer && (
        <div className="rounded-xl bg-brand-50 p-4">
          <p className="mb-2 text-sm font-bold text-brand-800">지도자 답변</p>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {q.answer.content}
          </p>
        </div>
      )}
    </article>
  )
}
