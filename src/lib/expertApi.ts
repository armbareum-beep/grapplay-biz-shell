import { supabase } from './supabase'
import type { Category } from '../data/mock'

// 전문가(지도자) 인증 mutation 모듈. 소유권은 RLS가 강제한다.

export interface CourseInput {
  id?: string
  expertId: string
  title: string
  subtitle: string
  category: Category
  price: number
  originalPrice?: number | null
  cover?: string
  coverImage?: string | null
  thumbEmoji?: string
  curriculum: { title: string; durationMin: number; videoUrl?: string; preview?: boolean }[]
  whatYouLearn: string[]
  useLandingPage: boolean
  detailBlocks: unknown[]
  rewardPdfUrl?: string | null
}

// 전문가 본인 공개 프로필(제목/소개/사진/분야) 수정 — 마이페이지에서 사용.
// RLS의 "expert updates own row"(owns_expert)가 본인 experts 행만 허용.
export interface MyExpertInput {
  title?: string
  bio?: string
  avatar?: string
  avatarUrl?: string | null
  categories?: Category[]
  credentials?: string[]
}

export async function updateMyExpert(expertId: string, patch: MyExpertInput) {
  if (!supabase) return { error: '연결이 설정되지 않았습니다.' }
  const row: Record<string, unknown> = {}
  if (patch.title !== undefined) row.title = patch.title
  if (patch.bio !== undefined) row.bio = patch.bio
  if (patch.avatar !== undefined) row.avatar = patch.avatar || '🧑‍🏫'
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl
  if (patch.categories !== undefined) {
    row.categories = patch.categories
    row.category = patch.categories[0] ?? null
  }
  if (patch.credentials !== undefined) row.credentials = patch.credentials
  const { data, error } = await supabase
    .from('experts')
    .update(row)
    .eq('id', expertId)
    .select('id')
  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: '권한이 없거나 전문가 정보를 찾을 수 없습니다.' }
  return { error: null }
}

const DEFAULT_COVERS = [
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-sky-400 to-indigo-500',
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
]

function genCourseId() {
  return `c_${crypto.randomUUID().slice(0, 8)}`
}

export async function createCourse(input: CourseInput) {
  if (!supabase) return { data: null, error: '연결이 설정되지 않았습니다.' }
  const cover = input.cover || DEFAULT_COVERS[Math.floor(Math.random() * DEFAULT_COVERS.length)]
  const row = {
    id: input.id ?? genCourseId(),
    expert_id: input.expertId,
    title: input.title,
    subtitle: input.subtitle,
    category: input.category,
    price: input.price,
    original_price: input.originalPrice ?? null,
    cover,
    cover_image: input.coverImage ?? null,
    thumb_emoji: input.thumbEmoji || '📚',
    lesson_count: input.curriculum.length,
    duration_min: input.curriculum.reduce((s, c) => s + (c.durationMin || 0), 0),
    summary: input.subtitle,
    what_you_learn: input.whatYouLearn,
    curriculum: input.curriculum,
    use_landing_page: input.useLandingPage,
    detail_blocks: input.detailBlocks,
    review_reward_pdf_url: input.rewardPdfUrl ?? null,
  }
  const { data, error } = await supabase.from('courses').insert(row).select().single()
  return { data, error: error?.message ?? null }
}

export async function updateCourse(id: string, input: CourseInput) {
  if (!supabase) return { data: null, error: '연결이 설정되지 않았습니다.' }
  const patch = {
    title: input.title,
    subtitle: input.subtitle,
    category: input.category,
    price: input.price,
    original_price: input.originalPrice ?? null,
    cover_image: input.coverImage ?? null,
    lesson_count: input.curriculum.length,
    duration_min: input.curriculum.reduce((s, c) => s + (c.durationMin || 0), 0),
    summary: input.subtitle,
    what_you_learn: input.whatYouLearn,
    curriculum: input.curriculum,
    use_landing_page: input.useLandingPage,
    detail_blocks: input.detailBlocks,
    review_reward_pdf_url: input.rewardPdfUrl ?? null,
  }
  const { data, error } = await supabase.from('courses').update(patch).eq('id', id).select().single()
  return { data, error: error?.message ?? null }
}

export async function deleteCourse(id: string) {
  if (!supabase) return { error: '연결이 설정되지 않았습니다.' }
  const { error } = await supabase.from('courses').delete().eq('id', id)
  return { error: error?.message ?? null }
}

export async function setReviewHidden(reviewId: string, hidden: boolean) {
  if (!supabase) return { error: '연결이 설정되지 않았습니다.' }
  // .select()로 영향받은 행을 받아 0건이면 RLS 차단으로 간주 (조용한 무반영 방지)
  const { data, error } = await supabase
    .from('course_reviews')
    .update({ hidden })
    .eq('id', reviewId)
    .select('id')
  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: '권한이 없거나 리뷰를 찾을 수 없습니다.' }
  return { error: null }
}

// 전자책 리뷰 숨김/해제 (소유 전문가 또는 관리자)
export async function setEbookReviewHidden(reviewId: string, hidden: boolean) {
  if (!supabase) return { error: '연결이 설정되지 않았습니다.' }
  const { data, error } = await supabase
    .from('ebook_reviews')
    .update({ hidden })
    .eq('id', reviewId)
    .select('id')
  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: '권한이 없거나 리뷰를 찾을 수 없습니다.' }
  return { error: null }
}

// 리뷰 삭제 (관리자) — RLS admin delete 정책으로 보호
export async function deleteCourseReview(reviewId: string) {
  if (!supabase) return { error: '연결이 설정되지 않았습니다.' }
  const { data, error } = await supabase
    .from('course_reviews')
    .delete()
    .eq('id', reviewId)
    .select('id')
  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: '권한이 없거나 리뷰를 찾을 수 없습니다.' }
  return { error: null }
}

export async function deleteEbookReview(reviewId: string) {
  if (!supabase) return { error: '연결이 설정되지 않았습니다.' }
  const { data, error } = await supabase
    .from('ebook_reviews')
    .delete()
    .eq('id', reviewId)
    .select('id')
  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: '권한이 없거나 리뷰를 찾을 수 없습니다.' }
  return { error: null }
}

export async function incrementPdfSent(reviewId: string, current: number) {
  if (!supabase) return { error: '연결이 설정되지 않았습니다.' }
  const { data, error } = await supabase
    .from('course_reviews')
    .update({ pdf_sent_count: current + 1 })
    .eq('id', reviewId)
    .select('id')
  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: '권한이 없거나 리뷰를 찾을 수 없습니다.' }
  return { error: null }
}

// ── 전자책 CRUD ──
export interface EbookInput {
  id?: string
  expertId: string
  title: string
  subtitle: string
  author: string
  category?: Category
  price: number
  originalPrice?: number | null
  pageCount: number
  previewPages?: number
  cover?: string
  coverImage?: string | null
  emoji?: string
  avatar?: string
  summary: string
  highlights: string[]
  pdfUrl?: string | null
  useLandingPage: boolean
  detailBlocks: unknown[]
}

function genEbookId() {
  return `eb_${crypto.randomUUID().slice(0, 8)}`
}

function ebookRow(input: EbookInput) {
  return {
    expert_id: input.expertId,
    title: input.title,
    subtitle: input.subtitle,
    author: input.author,
    category: input.category ?? null,
    price: input.price,
    original_price: input.originalPrice ?? null,
    page_count: input.pageCount,
    preview_pages: input.previewPages ?? 3,
    cover: input.cover || 'from-violet-500 to-fuchsia-500',
    cover_image: input.coverImage ?? null,
    emoji: input.emoji || '📕',
    avatar: input.avatar || '📘',
    summary: input.summary,
    highlights: input.highlights,
    pdf_url: input.pdfUrl ?? null,
    use_landing_page: input.useLandingPage,
    detail_blocks: input.detailBlocks,
  }
}

export async function createEbook(input: EbookInput) {
  if (!supabase) return { data: null, error: '연결이 설정되지 않았습니다.' }
  const row = { id: input.id ?? genEbookId(), ...ebookRow(input) }
  const { data, error } = await supabase.from('ebooks').insert(row).select().single()
  return { data, error: error?.message ?? null }
}

export async function updateEbook(id: string, input: EbookInput) {
  if (!supabase) return { data: null, error: '연결이 설정되지 않았습니다.' }
  const { data, error } = await supabase
    .from('ebooks')
    .update(ebookRow(input))
    .eq('id', id)
    .select()
    .single()
  return { data, error: error?.message ?? null }
}

export async function deleteEbook(id: string) {
  if (!supabase) return { error: '연결이 설정되지 않았습니다.' }
  const { error } = await supabase.from('ebooks').delete().eq('id', id)
  return { error: error?.message ?? null }
}

export interface ExpertRevenue {
  total: number
  count: number
  students: number // 실제 수강생 수 (결제 완료 강의 주문의 고유 구매자)
  studentsByCourse: Record<string, number> // 강의별 고유 구매자 수
  byMonth: { month: string; amount: number }[]
  purchases: { courseId: string; date: string }[] // 결제 건별 (KST 날짜 YYYY-MM-DD) — 기간별 전환율용
}

// 소유 강의의 결제 완료(paid) 주문 합계 — orders RLS가 전문가 본인 강의만 노출
export async function getExpertRevenue(expertId: string): Promise<ExpertRevenue> {
  const empty: ExpertRevenue = {
    total: 0,
    count: 0,
    students: 0,
    studentsByCourse: {},
    byMonth: [],
    purchases: [],
  }
  if (!supabase) return empty

  const { data: courses } = await supabase
    .from('courses')
    .select('id')
    .eq('expert_id', expertId)
  const ids = (courses ?? []).map((c: any) => c.id)
  if (ids.length === 0) return empty

  const { data: orders, error } = await supabase
    .from('orders')
    .select('amount, paid_at, created_at, user_id, item_id')
    .eq('status', 'paid')
    .eq('item_type', 'course')
    .in('item_id', ids)
  if (error || !orders) return empty

  const total = orders.reduce((s: number, o: any) => s + (o.amount ?? 0), 0)
  // 고유 구매자 수 = 실제 수강생 수 (한 사람이 여러 강의를 사도 1명으로 집계)
  const students = new Set(orders.map((o: any) => o.user_id)).size
  // 강의별 고유 구매자 수
  const buyersByCourse: Record<string, Set<string>> = {}
  for (const o of orders as any[]) {
    ;(buyersByCourse[o.item_id] ??= new Set()).add(o.user_id)
  }
  const studentsByCourse: Record<string, number> = {}
  for (const [cid, set] of Object.entries(buyersByCourse)) studentsByCourse[cid] = set.size

  // 최근 6개월 집계
  const now = new Date()
  const months: { key: string; month: string; amount: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: `${d.getMonth() + 1}월`, amount: 0 })
  }
  for (const o of orders) {
    const t = new Date(o.paid_at ?? o.created_at)
    const key = `${t.getFullYear()}-${t.getMonth()}`
    const m = months.find((x) => x.key === key)
    if (m) m.amount += o.amount ?? 0
  }

  // 결제 건별 KST 날짜 (일별/월별 전환율 계산용)
  const purchases = (orders as any[]).map((o) => ({
    courseId: o.item_id as string,
    date: new Date(o.paid_at ?? o.created_at).toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Seoul',
    }),
  }))

  return {
    total,
    count: orders.length,
    students,
    studentsByCourse,
    byMonth: months.map(({ month, amount }) => ({ month, amount })),
    purchases,
  }
}

// 아이템별 상세페이지 조회수 — page_view_counts RPC (본인 또는 관리자만 집계 반환)
export async function getPageViewCounts(
  expertId: string,
): Promise<Record<string, number>> {
  if (!supabase) return {}
  const { data } = await supabase.rpc('page_view_counts', { p_expert_id: expertId })
  const map: Record<string, number> = {}
  for (const r of (data ?? []) as { item_type: string; item_id: string; views: number }[]) {
    map[`${r.item_type}:${r.item_id}`] = Number(r.views)
  }
  return map
}

// 아이템별 · 일별(KST) 조회수 — page_view_daily RPC (본인 또는 관리자만)
export interface PageViewDailyRow {
  day: string // YYYY-MM-DD (KST)
  item_type: string
  item_id: string
  views: number
}

export async function getPageViewDaily(expertId: string): Promise<PageViewDailyRow[]> {
  if (!supabase) return []
  const { data } = await supabase.rpc('page_view_daily', { p_expert_id: expertId })
  return ((data ?? []) as PageViewDailyRow[]).map((r) => ({ ...r, views: Number(r.views) }))
}

// ── 정산 (전문가 80% / 플랫폼 20%) ──
export const EXPERT_SHARE = 0.8

export interface SettlementSummary {
  gross: number // 총매출(차감 전)
  available: number // 출금 가능액 (전문가 80% 기준, 기신청분 제외)
  paidOut: number // 지급 완료액
  requested: number // 신청/승인 대기 중 금액
}

export interface SettlementRow {
  id: string
  amount: number
  gross_amount: number
  fee_rate: number
  status: 'requested' | 'approved' | 'paid' | 'rejected'
  requested_at: string
  paid_at: string | null
}

export interface PayoutAccount {
  bank: string
  account_no: string
  holder: string
}

export async function getSettlementSummary(expertId: string): Promise<SettlementSummary> {
  const empty: SettlementSummary = { gross: 0, available: 0, paidOut: 0, requested: 0 }
  if (!supabase) return empty

  const [{ data: courses }, { data: ebooks }] = await Promise.all([
    supabase.from('courses').select('id').eq('expert_id', expertId),
    supabase.from('ebooks').select('id').eq('expert_id', expertId),
  ])
  const ids = [
    ...(courses ?? []).map((c: any) => c.id),
    ...(ebooks ?? []).map((e: any) => e.id),
  ]

  let gross = 0
  if (ids.length > 0) {
    const { data: orders } = await supabase
      .from('orders')
      .select('amount')
      .eq('status', 'paid')
      .in('item_id', ids)
    gross = (orders ?? []).reduce((s: number, o: any) => s + (o.amount ?? 0), 0)
  }

  const { data: setts } = await supabase
    .from('settlements')
    .select('amount, gross_amount, status')
    .eq('expert_id', expertId)
  const rows = setts ?? []
  const alreadyGross = rows
    .filter((s: any) => ['requested', 'approved', 'paid'].includes(s.status))
    .reduce((a: number, s: any) => a + s.gross_amount, 0)
  const paidOut = rows
    .filter((s: any) => s.status === 'paid')
    .reduce((a: number, s: any) => a + s.amount, 0)
  const requested = rows
    .filter((s: any) => ['requested', 'approved'].includes(s.status))
    .reduce((a: number, s: any) => a + s.amount, 0)

  return {
    gross,
    available: Math.max(0, Math.floor((gross - alreadyGross) * EXPERT_SHARE)),
    paidOut,
    requested,
  }
}

export async function getSettlements(expertId: string): Promise<SettlementRow[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('settlements')
    .select('id, amount, gross_amount, fee_rate, status, requested_at, paid_at')
    .eq('expert_id', expertId)
    .order('requested_at', { ascending: false })
  return (data as SettlementRow[]) ?? []
}

export async function getPayoutAccount(expertId: string): Promise<PayoutAccount | null> {
  if (!supabase) return null
  const { data } = await supabase
    .from('payout_accounts')
    .select('bank, account_no, holder')
    .eq('expert_id', expertId)
    .maybeSingle()
  return (data as PayoutAccount) ?? null
}

export async function upsertPayoutAccount(expertId: string, acc: PayoutAccount) {
  if (!supabase) return { error: '연결이 설정되지 않았습니다.' }
  const { error } = await supabase
    .from('payout_accounts')
    .upsert(
      { expert_id: expertId, ...acc, updated_at: new Date().toISOString() },
      { onConflict: 'expert_id' },
    )
  return { error: error?.message ?? null }
}

export async function requestSettlement() {
  if (!supabase) return { error: '연결이 설정되지 않았습니다.' }
  const { error } = await supabase.rpc('request_settlement')
  if (error) {
    if (error.message.includes('no balance')) return { error: '출금 가능한 금액이 없습니다.' }
    return { error: error.message }
  }
  return { error: null }
}
