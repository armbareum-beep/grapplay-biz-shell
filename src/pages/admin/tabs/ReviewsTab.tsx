import { useState } from 'react'
import { type CourseReview } from '../../../data/mock'
import { type EbookReview } from '../../../data/mockEbooks'
import { useBizData, invalidateBizData } from '../../../lib/useBizData'
import {
  setReviewHidden,
  setEbookReviewHidden,
  deleteCourseReview,
  deleteEbookReview,
} from '../../../lib/expertApi'
import { Stars } from '../../../components/Stars'

type Kind = '강의' | '전자책'

// 리뷰 관리 — 강의/전자책 리뷰 모더레이션(숨김/해제/삭제). admin UPDATE·DELETE 정책 사용.
export default function ReviewsTab() {
  const { courseReviews, ebookReviews, getCourse, getEbook, refetch, loading } = useBizData()
  const [kind, setKind] = useState<Kind>('강의')
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [deleted, setDeleted] = useState<Set<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [onlyHidden, setOnlyHidden] = useState(false)

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-stone-100" />

  const isHidden = (id: string, hidden: boolean) => overrides[id] ?? hidden

  const toggle = async (id: string, hidden: boolean) => {
    const next = !isHidden(id, hidden)
    setBusyId(id)
    const { error } = kind === '강의'
      ? await setReviewHidden(id, next)
      : await setEbookReviewHidden(id, next)
    setBusyId(null)
    if (error) return alert('변경 실패: ' + error)
    setOverrides((m) => ({ ...m, [id]: next }))
    invalidateBizData()
  }

  const remove = async (id: string) => {
    if (!confirm('이 리뷰를 삭제할까요? 되돌릴 수 없습니다.')) return
    setBusyId(id)
    const { error } = kind === '강의' ? await deleteCourseReview(id) : await deleteEbookReview(id)
    setBusyId(null)
    if (error) return alert('삭제 실패: ' + error)
    setDeleted((s) => new Set(s).add(id))
    invalidateBizData()
    refetch()
  }

  // 공통 표시 행으로 정규화
  const rows = (
    kind === '강의'
      ? courseReviews.map((r: CourseReview) => ({
          id: r.id,
          userName: r.userName,
          userEmail: r.userEmail,
          createdAt: r.createdAt,
          content: r.content,
          rating: r.rating,
          hidden: r.hidden,
          title: getCourse(r.courseId)?.title ?? r.courseId,
        }))
      : ebookReviews.map((r: EbookReview) => ({
          id: r.id,
          userName: r.userName,
          userEmail: r.userEmail,
          createdAt: r.createdAt,
          content: r.content,
          rating: r.rating,
          hidden: r.hidden,
          title: getEbook(r.ebookId)?.title ?? r.ebookId,
        }))
  )
    .filter((r) => !deleted.has(r.id))
    .filter((r) => (onlyHidden ? isHidden(r.id, r.hidden) : true))

  return (
    <div className="space-y-4">
      {/* 강의 / 전자책 전환 */}
      <div className="flex gap-2">
        {(['강의', '전자책'] as Kind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
              kind === k
                ? 'bg-brand-600 text-white'
                : 'border border-stone-300 bg-white text-stone-600 hover:bg-stone-100'
            }`}
          >
            {k} 리뷰 ({k === '강의' ? courseReviews.length : ebookReviews.length})
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-600">
        <input type="checkbox" checked={onlyHidden} onChange={(e) => setOnlyHidden(e.target.checked)} />
        숨김 처리된 리뷰만 보기
      </label>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-16 text-center">
          <div className="text-4xl">📝</div>
          <p className="mt-3 font-semibold text-stone-700">표시할 {kind} 리뷰가 없어요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const hidden = isHidden(r.id, r.hidden)
            const busy = busyId === r.id
            return (
              <div
                key={r.id}
                className={`rounded-2xl border p-5 ${
                  hidden ? 'border-stone-200 bg-stone-50 opacity-70' : 'border-stone-200 bg-white'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-stone-800">{r.userName}</span>
                    {r.userEmail && <span className="text-xs text-stone-400">· {r.userEmail}</span>}
                    {hidden && (
                      <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
                        숨김
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-stone-400">{r.createdAt}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs font-medium text-brand-600">{r.title}</span>
                  {typeof r.rating === 'number' && (
                    <span className="text-xs">
                      <Stars n={r.rating} /> <span className="text-stone-400">{r.rating}.0</span>
                    </span>
                  )}
                </div>
                <p className="mt-2 leading-relaxed text-stone-600">{r.content}</p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => toggle(r.id, r.hidden)}
                    disabled={busy}
                    className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50"
                  >
                    {hidden ? '숨김 해제' : '숨기기'}
                  </button>
                  <button
                    onClick={() => remove(r.id)}
                    disabled={busy}
                    className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
