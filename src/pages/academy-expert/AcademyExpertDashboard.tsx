import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice, type CourseReview } from '../../data/mock'
import { useBizData, invalidateBizData } from '../../lib/useBizData'
import { useAuth } from '../../lib/auth'
import ExpertAvatar from '../../components/ExpertAvatar'
import ExpertProfileEditor from '../../components/ExpertProfileEditor'
import {
  setReviewHidden,
  incrementPdfSent,
  getExpertRevenue,
  getPageViewCounts,
  getPageViewDaily,
  type PageViewDailyRow,
  getSettlementSummary,
  getSettlements,
  getPayoutAccount,
  upsertPayoutAccount,
  requestSettlement,
  type ExpertRevenue,
  type SettlementSummary,
  type SettlementRow,
  type PayoutAccount,
} from '../../lib/expertApi'

type Tab = '내 강의' | '내 전자책' | '리뷰 관리' | '수익 분석' | '정산' | '프로필'
const TABS: Tab[] = ['내 강의', '내 전자책', '리뷰 관리', '수익 분석', '정산', '프로필']

export default function AcademyExpertDashboard() {
  const { getExpert, getExpertStats, refetch, loading, experts } = useBizData()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [tab, setTab] = useState<Tab>('내 강의')
  const [revenue, setRevenue] = useState<ExpertRevenue | null>(null)
  // 관리자는 자신의 expert_id가 없으므로, 관리할 지도자를 직접 선택한다.
  const [adminExpertId, setAdminExpertId] = useState('')
  const expertId = isAdmin ? adminExpertId : (profile?.expert_id ?? '')

  // 관리자: 지도자 목록이 로드되면 첫 지도자를 기본 선택
  useEffect(() => {
    if (isAdmin && !adminExpertId && experts.length) setAdminExpertId(experts[0].id)
  }, [isAdmin, adminExpertId, experts])

  const expert = getExpert(expertId)
  const stats = getExpertStats(expertId)

  useEffect(() => {
    if (!expertId) return
    getExpertRevenue(expertId).then(setRevenue)
  }, [expertId])

  // 관리자인데 선택 가능한 지도자가 아직 없을 때
  if (isAdmin && !loading && experts.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-stone-500 sm:px-6">
        등록된 지도자가 없습니다.
      </div>
    )
  }

  if (loading || !expert) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="h-20 animate-pulse rounded-2xl bg-stone-100" />
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-stone-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* 관리자: 관리할 지도자 선택 */}
      {isAdmin && (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <span className="text-sm font-semibold text-indigo-700">관리자 모드 · 지도자 선택</span>
          <select
            value={adminExpertId}
            onChange={(e) => setAdminExpertId(e.target.value)}
            className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 outline-none focus:border-indigo-500"
          >
            {experts.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <ExpertAvatar emoji={expert.avatar} src={expert.avatarUrl} size={56} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-stone-900">{expert.name}</h1>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                BIZ 전문가
              </span>
            </div>
            <p className="text-sm text-stone-500">{expert.title}</p>
          </div>
        </div>
        <Link
          to="/expert/courses/new"
          state={{ expertId }}
          className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-center font-bold text-stone-900 hover:opacity-90"
        >
          + 새 강의 만들기
        </Link>
      </div>

      {/* 요약 통계 */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="총 강의" value={`${stats.courseCount}개`} icon="📚" />
        <StatCard
          label="총 구매자"
          value={revenue ? `${revenue.buyers.toLocaleString()}명` : '—'}
          icon="👥"
        />
        <StatCard
          label="누적 매출"
          value={revenue ? formatPrice(revenue.total) : '—'}
          icon="💰"
          accent
        />
        <StatCard
          label="평균 평점"
          value={stats.reviewCount ? `⭐ ${stats.rating.toFixed(1)} (${stats.reviewCount})` : '후기 없음'}
          icon=""
        />
      </div>

      {/* 탭 */}
      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-stone-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
              tab === t
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === '내 강의' && (
          <MyCoursesTab expertId={expertId} buyersByItem={revenue?.buyersByItem ?? {}} />
        )}
        {tab === '내 전자책' && <MyEbooksTab expertId={expertId} />}
        {tab === '리뷰 관리' && <ReviewsTab expertId={expertId} />}
        {tab === '수익 분석' && <RevenueTab revenue={revenue} expertId={expertId} />}
        {tab === '정산' && <PayoutTab expertId={expertId} expertName={expert.name} />}
        {tab === '프로필' && (
          <div className="max-w-2xl">
            <ExpertProfileEditor expertId={expertId} initial={expert} onSaved={refetch} />
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string
  icon: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent ? 'border-amber-200 bg-amber-50' : 'border-stone-200 bg-white'
      }`}
    >
      <div className="text-sm text-stone-500">
        {icon} {label}
      </div>
      <div className="mt-1 text-2xl font-black text-stone-900">{value}</div>
    </div>
  )
}

/* ── 내 강의 탭 ── */
function MyCoursesTab({
  expertId,
  buyersByItem,
}: {
  expertId: string
  buyersByItem: Record<string, number>
}) {
  const { getCoursesByExpert, getCourseRating } = useBizData()
  const courses = getCoursesByExpert(expertId)

  return (
    <div className="space-y-3">
      {courses.map((c) => {
        const { rating, count } = getCourseRating(c.id)
        const students = buyersByItem[`course:${c.id}`] ?? 0
        return (
        <div
          key={c.id}
          className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center"
        >
          <div
            className={`grid h-16 w-24 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${c.cover} text-2xl`}
          >
            {c.thumbEmoji}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-amber-600">{c.category}</span>
            </div>
            <h3 className="mt-0.5 font-bold text-stone-900">{c.title}</h3>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-stone-400">
              <span>{formatPrice(c.price)}</span>
              <span>· 수강 {students.toLocaleString()}명</span>
              <span>· {c.lessonCount}강</span>
              <span>· {count ? `⭐ ${rating.toFixed(1)} (${count})` : '후기 없음'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/courses/${c.id}`}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50"
            >
              미리보기
            </Link>
            <Link
              to={`/expert/courses/${c.id}/edit`}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
            >
              편집
            </Link>
          </div>
        </div>
        )
      })}

      {courses.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-12 text-center text-sm text-stone-500">
          아직 등록한 강의가 없어요. 첫 강의를 만들어 보세요.
        </div>
      )}

      <Link
        to="/expert/courses/new"
        state={{ expertId }}
        className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 bg-white py-8 font-semibold text-stone-500 hover:border-amber-300 hover:text-amber-600"
      >
        + 새 강의 만들기
      </Link>
    </div>
  )
}

/* ── 내 전자책 탭 ── */
function MyEbooksTab({ expertId }: { expertId: string }) {
  const { getEbooksByExpert } = useBizData()
  const ebooks = getEbooksByExpert(expertId)

  return (
    <div className="space-y-3">
      {ebooks.map((e) => (
        <div
          key={e.id}
          className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center"
        >
          <div
            className={`grid h-16 w-24 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${e.cover} text-2xl`}
          >
            {e.emoji}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-stone-900">{e.title}</h3>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-stone-400">
              <span>{formatPrice(e.price)}</span>
              <span>· {e.pageCount}쪽</span>
              <span>· 구매 {e.buyerCount.toLocaleString()}명</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/ebooks/${e.id}`}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50"
            >
              미리보기
            </Link>
            <Link
              to={`/expert/ebooks/${e.id}/edit`}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
            >
              편집
            </Link>
          </div>
        </div>
      ))}

      {ebooks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-12 text-center text-sm text-stone-500">
          아직 등록한 전자책이 없어요. 첫 전자책을 만들어 보세요.
        </div>
      )}

      <Link
        to="/expert/ebooks/new"
        state={{ expertId }}
        className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 bg-white py-8 font-semibold text-stone-500 hover:border-amber-300 hover:text-amber-600"
      >
        + 새 전자책 만들기
      </Link>
    </div>
  )
}

/* ── 리뷰 관리 탭 (course_reviews, 숨김/PDF 발송) ── */
function ReviewsTab({ expertId }: { expertId: string }) {
  const { courseReviews, getCoursesByExpert, getCourse } = useBizData()
  const [reviews, setReviews] = useState<CourseReview[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    const ids = new Set(getCoursesByExpert(expertId).map((c) => c.id))
    setReviews(courseReviews.filter((r) => ids.has(r.courseId)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseReviews, expertId])

  const onToggleHidden = async (r: CourseReview) => {
    setBusyId(r.id)
    const next = !r.hidden
    const { error } = await setReviewHidden(r.id, next)
    setBusyId(null)
    if (error) return alert('변경 실패: ' + error)
    setReviews((rs) => rs.map((x) => (x.id === r.id ? { ...x, hidden: next } : x)))
    invalidateBizData() // 다른 페이지 다녀와도 변경이 유지되도록 캐시 갱신
  }

  const onSendPdf = async (r: CourseReview) => {
    setBusyId(r.id)
    const { error } = await incrementPdfSent(r.id, r.pdfSentCount)
    setBusyId(null)
    if (error) return alert('발송 실패: ' + error)
    setReviews((rs) =>
      rs.map((x) => (x.id === r.id ? { ...x, pdfSentCount: x.pdfSentCount + 1 } : x)),
    )
    invalidateBizData()
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-16 text-center">
        <div className="text-4xl">📝</div>
        <p className="mt-3 font-semibold text-stone-700">아직 등록된 리뷰가 없어요</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-500">
        리뷰를 확인하고 작성자에게 강의 PDF를 보내거나, 부적절한 리뷰는 숨길 수 있어요.
      </p>
      {reviews.map((r) => {
        const course = getCourse(r.courseId)
        const busy = busyId === r.id
        return (
          <div
            key={r.id}
            className={`rounded-2xl border p-5 ${
              r.hidden ? 'border-stone-200 bg-stone-50 opacity-70' : 'border-stone-200 bg-white'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-stone-800">{r.userName}</span>
                <span className="text-xs text-stone-400">· {r.userEmail}</span>
                {r.hidden && (
                  <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
                    숨김
                  </span>
                )}
              </div>
              <span className="text-xs text-stone-400">{r.createdAt}</span>
            </div>
            <div className="mt-1 text-xs font-medium text-amber-600">{course?.title}</div>
            <p className="mt-2 leading-relaxed text-stone-600">{r.content}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => onSendPdf(r)}
                disabled={busy}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                📄 PDF 보내기
                {r.pdfSentCount > 0 && (
                  <span className="ml-1 text-indigo-200">({r.pdfSentCount}회 발송됨)</span>
                )}
              </button>
              <button
                onClick={() => onToggleHidden(r)}
                disabled={busy}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50"
              >
                {r.hidden ? '숨김 해제' : '숨기기'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── 수익 분석 탭 ── */
type ConversionMode = '상품별' | '일별' | '월별'

function RevenueTab({ revenue, expertId }: { revenue: ExpertRevenue | null; expertId: string }) {
  const { getCoursesByExpert, getEbooksByExpert } = useBizData()
  const [views, setViews] = useState<Record<string, number> | null>(null)
  const [daily, setDaily] = useState<PageViewDailyRow[] | null>(null)
  const [mode, setMode] = useState<ConversionMode>('상품별')
  const [itemFilter, setItemFilter] = useState('all') // 'all' | `${type}:${id}`

  useEffect(() => {
    if (!expertId) return
    getPageViewCounts(expertId).then(setViews)
    getPageViewDaily(expertId).then(setDaily)
  }, [expertId])

  // 전환율 대상 상품: 강의 + 전자책
  const items = [
    ...getCoursesByExpert(expertId).map((c) => ({
      key: `course:${c.id}`,
      label: '강의',
      title: c.title,
    })),
    ...getEbooksByExpert(expertId).map((e) => ({
      key: `ebook:${e.id}`,
      label: '전자책',
      title: e.title,
    })),
  ]

  // 일별/월별 기간 행: 조회수(page_view_daily) + 구매 건수(orders)를 같은 기간 키로 합산
  const periodRows = useMemo(() => {
    if (mode === '상품별' || !daily || !revenue) return []
    const keyOf = (d: string) => (mode === '일별' ? d : d.slice(0, 7))
    const inScope = (key: string) => itemFilter === 'all' || key === itemFilter
    const map = new Map<string, { views: number; buys: number }>()
    const at = (k: string) => {
      let v = map.get(k)
      if (!v) map.set(k, (v = { views: 0, buys: 0 }))
      return v
    }
    for (const r of daily) {
      if (inScope(`${r.item_type}:${r.item_id}`)) at(keyOf(r.day)).views += r.views
    }
    for (const p of revenue.purchases) {
      if (inScope(`${p.itemType}:${p.itemId}`)) at(keyOf(p.date)).buys += 1
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // 최신 기간부터
      .map(([period, v]) => ({ period, ...v }))
  }, [mode, daily, revenue, itemFilter])

  if (!revenue) {
    return <div className="h-48 animate-pulse rounded-2xl bg-stone-100" />
  }
  const max = Math.max(1, ...revenue.byMonth.map((m) => m.amount))
  const thisMonth = revenue.byMonth[revenue.byMonth.length - 1]?.amount ?? 0
  const hasData = revenue.total > 0

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="이번 달 매출" value={formatPrice(thisMonth)} icon="📈" accent />
        <StatCard label="누적 판매" value={`${revenue.count}건`} icon="🛒" />
        <StatCard label="정산 예정액(80%)" value={formatPrice(Math.round(revenue.total * 0.8))} icon="💸" />
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <h3 className="font-bold text-stone-900">월별 매출 추이</h3>
        {hasData ? (
          <div className="mt-6 flex h-48 items-end justify-between gap-3">
            {revenue.byMonth.map((m, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                {/* 부모(flex column) 높이가 auto라 % 높이는 0으로 계산됨 → px로 지정 */}
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-amber-400 to-orange-400"
                  style={{
                    height: `${m.amount > 0 ? Math.max(8, Math.round((m.amount / max) * 150)) : 2}px`,
                  }}
                />
                <span className="text-xs text-stone-400">{m.month}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 py-10 text-center text-sm text-stone-400">
            아직 결제된 매출이 없어요. 강의가 판매되면 여기에 표시됩니다.
          </p>
        )}
        <p className="mt-4 text-xs text-stone-400">* 정산 비율 80:20 적용</p>
      </div>

      {/* 전환율 (상세페이지 조회 → 구매) — 상품별 / 일별 / 월별 */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-stone-900">전환율</h3>
            <p className="mt-1 text-sm text-stone-500">
              상세페이지 조회수 대비 구매를 보여줘요.
            </p>
          </div>
          <div className="flex rounded-lg border border-stone-200 p-0.5">
            {(['상품별', '일별', '월별'] as ConversionMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  mode === m ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {mode !== '상품별' && items.length > 1 && (
          <select
            value={itemFilter}
            onChange={(e) => setItemFilter(e.target.value)}
            className="mt-4 w-full max-w-xs rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 outline-none focus:border-amber-400"
          >
            <option value="all">전체 상품</option>
            {items.map((it) => (
              <option key={it.key} value={it.key}>
                [{it.label}] {it.title}
              </option>
            ))}
          </select>
        )}

        {views === null || daily === null ? (
          <div className="mt-4 h-24 animate-pulse rounded-xl bg-stone-100" />
        ) : items.length === 0 ? (
          <p className="mt-4 py-8 text-center text-sm text-stone-400">등록된 상품이 없어요.</p>
        ) : mode === '상품별' ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-200 text-left text-xs text-stone-500">
                <tr>
                  <th className="py-2 pr-4">상품</th>
                  <th className="py-2 pr-4 text-right">조회수</th>
                  <th className="py-2 pr-4 text-right">구매</th>
                  <th className="py-2 text-right">전환율</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.map((it) => {
                  const v = views[it.key] ?? 0
                  const buyers = revenue.buyersByItem[it.key] ?? 0
                  const rate = v > 0 ? (buyers / v) * 100 : null
                  return (
                    <tr key={it.key}>
                      <td className="max-w-[280px] py-3 pr-4">
                        <span
                          className={`mr-1.5 rounded px-1.5 py-0.5 text-[11px] font-bold ${
                            it.label === '강의'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-violet-100 text-violet-700'
                          }`}
                        >
                          {it.label}
                        </span>
                        <span className="font-medium text-stone-800">{it.title}</span>
                      </td>
                      <td className="py-3 pr-4 text-right text-stone-600">{v.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-right text-stone-600">
                        {buyers.toLocaleString()}
                      </td>
                      <td className="py-3 text-right font-semibold text-stone-900">
                        {rate === null ? '—' : `${rate.toFixed(1)}%`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : periodRows.length === 0 ? (
          <p className="mt-4 py-8 text-center text-sm text-stone-400">
            아직 집계된 조회·구매 데이터가 없어요.
          </p>
        ) : (
          <div className="mt-4 max-h-96 overflow-x-auto overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-stone-200 bg-white text-left text-xs text-stone-500">
                <tr>
                  <th className="py-2 pr-4">{mode === '일별' ? '날짜' : '월'}</th>
                  <th className="py-2 pr-4 text-right">조회수</th>
                  <th className="py-2 pr-4 text-right">구매</th>
                  <th className="py-2 text-right">전환율</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {periodRows.map((r) => {
                  const rate = r.views > 0 ? (r.buys / r.views) * 100 : null
                  return (
                    <tr key={r.period}>
                      <td className="py-3 pr-4 font-medium text-stone-800">{r.period}</td>
                      <td className="py-3 pr-4 text-right text-stone-600">
                        {r.views.toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 text-right text-stone-600">
                        {r.buys.toLocaleString()}
                      </td>
                      <td className="py-3 text-right font-semibold text-stone-900">
                        {rate === null ? '—' : `${rate.toFixed(1)}%`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-stone-400">
          * 조회수는 2026년 8월 5일부터 집계를 시작했어요. 지도자 본인·관리자의 조회는 제외됩니다.
          {mode !== '상품별' && ' 일별/월별 구매는 결제 건수 기준이에요.'}
        </p>
      </div>
    </div>
  )
}

/* ── 정산 탭 (전문가 80% / 플랫폼 20%) ── */
function PayoutTab({ expertId, expertName }: { expertId: string; expertName: string }) {
  const [summary, setSummary] = useState<SettlementSummary | null>(null)
  const [list, setList] = useState<SettlementRow[]>([])
  const [account, setAccount] = useState<PayoutAccount | null>(null)
  const [busy, setBusy] = useState(false)

  // 계좌 폼
  const [editing, setEditing] = useState(false)
  const [bank, setBank] = useState('')
  const [accountNo, setAccountNo] = useState('')
  const [holder, setHolder] = useState(expertName)

  const reload = () => {
    Promise.all([
      getSettlementSummary(expertId),
      getSettlements(expertId),
      getPayoutAccount(expertId),
    ]).then(([s, l, a]) => {
      setSummary(s)
      setList(l)
      setAccount(a)
      if (a) {
        setBank(a.bank)
        setAccountNo(a.account_no)
        setHolder(a.holder)
      }
    })
  }

  useEffect(() => {
    if (expertId) reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId])

  const onSaveAccount = async () => {
    if (!bank.trim() || !accountNo.trim() || !holder.trim()) return
    setBusy(true)
    const { error } = await upsertPayoutAccount(expertId, {
      bank: bank.trim(),
      account_no: accountNo.trim(),
      holder: holder.trim(),
    })
    setBusy(false)
    if (error) return alert('저장 실패: ' + error)
    setEditing(false)
    reload()
  }

  const onRequest = async () => {
    if (!account) return alert('먼저 정산 계좌를 등록해 주세요.')
    setBusy(true)
    const { error } = await requestSettlement()
    setBusy(false)
    if (error) return alert(error)
    reload()
  }

  if (!summary) {
    return <div className="h-40 animate-pulse rounded-2xl bg-stone-100" />
  }

  return (
    <div className="space-y-6">
      {/* 출금 가능 금액 */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="text-sm text-stone-600">출금 가능 금액 (전문가 정산 80%)</div>
        <div className="mt-1 text-3xl font-black text-stone-900">
          {formatPrice(summary.available)}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
          <span>총매출 {formatPrice(summary.gross)}</span>
          <span>· 신청 대기 {formatPrice(summary.requested)}</span>
          <span>· 지급완료 {formatPrice(summary.paidOut)}</span>
        </div>
        <button
          onClick={onRequest}
          disabled={busy || summary.available <= 0 || !account}
          className="mt-4 rounded-xl bg-stone-900 px-6 py-3 font-semibold text-white hover:bg-stone-800 disabled:opacity-40"
        >
          출금 신청
        </button>
        {!account && (
          <p className="mt-2 text-xs text-rose-500">출금하려면 먼저 정산 계좌를 등록하세요.</p>
        )}
      </div>

      {/* 정산 계좌 */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-stone-900">정산 계좌</h3>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-600 hover:bg-stone-50"
            >
              {account ? '변경' : '등록'}
            </button>
          )}
        </div>

        {editing ? (
          <div className="mt-4 space-y-3">
            <input
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="은행명 (예: 토스뱅크)"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
            />
            <input
              value={accountNo}
              onChange={(e) => setAccountNo(e.target.value)}
              placeholder="계좌번호"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
            />
            <input
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder="예금주"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
            />
            <div className="flex gap-2">
              <button
                onClick={onSaveAccount}
                disabled={busy}
                className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
              >
                저장
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-500">예금주</dt>
              <dd className="font-medium text-stone-800">{account?.holder ?? '미등록'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">은행</dt>
              <dd className={account ? 'font-medium text-stone-800' : 'text-stone-400'}>
                {account?.bank ?? '미등록'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">계좌번호</dt>
              <dd className={account ? 'font-medium text-stone-800' : 'text-stone-400'}>
                {account?.account_no ?? '미등록'}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {/* 정산 신청 내역 */}
      <div>
        <h3 className="font-bold text-stone-900">정산 내역</h3>
        {list.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-stone-300 bg-white py-10 text-center text-sm text-stone-500">
            아직 정산 신청 내역이 없어요.
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-2xl border border-stone-200">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs text-stone-500">
                <tr>
                  <th className="px-4 py-3">신청일</th>
                  <th className="px-4 py-3">정산액(80%)</th>
                  <th className="px-4 py-3">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {list.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 text-stone-500">{s.requested_at?.slice(0, 10)}</td>
                    <td className="px-4 py-3 font-semibold text-stone-800">
                      {formatPrice(s.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <SettlementStatus status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function SettlementStatus({ status }: { status: SettlementRow['status'] }) {
  const map: Record<SettlementRow['status'], { label: string; cls: string }> = {
    requested: { label: '신청', cls: 'bg-stone-100 text-stone-600' },
    approved: { label: '승인', cls: 'bg-indigo-100 text-indigo-700' },
    paid: { label: '지급완료', cls: 'bg-emerald-100 text-emerald-700' },
    rejected: { label: '반려', cls: 'bg-rose-100 text-rose-700' },
  }
  const s = map[status]
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.cls}`}>{s.label}</span>
}
