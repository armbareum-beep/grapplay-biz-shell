import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CATEGORIES, Category, resolveCategory } from '../data/mock'
import { useBizData } from '../lib/useBizData'
import CourseCard from '../components/CourseCard'

type Filter = '전체' | Category
type Sort = '추천순' | '판매순' | '최신순'
const SORTS: Sort[] = ['추천순', '판매순', '최신순']

export default function AcademyLibrary() {
  const { courses, loading } = useBizData()
  const [params] = useSearchParams()
  const initialCat = params.get('cat')
  const validCat: Filter = resolveCategory(initialCat) ?? '전체'
  const [filter, setFilter] = useState<Filter>(validCat)
  const [sort, setSort] = useState<Sort>('추천순')
  const [freeOnly, setFreeOnly] = useState(params.get('free') === '1')

  let list = courses.filter(
    (c) => (filter === '전체' || c.category === filter) && (!freeOnly || c.price === 0),
  )

  list = [...list].sort((a, b) => {
    if (sort === '판매순') return b.studentCount - a.studentCount
    if (sort === '최신순') return courses.indexOf(b) - courses.indexOf(a)
    return 0 // 추천순 — 기본 순서
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-black text-stone-900">강의 둘러보기</h1>
      <p className="mt-2 text-stone-500">사업 운영에 필요한 모든 강의를 한곳에서</p>

      {/* 카테고리 칩 */}
      <div className="mt-6 flex flex-wrap gap-2">
        {(['전체', ...CATEGORIES.map((c) => c.key)] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === f
                ? 'bg-slate-900 text-white'
                : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {f}
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

      {/* 결과 */}
      <p className="mt-4 text-sm text-stone-500">
        {loading ? '불러오는 중…' : `총 ${list.length}개 강의`}
      </p>

      {loading ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-2xl border border-stone-200 bg-stone-100"
            />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-stone-300 bg-white py-20 text-center">
          <div className="text-4xl">🔍</div>
          <p className="mt-4 font-semibold text-stone-700">강의가 없어요</p>
          <p className="mt-1 text-sm text-stone-500">다른 카테고리로 찾아보세요.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </div>
  )
}
