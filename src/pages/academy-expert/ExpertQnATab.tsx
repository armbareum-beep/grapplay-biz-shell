import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBizData } from '../../lib/useBizData'
import { listQuestions, saveAnswer, errorMessage, type CourseQuestion } from '../../lib/qnaApi'
import {
  qnaInput,
  qnaButton,
  qnaSecondary,
  QnaError,
  QnaPagination,
  QuestionHeading,
} from '../../components/CourseQnA'

export default function ExpertQnATab({
  expertId,
  onAnswered,
}: {
  expertId: string
  onAnswered: () => void
}) {
  const { getCoursesByExpert } = useBizData()
  const [params, setParams] = useSearchParams()
  const questionId = params.get('question') || undefined
  const [courseId, setCourseId] = useState('')
  const [status, setStatus] = useState<'all' | 'pending' | 'answered'>('all')
  const [page, setPage] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const [rows, setRows] = useState<CourseQuestion[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    listQuestions({
      expertId,
      courseId: questionId ? undefined : courseId || undefined,
      status: questionId ? 'all' : status,
      questionId,
      page: questionId ? 0 : page,
    })
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
  }, [expertId, courseId, status, page, refresh, questionId])
  const reload = () => setRefresh((v) => v + 1)
  return (
    <section className="space-y-4" aria-label="Q&A 관리">
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="질문 강의 필터"
          value={courseId}
          disabled={!!questionId}
          onChange={(e) => {
            setCourseId(e.target.value)
            setPage(0)
          }}
          className={`${qnaInput} sm:w-auto`}
        >
          <option value="">모든 강의</option>
          {getCoursesByExpert(expertId).map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <select
          aria-label="답변 상태 필터"
          value={status}
          disabled={!!questionId}
          onChange={(e) => {
            setStatus(e.target.value as typeof status)
            setPage(0)
          }}
          className={`${qnaInput} sm:w-auto`}
        >
          <option value="all">전체 상태</option>
          <option value="pending">답변 대기</option>
          <option value="answered">답변 완료</option>
        </select>
        <button className={qnaSecondary} onClick={reload}>
          새로고침
        </button>
        {questionId && (
          <button
            className={qnaSecondary}
            onClick={() => {
              const next = new URLSearchParams(params)
              next.delete('question')
              setParams(next)
              setPage(0)
            }}
          >
            전체 질문 보기
          </button>
        )}
      </div>
      <QnaError message={error} />
      {loading ? (
        <p role="status" className="py-8 text-center text-sm">
          질문을 불러오는 중…
        </p>
      ) : rows.length ? (
        rows.map((q) => (
          <AnswerCard
            key={`${q.id}:${q.answer?.updated_at}`}
            question={q}
            onSaved={() => {
              reload()
              onAnswered()
            }}
          />
        ))
      ) : (
        !error && (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-stone-500">
            {questionId ? '질문이 삭제되었거나 접근 권한이 없습니다.' : '해당하는 질문이 없습니다.'}
          </p>
        )
      )}
      {!questionId && <QnaPagination page={page} count={count} onChange={setPage} />}
    </section>
  )
}
function AnswerCard({ question: q, onSaved }: { question: CourseQuestion; onSaved: () => void }) {
  const [content, setContent] = useState(q.answer?.content ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await saveAnswer(q.id, content, !!q.answer)
      setNotice('답변을 저장했습니다.')
      onSaved()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <article
      id={`question-${q.id}`}
      className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5"
    >
      <p className="text-sm font-semibold text-brand-700">{q.course.title}</p>
      <QuestionHeading question={q} />
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{q.content}</p>
      <form onSubmit={save} className="space-y-3 border-t border-stone-100 pt-4">
        <label htmlFor={`answer-${q.id}`} className="block text-sm font-semibold">
          지도자 답변
        </label>
        <textarea
          id={`answer-${q.id}`}
          className={qnaInput}
          value={content}
          disabled={busy}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          maxLength={10000}
          required
          placeholder="수강생의 질문에 답변해 주세요."
        />
        <QnaError message={error} />
        {notice && (
          <p role="status" className="text-sm text-green-700">
            {notice}
          </p>
        )}
        <button className={qnaButton} disabled={busy || !content.trim()}>
          {busy ? '저장 중…' : q.answer ? '답변 수정' : '답변 등록'}
        </button>
      </form>
    </article>
  )
}
