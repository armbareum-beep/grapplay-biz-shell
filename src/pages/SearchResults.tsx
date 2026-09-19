import { useState } from 'react'
import Icon, { EmptyIcon } from '../components/Icon'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useBizData } from '../lib/useBizData'
import CourseCard from '../components/CourseCard'
import EbookCard from '../components/EbookCard'

// 통합 검색 — 강의 / 전자책 / 전문가를 종류별 섹션으로 표시
export default function SearchResults() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const q = (params.get('q') ?? '').trim()
  const { courses, ebooks, experts, getExpertStats, loading } = useBizData()
  const [input, setInput] = useState(q)

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const v = input.trim()
    if (v) navigate(`/search?q=${encodeURIComponent(v)}`)
  }

  const has = (s?: string) => !!s && s.includes(q)
  const courseHits = q ? courses.filter((c) => has(c.title) || has(c.subtitle) || has(c.category)) : []
  const ebookHits = q ? ebooks.filter((e) => has(e.title) || has(e.subtitle) || has(e.author) || has(e.category)) : []
  const expertHits = q ? experts.filter((x) => has(x.name) || has(x.title) || has(x.bio)) : []
  const total = courseHits.length + ebookHits.length + expertHits.length

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* 검색 입력 */}
      <form onSubmit={onSearch} className="relative mx-auto max-w-2xl">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="search" size={16} /></span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="강의·전자책·전문가 검색"
          autoFocus
          className="w-full rounded-full border border-slate-300 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
        />
      </form>

      {!q ? (
        <p className="mt-10 text-center text-slate-400">검색어를 입력해 강의·전자책·전문가를 찾아보세요.</p>
      ) : loading ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="mt-16 text-center">
          <EmptyIcon name="search" />
          <p className="mt-4 font-bold text-slate-800">'{q}' 검색 결과가 없어요</p>
          <p className="mt-1 text-sm text-slate-500">다른 키워드로 검색해 보세요.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-12">
          <p className="text-sm text-slate-500">
            <span className="font-bold text-slate-900">'{q}'</span> 검색 결과 {total}건
          </p>

          {courseHits.length > 0 && (
            <section>
              <SectionHeader title="강의" count={courseHits.length} />
              <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {courseHits.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            </section>
          )}

          {ebookHits.length > 0 && (
            <section>
              <SectionHeader title="전자책" count={ebookHits.length} />
              <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {ebookHits.map((e) => (
                  <EbookCard key={e.id} ebook={e} />
                ))}
              </div>
            </section>
          )}

          {expertHits.length > 0 && (
            <section>
              <SectionHeader title="전문가" count={expertHits.length} />
              <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {expertHits.map((e) => {
                  const s = getExpertStats(e.id)
                  return (
                    <Link
                      key={e.id}
                      to={`/experts/${e.id}/reviews`}
                      className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60"
                    >
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-amber-100 text-3xl">
                        {e.avatar}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-slate-900">{e.name}</h3>
                        <p className="truncate text-sm text-amber-600">{e.title}</p>
                        <p className="mt-1 text-xs text-slate-400">★ {s.rating.toFixed(1)} · 강의 {s.courseCount}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-slate-200 pb-2">
      <h2 className="text-lg font-black text-slate-900">{title}</h2>
      <span className="text-sm font-semibold text-brand-600">{count}</span>
    </div>
  )
}
