import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { formatPrice } from '../data/mock'
import { useBizData } from '../lib/useBizData'
import { useAuth } from '../lib/auth'
import { blockClass, blockStyle } from '../lib/detailBlocks'
import { supabase } from '../lib/supabase'
import { enrollFree, addEbookReview } from '../lib/userData'
import { trackPageView } from '../lib/pageViews'
import { EXPERT_CREDENTIALS } from '../data/mockMarketplace'
import { ebookDiscountPct } from '../data/mockEbooks'
import EbookCard from '../components/EbookCard'
import ExpertAvatar from '../components/ExpertAvatar'
import PdfPreview from '../components/PdfPreview'
import ReviewSection from '../components/ReviewSection'

const NOTICES = [
  '전자책은 구매 후 마이페이지 > 내 자료에서 다시 열람할 수 있습니다.',
  '콘텐츠의 무단 복제·배포·공유는 저작권법에 의해 금지됩니다.',
  '디지털 상품 특성상 열람 후 환불이 제한될 수 있습니다. 자세한 내용은 고객센터로 문의해 주세요.',
]

const TABS = [
  { id: 'intro', label: '소개' },
  { id: 'reader', label: '미리보기' },
  { id: 'author', label: '저자소개' },
  { id: 'reviews', label: '후기' },
]

export default function AcademyEbookDetail() {
  const { id } = useParams()
  const { experts, ebooks, getEbook, getEbookReviews, getEbookRating, refetch } = useBizData()
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const ebook = getEbook(id ?? '')
  const [enrolled, setEnrolled] = useState(false)
  const [busy, setBusy] = useState(false)

  // 상세페이지 조회 기록 (소유 지도자·관리자 본인 조회는 집계에서 제외)
  useEffect(() => {
    if (!ebook || authLoading) return
    if (profile?.role === 'admin' || (profile?.expert_id && profile.expert_id === ebook.expertId)) return
    trackPageView('ebook', ebook.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ebook?.id, authLoading, profile?.expert_id, profile?.role])

  // 구매(수강) 여부
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
      .eq('item_type', 'ebook')
      .eq('item_id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setEnrolled(!!data)
      })
    return () => {
      active = false
    }
  }, [user, id])

  if (!ebook) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="text-5xl">🤔</div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">전자책을 찾을 수 없어요</h1>
        <Link
          to="/ebooks"
          className="mt-6 inline-block rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
        >
          전자책 목록으로
        </Link>
      </div>
    )
  }

  const isPaid = ebook.price > 0
  const off = ebookDiscountPct(ebook.price, ebook.originalPrice)
  const canRead = enrolled
  const previewPages = ebook.previewPages ?? 3
  // 저자명을 강사 데이터와 매칭해 약력/크리덴셜 재사용
  const authorExpert = experts.find((e) => e.name === ebook.author)
  const credentials = authorExpert?.credentials?.length
    ? authorExpert.credentials
    : authorExpert
      ? EXPERT_CREDENTIALS[authorExpert.id] ?? []
      : []
  const related = ebooks.filter((e) => e.author === ebook.author && e.id !== ebook.id)

  // 실제 후기 기반 평점 + 작성
  const ebookReviews = getEbookReviews(ebook.id).filter((r) => !r.hidden)
  const { rating: avgRating, count: ratingCount } = getEbookRating(ebook.id)
  const myEmail = user?.email ?? ''
  const alreadyWrote = !!myEmail && ebookReviews.some((r) => r.userEmail === myEmail)
  const submitReview = (rating: number, content: string) =>
    addEbookReview({
      ebookId: ebook.id,
      userName: profile?.display_name || myEmail || '독자',
      userEmail: myEmail,
      content,
      rating,
    }).then((res) => {
      if (!res.error) refetch()
      return res
    })

  // 구매하기/읽기 — 구매자는 읽기 페이지로, 무료는 즉시 등록 후 읽기, 유료는 결제
  const onPrimary = async () => {
    if (!user) {
      navigate('/auth?returnTo=' + encodeURIComponent(`/ebooks/${ebook.id}`))
      return
    }
    if (enrolled) return navigate(`/read/${ebook.id}`)
    if (isPaid) return navigate(`/checkout?type=ebook&id=${ebook.id}`)
    setBusy(true)
    const { error } = await enrollFree(user.id, 'ebook', ebook.id)
    setBusy(false)
    if (error) return alert('등록에 실패했습니다: ' + error)
    setEnrolled(true)
    navigate(`/read/${ebook.id}`)
  }

  return (
    <div className="pb-28">
      {/* 1. 히어로 (강의 상세와 동일 레이아웃) */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 md:py-14">
          <div
            className={`grid aspect-video place-items-center overflow-hidden rounded-2xl text-7xl ${
              ebook.coverImage ? 'bg-slate-100' : `bg-gradient-to-br ${ebook.cover}`
            }`}
          >
            {ebook.coverImage ? (
              <img src={ebook.coverImage} alt={ebook.title} className="h-full w-full object-cover" />
            ) : (
              ebook.emoji
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-700">
                전자책
              </span>
              {ebook.isNew && (
                <span className="rounded-full bg-brand-600 px-2.5 py-1 text-xs font-bold text-white">
                  NEW
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-black leading-tight text-slate-900 sm:text-3xl">
              {ebook.title}
            </h1>
            <p className="mt-2 text-slate-600">{ebook.subtitle}</p>

            <div className="mt-4 flex items-center gap-2 text-sm">
              <ExpertAvatar
                emoji={ebook.avatar}
                src={authorExpert?.avatarUrl}
                size={28}
                fallbackBg="bg-brand-100"
              />
              <span className="font-semibold text-slate-700">{ebook.author}</span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              {ratingCount > 0 && (
                <span className="font-semibold text-amber-400">
                  ★ <span className="text-slate-700">{avgRating.toFixed(1)}</span>
                  <span className="text-slate-400"> ({ratingCount})</span>
                </span>
              )}
              <span>{ebook.pageCount}쪽</span>
            </div>

            <div className="mt-5 flex items-end gap-2">
              {off && (
                <>
                  <span className="text-lg font-bold text-rose-500">{off}%</span>
                  <span className="mb-0.5 text-slate-400 line-through">
                    ₩{ebook.originalPrice!.toLocaleString()}
                  </span>
                </>
              )}
              <span
                className={`text-3xl font-black ${isPaid ? 'text-slate-900' : 'text-emerald-600'}`}
              >
                {formatPrice(ebook.price)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 스티키 앵커 탭 */}
      <nav className="sticky top-[7.25rem] z-30 border-b border-slate-200 bg-white/90 backdrop-blur md:top-[7rem]">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
          {TABS.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className="whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-600 hover:border-brand-500 hover:text-brand-600"
            >
              {t.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-3xl space-y-14 px-4 py-12 sm:px-6">
        {/* 3. 소개 */}
        <section id="intro" className="scroll-mt-32">
          <h2 className="text-xl font-black text-slate-900">소개</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
              📅 업데이트 26.03.13
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
              📄 {ebook.pageCount}쪽
            </span>
          </div>
          <p className="mt-4 leading-relaxed text-slate-600">{ebook.summary}</p>

          {/* 리치 상세페이지 (저자 블록 에디터 — use_landing_page). 없으면 아무것도 안 보임 */}
          {ebook.useLandingPage && (ebook.detailBlocks?.length ?? 0) > 0 && (
            <div className="mt-6 space-y-4">
              {ebook.detailBlocks!.map((b) =>
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

        {/* 4. 미리보기 — 앞 N페이지만 공개 */}
        <section id="reader" className="scroll-mt-32">
          <h2 className="text-xl font-black text-slate-900">미리보기</h2>
          <p className="mt-1 text-sm text-slate-500">
            총 {ebook.pageCount}쪽 중 {previewPages}페이지 공개
          </p>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            {/* 앞 N쪽만 담긴 공개 미리보기 PDF — 원본은 구매자만 열람 */}
            {ebook.previewPdfUrl ? (
              <PdfPreview url={ebook.previewPdfUrl} maxPages={previewPages} />
            ) : (
              <div className="grid h-40 place-items-center bg-slate-50 text-sm text-slate-400">
                미리보기를 준비 중이에요.
              </div>
            )}

            {/* 미리보기 종료 + CTA */}
            <div className="border-t border-slate-200 bg-white px-6 py-8 text-center">
              <div className="text-3xl">🔒</div>
              <p className="mt-2 font-bold text-slate-800">
                미리보기는 {previewPages}페이지까지예요
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {canRead
                  ? `전체 ${ebook.pageCount}쪽을 읽을 수 있어요.`
                  : `${isPaid ? '구매하면' : '무료로 받으면'} 전체 ${ebook.pageCount}쪽을 모두 읽을 수 있어요.`}
              </p>
              <button
                onClick={onPrimary}
                disabled={busy}
                className="mt-4 rounded-xl bg-brand-600 px-6 py-2.5 font-bold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {canRead
                  ? '전체 읽기 →'
                  : isPaid
                    ? `${formatPrice(ebook.price)} · 구매하고 전체 읽기`
                    : busy
                      ? '등록 중…'
                      : '무료로 전체 읽기'}
              </button>
            </div>
          </div>
        </section>

        {/* 5. 저자소개 (강의의 '강사소개'와 동일) */}
        <section id="author" className="scroll-mt-32">
          <h2 className="text-xl font-black text-slate-900">저자소개</h2>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-start gap-4">
              <ExpertAvatar
                emoji={ebook.avatar}
                src={authorExpert?.avatarUrl}
                size={64}
                fallbackBg="bg-brand-100"
              />
              <div>
                <h3 className="text-lg font-bold text-slate-900">{ebook.author}</h3>
                {authorExpert && (
                  <p className="text-sm font-medium text-brand-600">{authorExpert.title}</p>
                )}
                {authorExpert?.bio && (
                  <p className="mt-2 leading-relaxed text-slate-600">{authorExpert.bio}</p>
                )}
              </div>
            </div>
            {credentials.length > 0 && (
              <ul className="mt-4 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-2">
                {credentials.map((c) => (
                  <li key={c} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="text-brand-500">✓</span> {c}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 6. 이 책의 핵심 (강의의 '이런 걸 배워요'와 동일) */}
        <section className="scroll-mt-32">
          <h2 className="text-xl font-black text-slate-900">이 책의 핵심</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ebook.highlights.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
              >
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-sm text-brand-600">
                  ✓
                </span>
                <span className="text-slate-700">{w}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 7. 후기 — 실제 별점+후기 */}
        <ReviewSection
          title="독자 후기"
          items={ebookReviews}
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
      </div>

      {/* 8. 이 저자의 다른 전자책 (강의의 '강사의 다른 강의'와 동일) */}
      {related.length > 0 && (
        <section className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <h2 className="text-xl font-black text-slate-900">{ebook.author} 저자의 다른 전자책</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((e) => (
                <EbookCard key={e.id} ebook={e} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 하단 고정 구매바 */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            {off && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-rose-500">{off}%</span>
                <span className="text-slate-400 line-through">
                  ₩{ebook.originalPrice!.toLocaleString()}
                </span>
              </div>
            )}
            <div
              className={`text-xl font-black sm:text-2xl ${
                isPaid ? 'text-slate-900' : 'text-emerald-600'
              }`}
            >
              {formatPrice(ebook.price)}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <a
              href="#reader"
              className="hidden h-11 items-center rounded-xl border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50 sm:flex"
            >
              미리보기
            </a>
            <button
              onClick={onPrimary}
              disabled={busy}
              className="h-11 rounded-xl bg-brand-600 px-6 font-bold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {enrolled ? '바로 읽기' : isPaid ? '구매하기' : busy ? '등록 중…' : '무료로 읽기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
