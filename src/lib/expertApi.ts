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
  rewardPdfPath?: string | null
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
  'from-brand-400 to-brand-500',
]

export function genCourseId() {
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
    reward_pdf_path: input.rewardPdfPath ?? null,
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
    reward_pdf_path: input.rewardPdfPath ?? null,
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
  pdfPath?: string | null
  previewPdfUrl?: string | null
  useLandingPage: boolean
  detailBlocks: unknown[]
}

export function genEbookId() {
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
    cover: input.cover || 'from-brand-500 to-fuchsia-500',
    cover_image: input.coverImage ?? null,
    emoji: input.emoji || '📕',
    avatar: input.avatar || '📘',
    summary: input.summary,
    highlights: input.highlights,
    pdf_url: input.pdfUrl ?? null,
    pdf_path: input.pdfPath ?? null,
    preview_pdf_url: input.previewPdfUrl ?? null,
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
  buyers: number // 고유 구매자 수 (강의+전자책, 같은 사람 중복 제거)
  buyersByItem: Record<string, number> // `${item_type}:${item_id}` → 고유 구매자 수
  byMonth: { month: string; amount: number }[]
  // 결제 건별 (KST 날짜 YYYY-MM-DD) — 기간별 전환율용
  purchases: { itemType: 'course' | 'ebook'; itemId: string; date: string }[]
}

// 소유 강의+전자책의 결제 완료(paid) 주문 합계 — orders RLS가 전문가 본인 상품만 노출
export async function getExpertRevenue(expertId: string): Promise<ExpertRevenue> {
  const empty: ExpertRevenue = {
    total: 0,
    count: 0,
    buyers: 0,
    buyersByItem: {},
    byMonth: [],
    purchases: [],
  }
  if (!supabase) return empty

  const [{ data: courseRows }, { data: ebookRows }] = await Promise.all([
    supabase.from('courses').select('id').eq('expert_id', expertId),
    supabase.from('ebooks').select('id').eq('expert_id', expertId),
  ])
  const courseIds = new Set((courseRows ?? []).map((c: any) => c.id))
  const ebookIds = new Set((ebookRows ?? []).map((e: any) => e.id))
  const ids = [...courseIds, ...ebookIds]
  if (ids.length === 0) return empty

  const { data, error } = await supabase
    .from('orders')
    .select('amount, paid_at, created_at, user_id, item_id, item_type')
    .eq('status', 'paid')
    .in('item_id', ids)
  if (error || !data) return empty
  // item_id는 다형 참조라 타입까지 맞는 주문만 집계 (삭제된 상품의 주문은 ids에 없어 자동 제외)
  const orders = (data as any[]).filter(
    (o) =>
      (o.item_type === 'course' && courseIds.has(o.item_id)) ||
      (o.item_type === 'ebook' && ebookIds.has(o.item_id)),
  )

  const total = orders.reduce((s: number, o: any) => s + (o.amount ?? 0), 0)
  // 고유 구매자 수 (한 사람이 여러 상품을 사도 1명으로 집계)
  const buyers = new Set(orders.map((o: any) => o.user_id)).size
  // 상품별 고유 구매자 수
  const buyerSets: Record<string, Set<string>> = {}
  for (const o of orders) {
    ;(buyerSets[`${o.item_type}:${o.item_id}`] ??= new Set()).add(o.user_id)
  }
  const buyersByItem: Record<string, number> = {}
  for (const [k, set] of Object.entries(buyerSets)) buyersByItem[k] = set.size

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
  const purchases = orders.map((o) => ({
    itemType: o.item_type as 'course' | 'ebook',
    itemId: o.item_id as string,
    date: new Date(o.paid_at ?? o.created_at).toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Seoul',
    }),
  }))

  return {
    total,
    count: orders.length,
    buyers,
    buyersByItem,
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

// ── 정산 (매출 → 부가세 10% → 전문가 80%/플랫폼 20% → 원천징수 3.3%) ──
export const VAT_RATE = 0.1 // 부가가치세 (결제금액은 부가세 포함가)
export const EXPERT_SHARE = 0.8
export const WITHHOLDING_RATE = 0.033 // 사업소득 원천징수 (소득세 3% + 지방소득세 0.3%)

// 부가세 포함 결제금액 → 공급가액.
// gross / 1.1은 부동소수 오차가 난다(Math.floor(110000 / 1.1) === 99999).
// SQL의 (v_base * 10) / 11과 똑같이 정수 연산으로 계산한다.
export function supplyFor(gross: number) {
  return Math.floor((gross * 10) / 11)
}

// 정산액(80%)에 대한 원천징수액
export function withholdingFor(amount: number) {
  return Math.floor(amount * WITHHOLDING_RATE)
}

export interface SettlementBreakdown {
  gross: number // 결제금액 (부가세 포함)
  vat: number // 부가세 10%
  supply: number // 공급가액 = gross − vat
  amount: number // 지도자 몫 80% (공급가액 기준) = 세무상 사업소득 지급액
  withholding: number // 원천징수 3.3%
  net: number // 실지급액 = amount − withholding
}

// 서버 RPC request_settlement와 1:1 대응하는 유일한 계산 함수.
// 금액을 보여주는 모든 화면은 자체 계산 대신 이걸 쓴다.
export function settlementBreakdown(gross: number): SettlementBreakdown {
  const base = Math.max(0, gross)
  const supply = supplyFor(base)
  const amount = Math.floor(supply * EXPERT_SHARE)
  const withholding = withholdingFor(amount)
  return { gross: base, vat: base - supply, supply, amount, withholding, net: amount - withholding }
}

// 주민등록번호 마스킹 (뒷자리 첫 글자까지만 표시)
export function maskResidentId(rid: string) {
  const digits = rid.replace(/\D/g, '')
  if (digits.length < 7) return rid
  return `${digits.slice(0, 6)}-${digits[6]}******`
}

export interface SettlementSummary {
  gross: number // 총매출(차감 전, 부가세 포함)
  vat: number // 이번 회차 부가세 10%
  supply: number // 이번 회차 공급가액 (부가세 제외)
  available: number // 출금 가능액 (공급가액의 80%, 기신청분 제외)
  paidOut: number // 지급 완료액
  requested: number // 신청/승인 대기 중 금액
}

export interface SettlementRow {
  id: string
  amount: number
  gross_amount: number // 결제금액 기준 (부가세 포함)
  fee_rate: number
  vat_rate: number
  vat_amount: number // 부가세 (10%)
  supply_amount: number // 공급가액 = gross_amount − vat_amount
  withholding_amount: number // 원천징수액 (3.3%)
  net_amount: number // 실지급액 = amount − withholding_amount
  status: 'requested' | 'approved' | 'paid' | 'rejected'
  requested_at: string
  paid_at: string | null
}

export interface PayoutAccount {
  bank: string
  account_no: string
  holder: string
  resident_id: string | null // 주민등록번호 (원천징수 신고용)
}

export async function getSettlementSummary(expertId: string): Promise<SettlementSummary> {
  const empty: SettlementSummary = {
    gross: 0,
    vat: 0,
    supply: 0,
    available: 0,
    paidOut: 0,
    requested: 0,
  }
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

  // 이번 회차 정산 대상(기신청분 제외)에 서버 RPC와 같은 순서로 부가세 → 80%를 적용
  const b = settlementBreakdown(gross - alreadyGross)

  return {
    gross,
    vat: b.vat,
    supply: b.supply,
    available: b.amount,
    paidOut,
    requested,
  }
}

export async function getSettlements(expertId: string): Promise<SettlementRow[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('settlements')
    .select(
      'id, amount, gross_amount, fee_rate, vat_rate, vat_amount, supply_amount, withholding_amount, net_amount, status, requested_at, paid_at',
    )
    .eq('expert_id', expertId)
    .order('requested_at', { ascending: false })
  return (data as SettlementRow[]) ?? []
}

export async function getPayoutAccount(expertId: string): Promise<PayoutAccount | null> {
  if (!supabase) return null
  const { data } = await supabase
    .from('payout_accounts')
    .select('bank, account_no, holder, resident_id')
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

// expertId는 관리자가 지도자 대신 신청할 때만 서버에서 사용됨 (일반 지도자는 본인 계정 기준)
export async function requestSettlement(expertId?: string) {
  if (!supabase) return { error: '연결이 설정되지 않았습니다.' }
  const { error } = await supabase.rpc('request_settlement', {
    p_expert_id: expertId ?? null,
  })
  if (error) {
    if (error.message.includes('no balance')) return { error: '출금 가능한 금액이 없습니다.' }
    if (error.message.includes('no resident id'))
      return { error: '원천징수(3.3%) 신고를 위해 정산 계좌에 주민등록번호를 먼저 등록해 주세요.' }
    return { error: error.message }
  }
  return { error: null }
}
