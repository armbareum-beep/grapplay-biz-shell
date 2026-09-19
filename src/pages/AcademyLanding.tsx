import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, type Category } from '../data/mock'
import { useBizData } from '../lib/useBizData'
import { useAuth } from '../lib/auth'
import CourseCard from '../components/CourseCard'
import CourseCarousel from '../components/CourseCarousel'
import EbookCard from '../components/EbookCard'
import ExpertAvatar from '../components/ExpertAvatar'
import Icon from '../components/Icon'
import { COVER_BY_CATEGORY, COVER_DEFAULT, formatPrice, type Course } from '../data/mock'
import { maskName } from '../data/mockMarketplace'

// 랜딩 — 정보 구조: 문제 제시 → 콘텐츠 → 철학 → 신뢰(전문가·후기) → 가입
// (docs/plan/10-rebrand-phynesis.md §1.3). 강의몰 순서(카테고리 → 인기 → 최신)를 쓰지 않는다.
// '분야'(카테고리 편집형 표)는 '01 매일의 판단' 질문 목록과 내용이 겹쳐 제거(2026-09-19).
// 섹션 리듬: 다크 히어로 → 흰색(판단) → 흰색(강의) → 다크(철학) → 흰색(전문가·후기) → 종이색(CTA) → 다크 푸터

// 사업가가 매일 마주치는 판단 — 각 질문이 해당 카테고리 필터로 이어진다
const DECISIONS: { q: string; cat: Category }[] = [
  { q: '어떻게 고객을 늘릴 것인가', cat: '마케팅' },
  { q: '사람들은 나를 무엇으로 기억하는가', cat: '브랜딩' },
  { q: '어디에서 시작할 것인가', cat: '상권분석' },
  { q: '번 돈을 어떻게 키울 것인가', cat: '투자' },
  { q: '직원을 더 뽑아야 하는가, 가격을 올려야 하는가', cat: '경영' },
  { q: '무엇을 기준으로 결정할 것인가', cat: '인문교양' },
]

export default function AcademyLanding() {
  const { session } = useAuth()
  const { courses, getCourse, courseReviews, ebooks, experts, loading } = useBizData()
  // 시작하기: 로그인 → 컨텐츠(무료 필터), 비로그인 → 로그인 페이지
  const startFreeTo = session ? '/content?free=1' : '/auth'

  const best = [...courses].sort((a, b) => b.studentCount - a.studentCount)
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

  // 후기 집계 (별점 있는 공개 후기만)
  const rated = courseReviews.filter((r) => !r.hidden && (r.rating ?? 0) > 0)
  const ratingSummary = rated.length
    ? { avg: rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length, count: rated.length }
    : null
  // 전문가별 강의 수
  const courseCountByExpert: Record<string, number> = {}
  for (const c of courses) courseCountByExpert[c.expertId] = (courseCountByExpert[c.expertId] ?? 0) + 1

  // 히어로 숫자 — 실제 DB 수치만. 0이면 항목 자체를 숨긴다 (부풀리기 금지)
  const stats = [
    { value: CATEGORIES.length, label: '주제' },
    { value: courses.length, label: '강의' },
    { value: experts.length, label: '전문가' },
  ].filter((s) => s.value > 0)

  return (
    <div>
      {/* 1. 히어로 — 다크 네이비 */}
      <section className="bg-dots relative overflow-hidden bg-brand-950 text-white">
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-brand-300">BUSINESS EDUCATION</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            실력은 있는데,
            <br />
            사업이 막힐 때
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-brand-200 sm:text-lg">
            실천적 지혜를 사업에 적용하세요
          </p>
          <div className="mt-9">
            <Link
              to={startFreeTo}
              className="rounded-lg bg-white px-6 py-3.5 text-sm font-bold text-brand-950 transition hover:bg-brand-100"
            >
              파이네시스 시작하기 →
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

      {/* 2. 사업가가 매일 마주치는 판단 — 문제 제시 */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <div>
              <h2 className="text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl">
                사업을 하다 보면
                <br />
                매일 판단해야 합니다
              </h2>
              <p className="mt-6 max-w-sm leading-relaxed text-slate-500">
                파이네시스는 정답을 외우는 곳이 아니라
                <br className="hidden sm:block" /> 더 나은 판단을 배우는 곳입니다
              </p>
            </div>
            <ul className="divide-y divide-slate-200 border-y border-slate-200">
              {DECISIONS.map((d) => (
                <li key={d.cat}>
                  <Link
                    to={`/library?cat=${encodeURIComponent(d.cat)}`}
                    className="group flex items-baseline justify-between gap-6 py-5 transition hover:pl-2"
                  >
                    <span className="text-lg font-bold text-slate-900 sm:text-xl">{d.q}</span>
                    <span className="shrink-0 text-xs font-semibold tracking-wider text-slate-400 group-hover:text-brand-600">
                      {d.cat} →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 3. 지금 사업가들이 고민하는 문제 — 콘텐츠 */}
      {(loading || best.length > 0) && (
        <Section divider>
          <SectionHeader
            title="지금 사업가들이 고민하는 문제"
            desc="가장 많이 찾는 강의부터"
            moreTo="/library"
          />
          {loading ? (
            <CarouselSkeleton />
          ) : (
            <>
              <FeaturedCourse course={best[0]} />
              {best.length > 1 && (
                <div className="mt-8">
                  <CourseCarousel courses={best.slice(1)} />
                </div>
              )}
            </>
          )}
        </Section>
      )}

      {/* 4. 새 강의 + 전자책 (있을 때만) */}
      {(loading || latest.length > 0) && (
        <Section>
          <SectionHeader title="새로 올라온 강의" desc="이번 달 추가된 강의" moreTo="/library" />
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
      {ebooks.length > 0 && (
        <Section divider>
          <SectionHeader title="바로 읽는 사업 운영 가이드" desc="워크북·체크리스트·가이드" moreTo="/ebooks" />
          <div className="no-scrollbar -mx-4 mt-2 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
            {ebooks.map((e) => (
              <div key={e.id} className="w-64 shrink-0 snap-start sm:w-72">
                <EbookCard ebook={e} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 5. 철학 — 다크. 브랜드가 기억되는 장면. 모바일에서도 PAIDEIA/PHRONESIS를 2열로 두고
          여백을 좁혀 스크롤 길이를 줄인다(2026-09-19). */}
      <section className="bg-dots relative overflow-hidden bg-brand-950 text-white">
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-28">
          <div className="grid grid-cols-2 gap-6 sm:gap-12 lg:gap-20">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.3em] text-brand-300">PAIDEIA</p>
              <p className="mt-2 text-xl font-black sm:mt-3 sm:text-3xl">파이데이아</p>
              <p className="mt-2 text-sm leading-relaxed text-brand-200 sm:mt-4 sm:text-base">
                사람을 성장시키는 배움
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.3em] text-brand-300">PHRONESIS</p>
              <p className="mt-2 text-xl font-black sm:mt-3 sm:text-3xl">프로네시스</p>
              <p className="mt-2 text-sm leading-relaxed text-brand-200 sm:mt-4 sm:text-base">
                현실에서 더 나은 결정을 내리는 실천적 지혜
              </p>
            </div>
          </div>
          <div className="mt-10 border-t border-white/10 pt-8 sm:mt-20 sm:pt-16">
            <p className="text-2xl font-black leading-tight tracking-tight sm:text-5xl">
              우리는 이 둘을
              <br />
              사업에 연결합니다
            </p>
            <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-2 sm:mt-10">
              <span className="font-wordmark text-4xl font-bold tracking-wide sm:text-7xl">PHYNESIS</span>
              <span className="font-wordmark text-xl font-bold text-brand-300 sm:text-3xl">파이네시스</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. 전문가 — 신뢰 */}
      {experts.length > 0 && (
        <Section>
          <SectionHeader title="현장에서 사업을 키운 사람들" desc="이론이 아니라 자기 사업으로 증명한 전문가" moreTo="/experts" />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {experts.map((e) => (
              <Link
                key={e.id}
                to={`/experts/${e.id}/reviews`}
                className="group flex gap-4 border-t border-slate-200 pt-5 transition hover:border-brand-600"
              >
                <ExpertAvatar emoji={e.avatar} src={e.avatarUrl} size={56} rounded="rounded-lg" fallbackBg="bg-slate-100" />
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 group-hover:text-brand-600">{e.name}</div>
                  <div className="mt-0.5 text-sm text-slate-500">{e.title}</div>
                  {e.credentials && e.credentials.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                      {e.credentials.slice(0, 2).map((c) => (
                        <li key={c} className="truncate">
                          <span className="mr-1 text-brand-600">✓</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 text-[11px] tracking-wider text-slate-400">
                    {courseCountByExpert[e.id] > 0 && (
                      <span className="font-semibold text-slate-600">강의 {courseCountByExpert[e.id]}개</span>
                    )}
                    {(e.categories ?? (e.category ? [e.category] : [])).length > 0 && (
                      <span>{(e.categories ?? [e.category]).join(' · ')}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* 7. 후기 (마퀴) — 신뢰 */}
      {tickerReviews.length > 0 && (
        <Section divider>
          <SectionHeader title="수강생들이 남긴 말" desc="실제 수강 후기" />
          {ratingSummary && (
            <div className="mt-6 flex items-center gap-4 text-sm">
              <span className="text-2xl font-black text-slate-900">
                <span className="mr-1 text-amber-400">★</span>
                {ratingSummary.avg.toFixed(1)}
                <span className="ml-1 text-sm font-medium text-slate-400">/ 5.0</span>
              </span>
              <span className="h-5 w-px bg-slate-200" />
              <span className="font-semibold text-slate-700">{ratingSummary.count}개의 리뷰</span>
            </div>
          )}
          <div className="no-scrollbar mt-6 overflow-hidden">
            <div className="flex w-max animate-marquee gap-4">
              {[...tickerReviews, ...tickerReviews].map((r, i) => (
                <div key={i} className="w-80 shrink-0 rounded-lg border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">{r.name}</span>
                    {r.rating > 0 && <span className="text-amber-400">{'★'.repeat(r.rating)}</span>}
                  </div>
                  {r.course && <div className="mt-1 text-xs text-brand-600">{r.course}</div>}
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* 8. 최종 CTA — 종이색 */}
      <section className="bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
            사업의 모든 답을
            <br />
            알 필요는 없습니다
          </p>
          <p className="mt-6 text-2xl font-bold leading-snug text-slate-700 sm:text-3xl">
            더 나은 판단을
            <br />
            할 수 있으면 됩니다
          </p>
          <p className="mt-8 max-w-md text-slate-500">파이네시스와 함께 사업을 배우고 성장하세요</p>
          <Link
            to={startFreeTo}
            className="mt-8 inline-block rounded-lg bg-brand-600 px-8 py-3.5 font-bold text-white transition hover:bg-brand-700"
          >
            파이네시스 시작하기 →
          </Link>
          <p className="mt-4 text-sm text-slate-400">가입만 하면 무료 강의를 바로 볼 수 있습니다</p>
        </div>
      </section>
    </div>
  )
}

/* ── 대표 강의 미리보기 카드 — 가장 많이 듣는 강의 1개를 크게. 미리보기 강좌가 있으면 재생 버튼이 #video 로 간다 ── */
function FeaturedCourse({ course }: { course: Course }) {
  const { getExpert, getCourseRating } = useBizData()
  const expert = getExpert(course.expertId)
  const { rating, count } = getCourseRating(course.id)
  const preview = course.curriculum.find((l) => l.preview)
  const to = preview ? `/courses/${course.id}#video` : `/courses/${course.id}`
  return (
    <Link
      to={to}
      className="group mt-8 grid overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-brand-600 lg:grid-cols-[3fr_2fr]"
    >
      <div
        className={`relative aspect-[16/9] bg-gradient-to-br lg:aspect-auto lg:min-h-[320px] ${COVER_BY_CATEGORY[course.category] ?? COVER_DEFAULT}`}
      >
        {course.coverImage && (
          <>
            <img src={course.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-slate-950/40 transition group-hover:bg-slate-950/30" />
          </>
        )}
        <span className="absolute left-4 top-4 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold tracking-wider text-white backdrop-blur">
          {course.category}
        </span>
        {/* 재생 버튼 */}
        <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-brand-950 shadow-lg transition group-hover:scale-105">
          <Icon name="play-circle" size={30} strokeWidth={1.5} />
        </span>
        {preview && (
          <span className="absolute bottom-4 left-4 rounded-md bg-slate-950/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            무료 미리보기 · {preview.title}
          </span>
        )}
      </div>
      <div className="flex flex-col p-6 sm:p-8">
        <p className="text-[11px] font-bold tracking-[0.3em] text-slate-400">FEATURED</p>
        <h3 className="mt-3 text-2xl font-black leading-snug text-slate-900 group-hover:text-brand-600 sm:text-3xl">
          {course.title}
        </h3>
        {course.subtitle && <p className="mt-3 text-slate-500">{course.subtitle}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
          {expert && (
            <span className="flex items-center gap-1.5">
              <ExpertAvatar emoji={expert.avatar} src={expert.avatarUrl} size={20} />
              {expert.name}
            </span>
          )}
          <span>{course.lessonCount}강 · {course.durationMin}분</span>
          {count > 0 && (
            <span>
              <span className="text-amber-400">★</span> {rating.toFixed(1)} ({count})
            </span>
          )}
        </div>
        <div className="mt-auto flex items-end justify-between pt-8">
          <span className={`text-xl font-black ${course.price > 0 ? 'text-slate-900' : 'text-brand-600'}`}>
            {formatPrice(course.price)}
          </span>
          <span className="text-sm font-semibold text-brand-600 group-hover:underline">
            {preview ? '미리보기 재생 →' : '자세히 →'}
          </span>
        </div>
      </div>
    </Link>
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
  title,
  desc,
  moreTo,
}: {
  title: string
  desc: string
  moreTo?: string
}) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
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
        <div key={i} className="h-72 w-64 shrink-0 animate-pulse rounded-lg bg-slate-100 sm:w-72" />
      ))}
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="mt-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-72 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  )
}
