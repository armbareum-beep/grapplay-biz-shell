import { useState } from 'react'
import { Stars, StarInput } from './Stars'
import { maskName } from '../data/mockMarketplace'

export interface ReviewItem {
  id: string
  userName: string
  content: string
  createdAt: string
  rating?: number
}

// 공개 후기 섹션 — 평점은 실제 후기 별점 평균에서 산출. 구매자는 별점+후기 작성 가능.
export default function ReviewSection({
  title,
  items,
  avg,
  count,
  canWrite,
  alreadyWrote,
  onSubmit,
}: {
  title: string
  items: ReviewItem[]
  avg: number
  count: number
  canWrite: boolean
  alreadyWrote: boolean
  onSubmit: (rating: number, content: string) => Promise<{ error: string | null }>
}) {
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!content.trim()) return alert('후기 내용을 입력해 주세요.')
    setBusy(true)
    const { error } = await onSubmit(rating, content.trim())
    setBusy(false)
    if (error) return alert('등록 실패: ' + error)
    setContent('')
    setRating(5)
  }

  return (
    <section id="reviews" className="scroll-mt-32">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-black text-slate-900">{title}</h2>
        {count > 0 ? (
          <span className="text-sm text-slate-500">
            <span className="font-bold text-amber-400">★</span>{' '}
            <span className="font-semibold text-slate-700">{avg.toFixed(1)}</span> · {count}개
          </span>
        ) : (
          <span className="text-sm text-slate-400">평점 없음</span>
        )}
      </div>

      {/* 작성 폼 (구매자만, 아직 안 썼을 때) */}
      {canWrite && !alreadyWrote && (
        <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50 p-5">
          <div className="font-semibold text-stone-800">후기 작성</div>
          <div className="mt-2">
            <StarInput value={rating} onChange={setRating} />
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="수강 후기를 남겨주세요"
            className="mt-3 w-full resize-none rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <button
            onClick={submit}
            disabled={busy}
            className="mt-3 rounded-lg bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            후기 등록
          </button>
        </div>
      )}
      {canWrite && alreadyWrote && (
        <p className="mt-3 text-sm text-stone-500">이미 후기를 작성하셨어요. 감사합니다! 🙌</p>
      )}

      {/* 목록 */}
      {items.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
          <div className="text-4xl">✍️</div>
          <p className="mt-3 font-semibold text-slate-700">아직 등록된 후기가 없어요</p>
          {canWrite && !alreadyWrote && (
            <p className="mt-1 text-sm text-slate-500">첫 후기의 주인공이 되어보세요.</p>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">{maskName(r.userName)}</span>
                <span className="text-xs text-slate-400">{r.createdAt}</span>
              </div>
              {typeof r.rating === 'number' && (
                <div className="mt-1 text-sm">
                  <Stars n={r.rating} />
                </div>
              )}
              <p className="mt-2 leading-relaxed text-slate-600">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
