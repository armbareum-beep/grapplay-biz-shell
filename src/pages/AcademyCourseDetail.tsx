import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { formatPrice, type Course } from '../data/mock'
import { useBizData } from '../lib/useBizData'
import { useAuth } from '../lib/auth'
import { useWishlist } from '../lib/wishlist'
import { blockClass, blockStyle } from '../lib/detailBlocks'
import { supabase } from '../lib/supabase'
import { enrollFree, addCourseReview } from '../lib/userData'
import { trackPageView } from '../lib/pageViews'
import { toEmbedUrl, fetchVimeoPortrait } from '../lib/video'
import CourseCard from '../components/CourseCard'
import PurchaseBar from '../components/PurchaseBar'
import ReviewSection from '../components/ReviewSection'
import ExpertAvatar from '../components/ExpertAvatar'
import { Stars } from '../components/Stars'
import { getCourseMeta, discountPct, EXPERT_CREDENTIALS } from '../data/mockMarketplace'

const NOTICES = [
  '결제 후 강의는 마이페이지 > 내 강의에서 바로 수강할 수 있습니다.',
  '강의 콘텐츠의 무단 복제·배포·공유는 저작권법에 의해 금지됩니다.',
  '사용기한은 구매일로부터 최대 1년이며, 기한 내 무제한 시청할 수 있습니다(추가 비용 없음).',
  '강의는 지속적으로 업데이트되며, 추가 비용 없이 시청할 수 있습니다.',
  '사용기한이 종료된 이후에는 해당 강의의 시청이 제한될 수 있습니다.',
  '환불은 파이네시스 환불정책에 따라 처리됩니다. 자세한 내용은 고객센터로 문의해 주세요.',
]

const TABS = [
  { id: 'video', label: '영상' },
  { id: 'intro', label: '상세' },
  { id: 'curriculum', label: '커리큘럼' },
  { id: 'expert', label: '강사소개' },
  { id: 'reviews', label: '후기' },
]

export default function AcademyCourseDetail() {
  const { id } = useParams()
  const { getCourse, getExpert, getCoursesByExpert, getCourseReviews, getCourseRating, refetch, loading } =
    useBizData()
  const { user, profile, loading: authLoading } = useAuth()
  const course = getCourse(id ?? '')
  const [enrolled, setEnrolled] = useState(false)
  // 상단 하이라이트 플레이어가 보여줄 레슨 (미리보기 클릭 시 전환)
  const [activeIdx, setActiveIdx] = useState(0)

  // 강의 로드 시 첫 미리보기 레슨으로 기본 설정
  useEffect(() => {
    if (!course) return
    const firstPreview = course.curriculum.findIndex((l) => l.preview)
    setActiveIdx(firstPreview >= 0 ? firstPreview : 0)
  }, [course?.id])

  // 상세페이지 조회 기록 (소유 지도자·관리자 본인 조회는 집계에서 제외)
  useEffect(() => {
    if (!course || authLoading) return
    if (profile?.role === 'admin' || (profile?.expert_id && profile.expert_id === course.expertId)) return
    trackPageView('course', course.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id, authLoading, profile?.expert_id, profile?.role])

  // 수강 여부 (영상 잠금 해제용)
  useEffect(() => {
    if (!user || !supabase || !id) {
      setEnrolled(false)
      return
    }
    let active = true
    supabase
      .from('enrollments')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('item_type', 'course')
      .eq('item_id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setEnrolled(!!data)
      })
    return () => {
      active = false
    }
  }, [user, id])

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        <div className="mt-8 h-8 w-1/2 animate-pulse rounded bg-slate-100" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="text-5xl">🤔</div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">강의를 찾을 수 없어요</h1>
        <Link
          to="/library"
          className="mt-6 inline-block rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700"
        >
          강의 목록으로
        </Link>
      </div>
    )
  }

  const expert = getExpert(course.expertId)
  const meta = getCourseMeta(course.id)
  const credentials = expert?.credentials?.length
    ? expert.credentials
    : EXPERT_CREDENTIALS[course.expertId] ?? []
  // 공개 화면에서는 전문가가 숨긴 리뷰를 제외
  const reviews = getCourseReviews(course.id).filter((r) => !r.hidden)
  const { rating: avgRating, count: ratingCount } = getCourseRating(course.id)
  const myEmail = user?.email ?? ''
  const alreadyWrote = !!myEmail && reviews.some((r) => r.userEmail === myEmail)
  const submitReview = (rating: number, content: string) =>
    addCourseReview({
      courseId: course.id,
      userName: profile?.display_name || myEmail || '수강생',
      userEmail: myEmail,
      content,
      rating,
    }).then((res) => {
      if (!res.error) refetch()
      return res
    })
  const related = getCoursesByExpert(course.expertId).filter((c) => c.id !== course.id)

  return (
    <div className="pb-28 md:pb-0">
      {/* 상단+본문 — 좌(영상·콘텐츠) / 우(구매 카드, sticky) 2단 */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 md:grid md:grid-cols-[1fr_340px] md:gap-8">
        {/* 좌측 컬럼 */}
        <div className="min-w-0">
          <div className="pt-5 text-sm font-bold text-violet-600 md:pt-8">{course.category}</div>

          {/* 영상 플레이어 (미리보기 하이라이트) */}
          <section id="video" className="mt-3 scroll-mt-32">
            <LessonPlayer course={course} activeIdx={activeIdx} />
            {/* 모바일 제목/메타 (데스크톱은 우측 카드에) */}
            <div className="mt-4 md:hidden">
              <h1 className="text-xl font-black leading-tight text-slate-900">{course.title}</h1>
              <p className="mt-1 text-slate-600">{course.subtitle}</p>
              {expert && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <ExpertAvatar
                    emoji={expert.avatar}
                    src={expert.avatarUrl}
                    size={28}
                    fallbackBg="bg-violet-100"
                  />
                  <span className="font-semibold text-slate-700">{expert.name}</span>
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                {ratingCount > 0 && (
                  <span className="font-semibold text-amber-400">
                    ★ <span className="text-slate-700">{avgRating.toFixed(1)}</span>
                    <span className="text-slate-400"> ({ratingCount})</span>
                  </span>
                )}
                <span>{course.lessonCount}강</span>
              </div>
            </div>
          </section>

          {/* 앵커 탭 */}
          <nav className="sticky top-[7.25rem] z-30 mt-6 border-b border-slate-200 bg-white/95 backdrop-blur md:top-20">
            <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className="whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-600 hover:border-violet-500 hover:text-violet-600"
            >
              {t.label}
              {t.id === 'reviews' && reviews.length > 0 && (
                <span className="ml-1 text-violet-500">{reviews.length}</span>
              )}
            </a>
          ))}
        </div>
      </nav>

          <div className="space-y-14 py-12">
        {/* 4. 상세페이지 (강의 소개 + 블록) */}
        <section id="intro" className="scroll-mt-32">
          <h2 className="text-xl font-black text-slate-900">강의 소개</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
              📅 업데이트 26.03.13
            </span>
            {meta.accessPeriod && (
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                ⏳ {meta.accessPeriod}
              </span>
            )}
          </div>
          <p className="mt-4 leading-relaxed text-slate-600">{course.summary}</p>

          {/* 리치 상세페이지 (전문가 블록 에디터 — use_landing_page). 없으면 아무것도 안 보임 */}
          {course.useLandingPage && (course.detailBlocks?.length ?? 0) > 0 && (
            <div className="mt-6 space-y-4">
              {course.detailBlocks!.map((b) =>
                b.type === 'heading' ? (
                  <h3
                    key={b.id}
                    className={`${blockClass(b)} ${b.color ? '' : 'text-slate-900'}`}
                    style={blockStyle(b)}
                  >
                    {b.value}
                  </h3>
                ) : b.type === 'text' ? (
                  <p
                    key={b.id}
                    className={`whitespace-pre-line leading-relaxed ${blockClass(b)} ${b.color ? '' : 'text-slate-600'}`}
                    style={blockStyle(b)}
                  >
                    {b.value}
                  </p>
                ) : b.value ? (
                  <img
                    key={b.id}
                    src={b.value}
                    alt=""
                    className="w-full rounded-2xl border border-slate-200"
                  />
                ) : null,
              )}
            </div>
          )}
        </section>

        {/* 4. 커리큘럼 */}
        <section id="curriculum" className="scroll-mt-32">
          <h2 className="text-xl font-black text-slate-900">커리큘럼</h2>
          <p className="mt-1 text-sm text-slate-500">
            총 {course.lessonCount}강 · 약 {Math.round(course.durationMin / 60)}시간
          </p>
          <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {course.curriculum.map((l, i) => {
              const canPreview = !!l.preview
              const isActive = canPreview && i === activeIdx
              return (
                <div
                  key={i}
                  className={`flex items-center gap-4 p-4 ${isActive ? 'bg-violet-50' : ''}`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${
                      isActive ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 font-medium text-slate-800">{l.title}</span>
                  {canPreview ? (
                    <button
                      onClick={() => {
                        setActiveIdx(i)
                        document.getElementById('video')?.scrollIntoView({ behavior: 'smooth' })
                      }}
                      className="rounded-full bg-violet-600 px-2.5 py-0.5 text-[11px] font-semibold text-white hover:bg-violet-700"
                    >
                      ▶ 미리보기
                    </button>
                  ) : (
                    <span className="text-slate-300">🔒</span>
                  )}
                  <span className="text-sm text-slate-400">{l.durationMin}분</span>
                </div>
              )
            })}
            {course.lessonCount > course.curriculum.length && (
              <div className="bg-slate-50 p-4 text-center text-sm text-slate-400">
                + 외 {course.lessonCount - course.curriculum.length}개 강의
              </div>
            )}
          </div>
        </section>

        {/* 5. 강사소개 */}
        <section id="expert" className="scroll-mt-32">
          <h2 className="text-xl font-black text-slate-900">강사소개</h2>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-start gap-4">
              <ExpertAvatar
                emoji={expert?.avatar}
                src={expert?.avatarUrl}
                size={64}
                fallbackBg="bg-violet-100"
              />
              <div>
                <h3 className="text-lg font-bold text-slate-900">{expert?.name}</h3>
                <p className="text-sm font-medium text-violet-600">{expert?.title}</p>
                <p className="mt-2 leading-relaxed text-slate-600">{expert?.bio}</p>
              </div>
            </div>
            {credentials.length > 0 && (
              <ul className="mt-4 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-2">
                {credentials.map((c) => (
                  <li key={c} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="text-violet-500">✓</span> {c}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 6. 이런 걸 배워요 */}
        <section className="scroll-mt-32">
          <h2 className="text-xl font-black text-slate-900">이런 걸 배워요</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {course.whatYouLearn.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
              >
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-100 text-sm text-violet-600">
                  ✓
                </span>
                <span className="text-slate-700">{w}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 7. 후기 — 실제 별점+후기 */}
        <ReviewSection
          title="수강생 후기"
          items={reviews}
          avg={avgRating}
          count={ratingCount}
          canWrite={enrolled}
          alreadyWrote={alreadyWrote}
          onSubmit={submitReview}
        />

        {/* 9. 주의사항 */}
        <section className="scroll-mt-32">
          <h2 className="text-xl font-black text-slate-900">⚠️ 주의사항</h2>
          <ul className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            {NOTICES.map((n, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-slate-400">{i + 1}.</span> {n}
              </li>
            ))}
          </ul>
        </section>

        {/* 강사의 다른 콘텐츠 */}
        {related.length > 0 && (
          <section className="mt-14 border-t border-slate-200 pt-10">
            <h2 className="text-xl font-black text-slate-900">{expert?.name} 강사의 다른 강의</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {related.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          </section>
        )}
          </div>
        </div>

        {/* 우측 컬럼: 구매 카드 (데스크톱, sticky로 따라 내려옴) */}
        <aside className="hidden md:block">
          <div className="sticky top-20 py-8">
            <PurchaseCard
              course={course}
              enrolled={enrolled}
              onEnrolled={() => setEnrolled(true)}
            />
          </div>
        </aside>
      </div>

      {/* 하단 고정 구매바 (모바일 전용 — 데스크톱은 우측 카드 사용) */}
      <div className="md:hidden">
        <PurchaseBar course={course} />
      </div>
    </div>
  )
}

/* ── 데스크톱 우측 구매 카드 (pudufu 방식) ── */
function PurchaseCard({
  course,
  enrolled,
  onEnrolled,
}: {
  course: Course
  enrolled: boolean
  onEnrolled: () => void
}) {
  const { user } = useAuth()
  const { isWished, toggle } = useWishlist()
  const { getCourseRating } = useBizData()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const { rating: avgRating, count: ratingCount } = getCourseRating(course.id)
  const meta = getCourseMeta(course.id)
  const originalPrice = course.originalPrice ?? meta.originalPrice
  const off = discountPct(course.price, originalPrice)
  const isPaid = course.price > 0
  const wished = isWished('course', course.id)

  const onPrimary = async () => {
    if (!user) {
      navigate('/auth?returnTo=' + encodeURIComponent(`/courses/${course.id}`))
      return
    }
    if (enrolled) return navigate(`/learn/${course.id}`)
    if (isPaid) return navigate(`/checkout?type=course&id=${course.id}`)
    setBusy(true)
    const { error } = await enrollFree(user.id, 'course', course.id)
    setBusy(false)
    if (!error) {
      onEnrolled()
      navigate(`/learn/${course.id}`)
    }
  }

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: course.title, url })
      else {
        await navigator.clipboard.writeText(url)
        alert('링크가 복사되었습니다.')
      }
    } catch {
      /* 취소 무시 */
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
          강의
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => toggle('course', course.id)}
            aria-label="찜하기"
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            {wished ? '❤️' : '🤍'}
          </button>
          <button
            onClick={share}
            aria-label="공유"
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            🔗
          </button>
        </div>
      </div>

      <h1 className="mt-3 text-lg font-black leading-snug text-slate-900">{course.title}</h1>
      {ratingCount > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Stars n={avgRating} />
          <span className="font-semibold text-slate-700">{avgRating.toFixed(1)}</span>
          <span className="text-slate-400">({ratingCount})</span>
        </div>
      )}

      <div className="mt-4 flex items-end gap-2">
        {off && (
          <>
            <span className="text-lg font-bold text-rose-500">{off}%</span>
            <span className="mb-0.5 text-sm text-slate-400 line-through">
              ₩{originalPrice!.toLocaleString()}
            </span>
          </>
        )}
        <span
          className={`text-2xl font-black ${isPaid ? 'text-slate-900' : 'text-emerald-600'}`}
        >
          {formatPrice(course.price)}
        </span>
      </div>

      <button
        onClick={onPrimary}
        disabled={busy}
        className="mt-5 w-full rounded-xl bg-violet-600 py-3 font-bold text-white hover:bg-violet-700 disabled:opacity-50"
      >
        {enrolled ? '이어보기' : isPaid ? '구매하기' : busy ? '등록 중…' : '무료로 시청하기'}
      </button>
      <a
        href="#video"
        className="mt-2 block w-full rounded-xl border border-slate-300 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
      >
        무료 강의 보기
      </a>
    </div>
  )
}

/* ── 상세(판매) 페이지용 — 미리보기 영상 하이라이트 ── */
function LessonPlayer({ course, activeIdx }: { course: Course; activeIdx: number }) {
  const lesson = course.curriculum[activeIdx]
  const embed = toEmbedUrl(lesson?.videoUrl)

  // 세로영상이면 9:16 가운데 정렬, 아니면 기본 16:9
  const [portrait, setPortrait] = useState(false)
  useEffect(() => {
    setPortrait(false)
    let active = true
    fetchVimeoPortrait(lesson?.videoUrl).then((p) => {
      if (active && p) setPortrait(true)
    })
    return () => {
      active = false
    }
  }, [lesson?.videoUrl])

  return (
    <div>
      {/* 영상 영역 */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black">
        <div className={portrait ? 'mx-auto aspect-[9/16] h-[70vh] max-w-full' : 'aspect-video'}>
          {embed ? (
            <iframe
              key={embed}
              src={embed}
              title={lesson?.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          ) : course.coverImage ? (
            <img src={course.coverImage} alt={course.title} className="h-full w-full object-cover" />
          ) : (
            <div
              className={`grid h-full place-items-center bg-gradient-to-br ${course.cover} text-6xl`}
            >
              {course.thumbEmoji}
            </div>
          )}
        </div>
      </div>

      {/* 레슨 라벨 */}
      {lesson && (
        <div className="mt-3">
          <div className="text-xs font-medium text-violet-600">
            {activeIdx + 1}강 · 미리보기
          </div>
          <div className="font-bold text-slate-900">{lesson.title}</div>
        </div>
      )}
    </div>
  )
}
