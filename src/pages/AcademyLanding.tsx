import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES } from '../data/mock'
import { useBizData } from '../lib/useBizData'
import { useAuth } from '../lib/auth'
import CourseCard from '../components/CourseCard'
import CourseCarousel from '../components/CourseCarousel'
import EbookCard from '../components/EbookCard'
import { maskName, resolveGradient, type PromoBanner } from '../data/mockMarketplace'

// 랜딩 — 편집 디자인 톤 (docs/plan/10-rebrand-phynesis.md §1.3)
// 섹션 리듬: 다크 히어로 → 종이색(카테고리) → 흰색(강의) → 흰색(브랜드 문장) → 다크 푸터(레이아웃)

export default function AcademyLanding() {
  const { session } = useAuth()
  const { courses, getCourse, courseReviews, ebooks, experts, banners, loading } = useBizData()
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

  // 히어로 숫자 — 실제 DB 수치만. 0이면 항목 자체를 숨긴다 (부풀리기 금지)
  const stats = [
    { value: CATEGORIES.length, label: '주제' },
    { value: courses.length, label: '강의' },
    { value: experts.length, label: '전문가' },
  ].filter((s) => s.value > 0)

  return (
    <div>
      {/* 1. 히어로 — 다크 네이비 */}
      <section className="relative overflow-hidden bg-brand-950 text-white">
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-brand-300">
            BUSINESS EDUCATION FOR PROFESSIONALS
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            실력은 있는데,
            <br />
            사업이 막힐 때.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-brand-200 sm:text-lg">
            마케팅·브랜딩·상권분석·투자·경영·인문교양. 현장에서 사업을 키운 전문가가 실전 판단을
            가르칩니다.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to={startFreeTo}
              className="rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-brand-950 transition hover:bg-brand-100"
            >
              무료 강의로 시작하기
            </Link>
            <Link to="/library" className="px-2 py-3.5 text-sm font-semibold text-white/90 hover:text-white">
              강의 둘러보기 →
            </Link>
          </div>

          {/* 숫자 — 데스크톱 우측 세로, 모바일 하단 가로 */}
          {stats.length > 0 && (
            <div className="mt-12 flex gap-8 lg:absolute lg:right-6 lg:top-24 lg:mt-0 lg:flex-col lg:gap-6">
              {stats.map((s) => (
                <div key={s.label} className="border-l border-white/20 pl-4">
                  <div className="text-2xl font-black sm:text-3xl">{s.value}</div>
                  <div className="text-[11px] tracking-[0.15em] text-brand-300">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* 배경 워터마크 */}
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-10 -right-4 select-none font-wordmark text-[140px] font-bold leading-none tracking-wide text-white/[0.04] sm:text-[200px] lg:text-[240px]"
          >
            PHYNESIS
          </div>
        </div>
      </section>

      {/* 1-1. 관리자 배너 (있을 때만) */}
      {banners.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
          <BannerCarousel banners={banners} />
        </section>
      )}

      {/* 2. 카테고리 — 종이색 배경, 편집형 표 */}
      <section className="bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <SectionHeader label="01 — 주제" title="무엇을 배우고 싶으세요?" desc="전문가의 사업에 꼭 필요한 여섯 가지 주제" />
          <div className="mt-10 grid grid-cols-1 border-t border-slate-300 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c, i) => (
              <Link
                key={c.key}
                to={`/library?cat=${encodeURIComponent(c.key)}`}
                className="group relative border-b border-slate-300 py-7 pr-10 transition sm:px-6 sm:[&:nth-child(2n)]:border-l lg:[&:nth-child(2n)]:border-l-0 lg:[&:nth-child(3n+2)]:border-l lg:[&:nth-child(3n+2)]:border-r"
              >
                <div className="text-xs tracking-[0.2em] text-gold-500">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="mt-3 text-2xl font-black text-slate-900 group-hover:text-brand-600">
                  {c.key}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{c.desc}</p>
                <span className="absolute right-1 top-7 text-slate-400 transition group-hover:translate-x-1 group-hover:text-brand-600 sm:right-6">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. 실시간 베스트 */}
      {(loading || best.length > 0) && (
        <Section>
          <SectionHeader label="02 — 베스트" title="지금 가장 많이 듣는 강의" desc="전문가들이 가장 많이 찾는 강의" moreTo="/library" />
          {loading ? <CarouselSkeleton /> : <CourseCarousel courses={best} />}
        </Section>
      )}

      {/* 4. 무료 베스트 */}
      {free.length > 0 && (
        <Section divider>
          <SectionHeader label="03 — 무료" title="부담 없이 시작하는 무료 강의" desc="먼저 들어보고 결정하세요" />
          <CourseCarousel courses={free} />
        </Section>
      )}

      {/* 5. 최신 강의 */}
      {(loading || latest.length > 0) && (
        <Section divider>
          <SectionHeader label="04 — 신규" title="새로 올라온 강의" desc="이번 달 추가된 강의" moreTo="/library" />
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
          <SectionHeader label="05 — 전자책" title="바로 읽는 사업 운영 가이드" desc="워크북·체크리스트·가이드" moreTo="/ebooks" />
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
          <SectionHeader label="06 — 후기" title="수강생들이 남긴 말" desc="실제 수강 후기" />
          <div className="no-scrollbar mt-2 overflow-hidden">
            <div className="flex w-max animate-marquee gap-4">
              {[...tickerReviews, ...tickerReviews].map((r, i) => (
                <div key={i} className="w-80 shrink-0 rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">{r.name}</span>
                    {r.rating > 0 && <span className="text-gold-500">{'★'.repeat(r.rating)}</span>}
                  </div>
                  {r.course && <div className="mt-1 text-xs text-brand-600">{r.course}</div>}
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* 8. 브랜드 문장 + CTA */}
      <section className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-gold-500">PAIDEIA + PHRONESIS</p>
          <blockquote className="mx-auto mt-5 max-w-3xl text-2xl font-black leading-snug tracking-tight text-slate-900 sm:text-4xl">
            아는 것과 판단하는 것은 다릅니다.
            <br />
            파이네시스는 두 번째를 가르칩니다.
          </blockquote>
          <p className="mx-auto mt-6 max-w-xl text-slate-500">
            지금 가입하면 무료 강의부터 바로 시청할 수 있어요.
          </p>
          <Link
            to={startFreeTo}
            className="mt-8 inline-block rounded-xl bg-brand-600 px-8 py-3.5 font-bold text-white transition hover:bg-brand-700"
          >
            무료로 시작하기
          </Link>
        </div>
      </section>
    </div>
  )
}

/* ── 자동 슬라이드 배너 (관리자 배너 탭에서 관리) ── */
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
    </>
  )
  const cls = `relative flex min-h-[180px] min-w-full flex-col justify-center bg-gradient-to-br ${resolveGradient(b.gradient)} p-7 text-white sm:min-h-[220px] sm:p-10`

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
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">{children}</div>
    </section>
  )
}

function SectionHeader({
  label,
  title,
  desc,
  moreTo,
}: {
  label?: string
  title: string
  desc: string
  moreTo?: string
}) {
  return (
    <div className="flex items-end justify-between">
      <div>
        {label && (
          <p className="text-[11px] font-bold tracking-[0.3em] text-gold-500">{label}</p>
        )}
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-500">{desc}</p>
      </div>
      {moreTo && (
        <Link to={moreTo} className="hidden text-sm font-semibold text-brand-600 hover:underline sm:block">
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
