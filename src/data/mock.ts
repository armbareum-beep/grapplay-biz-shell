import type { IconName } from '../components/Icon'

// 파이네시스 — 타입 정의 + 카테고리(앱 설정) + 공용 헬퍼.
// 목업(가짜) 데이터는 모두 제거됨. 실제 데이터는 Supabase(src/lib/api.ts)에서만 온다.
// 카테고리 6종: 마케팅 · 브랜딩 · 상권분석 · 투자 · 경영 · 인문교양
// (2026-09 리브랜딩: '연금' → '투자' rename, 브랜딩·인문교양 신설 — docs/plan/10-rebrand-phynesis.md §4)
// 순서 = 랜딩 그리드·필터 칩 순서: 고객을 모으고 → 자리를 잡고 → 돈을 키우고 → 사람을 키운다.

export type Category = '마케팅' | '브랜딩' | '상권분석' | '투자' | '경영' | '인문교양'

// icon = src/components/Icon.tsx 의 선 아이콘 이름 (이모지 대신 사용 — 톤앤매너)
export const CATEGORIES: { key: Category; icon: IconName; desc: string }[] = [
  { key: '마케팅', icon: 'megaphone', desc: '신규 고객 확보와 광고·홍보 전략' },
  { key: '브랜딩', icon: 'tag', desc: '전문가 개인 브랜드와 포지셔닝' },
  { key: '상권분석', icon: 'map-pin', desc: '입지 선정과 상권 데이터 읽는 법' },
  { key: '투자', icon: 'trending-up', desc: '사업 수익을 자산으로 키우는 투자·재무 설계' },
  { key: '경영', icon: 'briefcase', desc: '운영 효율과 수익 구조 설계' },
  { key: '인문교양', icon: 'book-open', desc: '사업의 안목을 넓히는 인문·교양 강의' },
]

/** 표지 이미지가 없을 때 카드 표지에 쓰는 카테고리별 어두운 그라데이션 (Tailwind 클래스). */
export const COVER_BY_CATEGORY: Record<Category, string> = {
  마케팅: 'from-brand-900 to-brand-600',
  브랜딩: 'from-[#2a1f3d] to-[#5b4a7a]',
  상권분석: 'from-slate-800 to-slate-500',
  투자: 'from-[#3b2f1e] to-[#8a6a2c]',
  경영: 'from-brand-950 to-brand-700',
  인문교양: 'from-[#1f3a2e] to-[#4d7a63]',
}
export const COVER_DEFAULT = 'from-slate-900 to-slate-600'

/** 구 카테고리 → 신 카테고리. `?cat=연금` 같은 북마크·공유 링크 호환용. */
export const LEGACY_CATEGORY: Record<string, Category> = { 연금: '투자' }

/** URL 파라미터 등 외부 문자열을 유효한 Category 로. 구 값은 매핑, 모르는 값은 null. */
export function resolveCategory(v: string | null | undefined): Category | null {
  if (!v) return null
  const k = LEGACY_CATEGORY[v] ?? v
  return CATEGORIES.some((c) => c.key === k) ? (k as Category) : null
}

export interface Expert {
  id: string
  name: string
  title: string
  avatar: string // emoji placeholder (avatarUrl 없을 때 폴백)
  avatarUrl?: string // 업로드한 프로필 사진 URL
  bio: string
  category?: Category // 전문 분야 (관리자가 지정, 단일 — 하위호환)
  categories?: Category[] // 전문 분야 다중 (우선)
  credentials?: string[] // 강사소개 약력 ✓ 불릿
}

export interface Course {
  id: string
  title: string
  subtitle: string
  category: Category
  expertId: string
  price: number // 0 = 무료
  originalPrice?: number // 정가(취소선). 없거나 price 이하면 할인 없음
  isSubscriptionExcluded: boolean // true = 단품판매 전용 (구독 제외)
  cover: string // gradient class placeholder (이미지 없을 때 폴백)
  coverImage?: string // 업로드한 표지 이미지 URL
  thumbEmoji: string
  lessonCount: number
  durationMin: number
  rating: number
  reviewCount: number
  studentCount: number
  summary: string
  curriculum: { title: string; durationMin: number; videoUrl?: string; preview?: boolean }[]
  whatYouLearn: string[]
  useLandingPage?: boolean
  detailBlocks?: DetailBlock[]
  rewardPdfPath?: string // 리뷰 리워드 PDF (비공개 reward-files 버킷 경로, 리뷰 작성자만 열람)
}

export interface DetailBlock {
  id: number
  type: 'heading' | 'text' | 'image'
  value: string
  // 텍스트 꾸미기 (heading/text 전용, 없으면 기본 스타일 — 하위호환)
  size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl'
  weight?: 'normal' | 'medium' | 'bold' | 'black'
  color?: string // hex 예: #7c3aed
  align?: 'left' | 'center' | 'right'
}

// 실데이터(Supabase)에서만 채워진다. 폴백 목업 없음.
export const EXPERTS: Expert[] = []
export const COURSES: Course[] = []

// 전문가 리뷰 (biz_expert_reviews — 전문가 1명당 별점 리뷰)
export interface ExpertReview {
  id: string
  expertId: string
  userName: string
  rating: number
  content: string
  createdAt: string
}

export const EXPERT_REVIEWS: ExpertReview[] = []

// 강의별 리뷰 (course_reviews — 별점 없는 댓글형, 대시보드 리뷰관리용)
export interface CourseReview {
  id: string
  courseId: string
  userName: string
  userEmail: string
  content: string
  rating?: number // 1~5 별점 (없으면 평점 미포함)
  createdAt: string
  hidden: boolean
  pdfSentCount: number
}

export const COURSE_REVIEWS: CourseReview[] = []

export function getExpert(id: string): Expert | undefined {
  return EXPERTS.find((e) => e.id === id)
}

export function getCoursesByExpert(expertId: string): Course[] {
  return COURSES.filter((c) => c.expertId === expertId)
}

export function getExpertReviews(expertId: string): ExpertReview[] {
  return EXPERT_REVIEWS.filter((r) => r.expertId === expertId)
}

export function getExpertStats(expertId: string) {
  const reviews = getExpertReviews(expertId)
  const courses = getCoursesByExpert(expertId)
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  const students = courses.reduce((s, c) => s + c.studentCount, 0)
  const categories = Array.from(new Set(courses.map((c) => c.category)))
  return {
    rating: avg,
    reviewCount: reviews.length,
    courseCount: courses.length,
    studentCount: students,
    categories,
  }
}

export function getCourse(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id)
}

export function formatPrice(price: number): string {
  if (price === 0) return '무료'
  return '₩' + price.toLocaleString('ko-KR')
}
