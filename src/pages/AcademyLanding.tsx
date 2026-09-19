import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES } from '../data/mock'
import { useBizData } from '../lib/useBizData'
import { useAuth } from '../lib/auth'
import CourseCard from '../components/CourseCard'
import CourseCarousel from '../components/CourseCarousel'
import EbookCard from '../components/EbookCard'
import { maskName, type PromoBanner } from '../data/mockMarketplace'

export default function AcademyLanding() {
  const { session } = useAuth()
  const { courses, getCourse, courseReviews, ebooks, banners, loading } = useBizData()
  // 무료로 시작하기: 로그인 → 컨텐츠(무료 필터), 비로그인 → 로그인 페이지
  const startFreeTo = session ? '/content?free=1' : '/auth'

  const best = [...courses].sort((a, b) => b.studentCount - a.studentCount)
  const free = courses.filter((c) => c.price === 0)
  const latest = [...courses].reverse()

  const tickerReviews = courseReviews
    .filter((r) => !r.hidden)
    .map((r) => ({
      id: r.id,
      name: maskName(r.userName),
      rating: r.rating ?? 0,
      course: getCourse(r.courseId)?.title ?? '',
      text: r.content,
    }))

  return (
    <div>
      {/* 1. 히어로 + 자동 슬라이드 배너 */}
      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <h1 className="text-center text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          내 사업, 오늘은 무엇을 배워볼까요?
        </h1>
        <p className="mt-2 text-center text-slate-500">
          마케팅·브랜딩·상권분석·투자·경영·인문교양 — 현장에서 사업을 키운 전문가의 강의
        </p>
        <div className="mt-7">
          <BannerCarousel banners={banners} />
        </div>
      </section>

      {/* 2. 카테고리 */}
      <Section>
        <SectionHeader title="무엇을 배우고 싶으세요?" desc="전문가의 사업에 꼭 필요한 6가지 주제" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.key}
              to={`/library?cat=${encodeURIComponent(c.key)}`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-violet-300 hover:shadow-md"
            >
              <div className="text-3xl">{c.emoji}</div>
              <h3 className="mt-3 font-bold text-slate-900 group-hover:text-violet-700">{c.key}</h3>
              <p className="mt-1 text-sm text-slate-500">{c.desc}</p>
            </Link>
          ))}
        </div>
      </Section>

      {/* 3. 실시간 베스트 */}
      {(loading || best.length > 0) && (
        <Section divider>
          <SectionHeader title="실시간 베스트" desc="전문가들이 가장 많이 찾는 강의" moreTo="/library" />
          {loading ? <CarouselSkeleton /> : <CourseCarousel courses={best} />}
        </Section>
      )}

      {/* 4. 무료 베스트 */}
      {free.length > 0 && (
        <Section divider>
          <SectionHeader title="무료 베스트" desc="부담 없이 시작하는 무료 강의" />
          <CourseCarousel courses={free} />
        </Section>
      )}

      {/* 5. 최신 강의 */}
      {(loading || latest.length > 0) && (
        <Section divider>
          <SectionHeader title="최신 강의" desc="새로 올라온 강의를 만나보세요" moreTo="/library" />
          {loading ? (
            <GridSkeleton />
          ) : (
            <div className="mt-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          )}
        </Section>
      )}

      {/* 6. 인기 전자책 */}
      {ebooks.length > 0 && (
        <Section divider>
          <SectionHeader title="인기 전자책" desc="바로 읽는 사업 운영 가이드" moreTo="/ebooks" />
          <div className="no-scrollbar -mx-4 mt-2 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
            {ebooks.map((e) => (
              <div key={e.id} className="w-64 shrink-0 snap-start sm:w-72">
                <EbookCard ebook={e} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 7. 실시간 후기 (마퀴) */}
      {tickerReviews.length > 0 && (
        <Section divider>
          <SectionHeader title="실시간 후기" desc="수강생들이 남긴 생생한 후기" />
          <div className="no-scrollbar mt-2 overflow-hidden">
            <div className="flex w-max animate-marquee gap-4">
              {[...tickerReviews, ...tickerReviews].map((r, i) => (
                <div
                  key={i}
                  className="w-80 shrink-0 rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">{r.name}</span>
                    {r.rating > 0 && <span className="text-amber-400">{'★'.repeat(r.rating)}</span>}
                  </div>
                  {r.course && <div className="mt-1 text-xs text-violet-600">{r.course}</div>}
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* CTA */}
      <section className="px-4 pb-16 pt-12 sm:px-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-violet-100 bg-violet-50 px-6 py-12 text-center sm:px-12">
          <h2 className="text-2xl font-black text-zinc-900 sm:text-3xl">사업 고민, 이제 혼자 하지 마세요</h2>
          <p className="mx-auto mt-3 max-w-xl text-zinc-600">
            지금 가입하면 무료 강의부터 바로 시청할 수 있어요.
          </p>
          <Link
            to={startFreeTo}
            className="mt-7 inline-block rounded-xl bg-violet-600 px-8 py-3 font-bold text-white hover:bg-violet-700"
          >
            무료로 시작하기
          </Link>
        </div>
      </section>
    </div>
  )
}

/* ── 자동 슬라이드 배너 ── */
function BannerCarousel({ banners }: { banners: PromoBanner[] }) {
  const [idx, setIdx] = useState(0)
  const n = banners.length

  useEffect(() => {
    if (n <= 1) return
    const t = setInterval(() => setIdx((i) => (i + 1) % n), 4500)
    return () => clearInterval(t)
  }, [n])

  if (n === 0) return null

  return (
    <div className="group relative overflow-hidden rounded-2xl">
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {banners.map((b, i) => (
          <BannerSlide key={b.id ?? `${b.title}-${i}`} banner={b} />
        ))}
      </div>

      {/* 좌우 화살표 (데스크톱 hover) */}
      <button
        onClick={() => setIdx((i) => (i - 1 + n) % n)}
        className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-slate-700 opacity-0 transition group-hover:opacity-100 md:grid"
        aria-label="이전"
      >
        ‹
      </button>
      <button
        onClick={() => setIdx((i) => (i + 1) % n)}
        className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-slate-700 opacity-0 transition group-hover:opacity-100 md:grid"
        aria-label="다음"
      >
        ›
      </button>

      {/* 인디케이터 점 */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-2 rounded-full transition-all ${
              i === idx ? 'w-5 bg-white' : 'w-2 bg-white/50'
            }`}
            aria-label={`배너 ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

/* 배너 한 장 — link가 있으면 내부 라우트(Link) / 외부 URL(a)로 이동 */
function BannerSlide({ banner: b }: { banner: PromoBanner }) {
  const inner = (
    <>
      <h2 className="text-xl font-black sm:text-2xl">{b.title}</h2>
      <p className="mt-1 max-w-sm text-sm text-white/85">{b.subtitle}</p>
      {b.cta && (
        <span className="mt-5 w-fit rounded-xl bg-white/95 px-5 py-2.5 text-sm font-bold text-slate-900 transition group-hover:bg-white">
          {b.cta} →
        </span>
      )}
      <span className="pointer-events-none absolute -right-6 -top-8 text-[120px] opacity-15">🎓</span>
    </>
  )
  const cls = `relative flex min-h-[180px] min-w-full flex-col justify-center bg-gradient-to-br ${b.gradient} p-7 text-white sm:min-h-[220px] sm:p-10`

  if (!b.link) return <div className={cls}>{inner}</div>
  if (b.link.startsWith('/'))
    return (
      <Link to={b.link} className={cls}>
        {inner}
      </Link>
    )
  return (
    <a href={b.link} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  )
}

/* ── 헬퍼 ── */
function Section({ children, divider }: { children: React.ReactNode; divider?: boolean }) {
  return (
    <section className={divider ? 'border-t border-slate-100' : ''}>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">{children}</div>
    </section>
  )
}

function SectionHeader({ title, desc, moreTo }: { title: string; desc: string; moreTo?: string }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="text-xl font-black text-slate-900 sm:text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{desc}</p>
      </div>
      {moreTo && (
        <Link
          to={moreTo}
          className="hidden text-sm font-semibold text-violet-600 hover:underline sm:block"
        >
          전체 보기 →
        </Link>
      )}
    </div>
  )
}

function CarouselSkeleton() {
  return (
    <div className="mt-2 flex gap-4 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-72 w-64 shrink-0 animate-pulse rounded-2xl bg-slate-100 sm:w-72" />
      ))}
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="mt-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  )
}
