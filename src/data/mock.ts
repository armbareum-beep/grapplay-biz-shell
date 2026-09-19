// 파이네시스 — 타입 정의 + 카테고리(앱 설정) + 공용 헬퍼.
// 목업(가짜) 데이터는 모두 제거됨. 실제 데이터는 Supabase(src/lib/api.ts)에서만 온다.
// 카테고리 4종: 마케팅 · 상권분석 · 연금 · 경영

export type Category = '마케팅' | '상권분석' | '연금' | '경영'

export const CATEGORIES: { key: Category; emoji: string; desc: string }[] = [
  { key: '마케팅', emoji: '📣', desc: '신규 고객 확보와 브랜딩 전략' },
  { key: '상권분석', emoji: '📍', desc: '입지 선정과 상권 데이터 읽는 법' },
  { key: '연금', emoji: '💰', desc: '자영 전문가를 위한 노후·자산 설계' },
  { key: '경영', emoji: '📈', desc: '운영 효율과 수익 구조 설계' },
]

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
  reviewRewardPdfUrl?: string // 리뷰 작성 리워드로 보낼 PDF
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
