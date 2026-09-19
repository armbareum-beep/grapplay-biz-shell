import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, Category } from '../data/mock'
import { useBizData } from '../lib/useBizData'
import { useAuth } from '../lib/auth'
import ExpertAvatar from '../components/ExpertAvatar'

// 전문가가 가진 전문 분야 모음 — 다중 categories 우선, 없으면 단일 category, 그래도 없으면 강의 기반.
function expertCategories(
  e: { category?: Category; categories?: Category[] },
  courseCats: Category[],
): Category[] {
  if (e.categories?.length) return e.categories
  if (e.category) return [e.category]
  return courseCats
}

export default function AcademyExperts() {
  const { experts, getExpertStats, getEbooksByExpert } = useBizData()
  const { profile } = useAuth()
  // 전문가(승인된 지도자) 또는 관리자만 대시보드로, 그 외에는 문의하기로 유도
  const isExpert =
    (profile?.role === 'expert' && !!profile.expert_id) || profile?.role === 'admin'
  // 다중 선택 필터 — 비어 있으면 전체
  const [selected, setSelected] = useState<Set<Category>>(new Set())

  const toggle = (c: Category) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(c) ? next.delete(c) : next.add(c)
      return next
    })

  const list = experts.filter((e) => {
    if (selected.size === 0) return true
    const cats = expertCategories(e, getExpertStats(e.id).categories)
    return cats.some((c) => selected.has(c))
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-black text-stone-900">전문가</h1>
      <p className="mt-2 text-stone-500">현장에서 검증된 비즈니스 전문가를 만나보세요</p>

      {/* 카테고리 다중 선택 필터 — 여러 분야를 동시에 고를 수 있어요 */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setSelected(new Set())}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            selected.size === 0
              ? 'bg-stone-900 text-white'
              : 'border border-stone-300 bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          전체
        </button>
        {CATEGORIES.map((c) => {
          const on = selected.has(c.key)
          return (
            <button
              key={c.key}
              onClick={() => toggle(c.key)}
              aria-pressed={on}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                on
                  ? 'bg-stone-900 text-white'
                  : 'border border-stone-300 bg-white text-stone-600 hover:bg-stone-100'
              }`}
            >
              {on ? '✓ ' : ''}
              {c.key}
            </button>
          )
        })}
      </div>

      {/* 전문가 카드 그리드 */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((e) => {
          const s = getExpertStats(e.id)
          const ebookCount = getEbooksByExpert(e.id).length
          return (
            <Link
              key={e.id}
              to={`/experts/${e.id}/reviews`}
              className="group flex flex-col rounded-2xl border border-stone-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-stone-200/60"
            >
              <div className="flex items-center gap-4">
                <ExpertAvatar emoji={e.avatar} src={e.avatarUrl} size={64} />
                <div>
                  <h3 className="text-lg font-bold text-stone-900 group-hover:text-amber-700">
                    {e.name}
                  </h3>
                  <p className="text-sm font-medium text-amber-600">{e.title}</p>
                </div>
              </div>

              <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-stone-500">{e.bio}</p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {expertCategories(e, s.categories).map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600"
                  >
                    {c}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-4 border-t border-stone-100 pt-4 text-sm text-stone-500">
                <span>강의 {s.courseCount}</span>
                <span>전자책 {ebookCount}</span>
                <span className="ml-auto text-amber-600 group-hover:underline">보러가기 →</span>
              </div>
            </Link>
          )
        })}
      </div>

      {/* 전문가 진입 배너 (대시보드 진입점, md §3.6) */}
      <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-3xl border border-brand-100 bg-brand-50 px-6 py-8 sm:flex-row sm:items-center sm:px-10">
        <div>
          <h2 className="text-xl font-black text-slate-900">비즈니스 노하우를 가진 전문가이신가요?</h2>
          <p className="mt-1 text-sm text-slate-600">
            {isExpert
              ? '강의를 올리고 수익을 관리하는 전문가 대시보드로 이동하세요.'
              : '전문가로 활동하고 싶다면 문의해 주세요. 검토 후 등록을 도와드릴게요.'}
          </p>
        </div>
        <Link
          to={isExpert ? '/expert/dashboard' : '/contact'}
          className="shrink-0 rounded-xl bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700"
        >
          {isExpert ? '전문가 대시보드 →' : '문의하기 →'}
        </Link>
      </div>
    </div>
  )
}
