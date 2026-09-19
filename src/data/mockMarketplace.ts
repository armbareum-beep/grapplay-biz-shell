// 마켓플레이스 보조 — 타입 + 헬퍼만 유지. 목업 데이터는 제거(실데이터는 Supabase).

export interface PromoBanner {
  id?: string
  title: string
  subtitle: string
  gradient: string // Tailwind 그라데이션 클래스
  cta: string
  link?: string // 클릭 시 이동 경로 (내부 /경로 또는 외부 https URL)
}

// 배너는 banners 테이블(관리자 대시보드)에서 온다. 폴백 목업 없음.
export const PROMO_BANNERS: PromoBanner[] = []

// 전문가 약력 — 이제 experts.credentials(편집 가능)에서 온다. 폴백용 빈 맵.
export const EXPERT_CREDENTIALS: Record<string, string[]> = {}

// 강의 마케팅 메타 — 정가/NEW는 강의 자체 필드(original_price 등)로 대체. 폴백용 빈 맵.
export interface CourseMeta {
  isNew?: boolean
  originalPrice?: number // 정가(취소선). 없으면 할인 없음
  accessPeriod?: string // 수강 기한
}

export const COURSE_META: Record<string, CourseMeta> = {}

export function getCourseMeta(courseId: string): CourseMeta {
  return COURSE_META[courseId] ?? {}
}

export function discountPct(price: number, originalPrice?: number): number | null {
  if (!originalPrice || originalPrice <= price) return null
  return Math.round((1 - price / originalPrice) * 100)
}

// 리뷰 별점 보강 (별점 없는 댓글형 리뷰를 deterministic하게 4~5점으로 표시)
export function pseudoRating(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return [5, 5, 4, 5][h % 4]
}

// 상대 시간 표기
export function relativeTime(minutesAgo: number): string {
  if (minutesAgo < 1) return '방금 전'
  if (minutesAgo < 60) return `${minutesAgo}분 전`
  return `${Math.floor(minutesAgo / 60)}시간 전`
}

// 이름 마스킹 (성 + ○○). 이미 마스킹된 값은 그대로.
export function maskName(name: string): string {
  if (name.includes('○')) return name
  return name.charAt(0) + '○○'
}

/** 리브랜딩 이전(보라 계열)에 저장된 배너 그라데이션 → 현재 팔레트. Tailwind가 소스에 없는 클래스는 생성하지 않으므로 렌더 시 치환한다.
 * 전부 브랜드 네이비 계열로만 매핑한다(fuchsia·indigo 등 다른 색조 섞지 않음) — 다크 히어로·철학 섹션과 같은 톤을 유지. */
export const LEGACY_GRADIENT: Record<string, string> = {
  'from-violet-600 to-purple-500': 'from-brand-600 to-brand-500',
  'from-fuchsia-600 to-violet-600': 'from-brand-800 to-brand-600',
  'from-indigo-600 to-purple-600': 'from-brand-950 to-brand-700',
  'from-violet-500 to-fuchsia-500': 'from-brand-600 to-brand-500',
}
export const resolveGradient = (g: string) => LEGACY_GRADIENT[g] ?? g
