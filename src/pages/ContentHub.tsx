import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CATEGORIES, type Category } from '../data/mock'
import { useBizData } from '../lib/useBizData'
import CourseCard from '../components/CourseCard'
import EbookCard from '../components/EbookCard'

// 컨텐츠 허브 — 강의 + 전자책 통합 (모바일 하단 "컨텐츠" 진입). 카테고리·정렬.
type Sort = '추천순' | '판매순' | '최신순'
const SORTS: Sort[] = ['추천순', '판매순', '최신순']

interface HubItem {
  kind: 'course' | 'ebook'
  id: string
  category?: Category
  price: number
  popularity: number
  order: number
  node: React.ReactNode
}

export default function ContentHub() {
  const { courses, ebooks, loading } = useBizData()
  const [params] = useSearchParams()
  const initialCat = params.get('cat')
  const validCat: '전체' | Category =
    initialCat && CATEGORIES.some((c) => c.key === initialCat) ? (initialCat as Category) : '전체'

  const [cat, setCat] = useState<'전체' | Category>(validCat)
  const [sort, setSort] = useState<Sort>('추천순')
  const [freeOnly, setFreeOnly] = useState(params.get('free') === '1')

  const items: HubItem[] = [
    ...courses.map((c, i) => ({
      kind: 'course' as const,
      id: c.id,
      category: c.category,
      price: c.price,
      popularity: c.studentCount,
      order: i,
      node: <CardWithBadge label="강의"><CourseCard course={c} /></CardWithBadge>,
    })),
    ...ebooks.map((e, i) => ({
      kind: 'ebook' as const,
      id: e.id,
      category: e.category,
      price: e.price,
      popularity: e.buyerCount,
      order: i,
      node: <CardWithBadge label="전자책"><EbookCard ebook={e} /></CardWithBadge>,
    })),
  ]

  let list = items.filter(
    (it) => (cat === '전체' || it.category === cat) && (!freeOnly || it.price === 0),
  )

  list = [...list].sort((a, b) => {
    if (sort === '판매순') return b.popularity - a.popularity
    if (sort === '최신순') return b.order - a.order
    return 0 // 추천순 — 기본 순서
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">컨텐츠</h1>
      <p className="mt-2 text-slate-500">강의와 전자책을 한 곳에서 — 사업 운영에 필요한 모든 콘텐츠</p>

      {/* 카테고리 칩 */}
      <div className="mt-6 flex flex-wrap gap-2">
        {(['전체', ...CATEGORIES.map((c) => c.key)] as ('전체' | Category)[]).map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              cat === c ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* 정렬 (추천순 / 판매순 / 최신순) + 무료 */}
      <div className="mt-5 flex items-center gap-4 border-b border-slate-200 pb-2">
        {SORTS.map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`text-sm font-bold transition ${
              sort === s ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {s}
          </button>
        ))}
        <button
          onClick={() => setFreeOnly((v) => !v)}
          aria-pressed={freeOnly}
          className={`ml-auto flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold transition ${
            freeOnly ? 'bg-emerald-600 text-white' : 'text-emerald-600 hover:bg-emerald-50'
          }`}
        >
          {freeOnly ? '✓ ' : ''}무료
        </button>
      </div>

      {/* 그리드 */}
      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          조건에 맞는 콘텐츠가 없어요.
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((it) => (
            <div key={`${it.kind}-${it.id}`}>{it.node}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function CardWithBadge({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative h-full">
      <span className="absolute left-2 top-2 z-10 rounded-md bg-slate-900/80 px-2 py-0.5 text-xs font-bold text-white backdrop-blur">
        {label}
      </span>
      {children}
    </div>
  )
}
