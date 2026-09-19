import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CATEGORIES, type Category, resolveCategory } from '../data/mock'
import { useBizData } from '../lib/useBizData'
import EbookCard from '../components/EbookCard'

type Filter = '전체' | Category
type Sort = '추천순' | '판매순' | '최신순'
const SORTS: Sort[] = ['추천순', '판매순', '최신순']

export default function AcademyEbooks() {
  const { ebooks, loading } = useBizData()
  const [params] = useSearchParams()
  const initialCat = params.get('cat')
  const validCat: Filter = resolveCategory(initialCat) ?? '전체'
  const [filter, setFilter] = useState<Filter>(validCat)
  const [sort, setSort] = useState<Sort>('추천순')
  const [freeOnly, setFreeOnly] = useState(params.get('free') === '1')

  let list = ebooks.filter(
    (e) => (filter === '전체' || e.category === filter) && (!freeOnly || e.price === 0),
  )
  list = [...list].sort((a, b) => {
    if (sort === '판매순') return b.buyerCount - a.buyerCount
    if (sort === '최신순') return ebooks.indexOf(b) - ebooks.indexOf(a)
    return 0 // 추천순 — 기본 순서
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">전자책</h1>
      <p className="mt-2 text-slate-500">바로 읽는 사업 운영 가이드 · 워크북</p>

      {/* 카테고리 필터 */}
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

      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          이 카테고리의 전자책이 없어요.
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => (
            <EbookCard key={e.id} ebook={e} />
          ))}
        </div>
      )}
    </div>
  )
}
