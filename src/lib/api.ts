import { supabase, isSupabaseConfigured } from './supabase'
import {
  COURSES,
  EXPERTS,
  EXPERT_REVIEWS,
  COURSE_REVIEWS,
  type Course,
  type Expert,
  type ExpertReview,
  type CourseReview,
} from '../data/mock'
import { EBOOKS, EBOOK_REVIEWS, type Ebook, type EbookReview } from '../data/mockEbooks'
import { PROMO_BANNERS, type PromoBanner } from '../data/mockMarketplace'

export interface BizData {
  courses: Course[]
  experts: Expert[]
  expertReviews: ExpertReview[]
  courseReviews: CourseReview[]
  ebooks: Ebook[]
  ebookReviews: EbookReview[]
  banners: PromoBanner[]
  /** true면 실제 Supabase, false면 목업 폴백 */
  live: boolean
}

/* ── 행 → 타입 매퍼 ── */
function mapExpert(r: any): Expert {
  return {
    id: r.id,
    name: r.name,
    title: r.title,
    avatar: r.avatar,
    avatarUrl: r.avatar_url ?? undefined,
    bio: r.bio,
    category: r.category ?? undefined,
    categories:
      Array.isArray(r.categories) && r.categories.length
        ? r.categories
        : r.category
          ? [r.category]
          : [],
    credentials: Array.isArray(r.credentials) ? r.credentials : [],
  }
}

function mapEbookReview(r: any): EbookReview {
  return {
    id: r.id,
    ebookId: r.ebook_id,
    userName: r.user_name,
    userEmail: r.user_email ?? '',
    content: r.content,
    rating: typeof r.rating === 'number' ? r.rating : undefined,
    createdAt: r.created_at,
    hidden: r.hidden,
  }
}

function mapBanner(r: any): PromoBanner {
  return {
    id: r.id,
    title: r.title,
    subtitle: r.subtitle ?? '',
    gradient: r.gradient ?? 'from-brand-600 to-brand-500',
    cta: r.cta ?? '',
    link: r.link ?? undefined,
  }
}

function mapCourse(r: any): Course {
  return {
    id: r.id,
    title: r.title,
    subtitle: r.subtitle,
    category: r.category,
    expertId: r.expert_id,
    price: r.price,
    originalPrice: r.original_price ?? undefined,
    isSubscriptionExcluded: r.is_subscription_excluded,
    cover: r.cover,
    coverImage: r.cover_image ?? undefined,
    thumbEmoji: r.thumb_emoji,
    lessonCount: r.lesson_count,
    durationMin: r.duration_min,
    rating: Number(r.rating),
    reviewCount: r.review_count,
    studentCount: r.student_count,
    summary: r.summary,
    curriculum: r.curriculum ?? [],
    whatYouLearn: r.what_you_learn ?? [],
    useLandingPage: r.use_landing_page ?? false,
    detailBlocks: r.detail_blocks ?? [],
    rewardPdfPath: r.reward_pdf_path ?? undefined,
  }
}

function mapExpertReview(r: any): ExpertReview {
  return {
    id: r.id,
    expertId: r.expert_id,
    userName: r.user_name,
    rating: r.rating,
    content: r.content,
    createdAt: r.created_at,
  }
}

function mapCourseReview(r: any): CourseReview {
  return {
    id: r.id,
    courseId: r.course_id,
    userName: r.user_name,
    userEmail: r.user_email,
    content: r.content,
    rating: typeof r.rating === 'number' ? r.rating : undefined,
    createdAt: r.created_at,
    hidden: r.hidden,
    pdfSentCount: r.pdf_sent_count,
  }
}

function mapEbook(r: any): Ebook {
  return {
    id: r.id,
    title: r.title,
    subtitle: r.subtitle,
    author: r.author,
    category: r.category ?? undefined,
    expertId: r.expert_id ?? undefined,
    avatar: r.avatar,
    cover: r.cover,
    coverImage: r.cover_image ?? undefined,
    emoji: r.emoji,
    price: r.price,
    originalPrice: r.original_price ?? undefined,
    pageCount: r.page_count,
    previewPages: r.preview_pages ?? undefined,
    rating: Number(r.rating),
    buyerCount: r.buyer_count,
    summary: r.summary,
    highlights: r.highlights ?? [],
    pdfPath: r.pdf_path ?? undefined,
    previewPdfUrl: r.preview_pdf_url ?? undefined,
    isNew: r.is_new,
    useLandingPage: r.use_landing_page ?? false,
    detailBlocks: r.detail_blocks ?? [],
  }
}

/* ── 전체 로드 (목업 폴백 포함) ── */
export async function fetchBizData(): Promise<BizData> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      courses: COURSES,
      experts: EXPERTS,
      expertReviews: EXPERT_REVIEWS,
      courseReviews: COURSE_REVIEWS,
      ebooks: EBOOKS,
      ebookReviews: EBOOK_REVIEWS,
      banners: PROMO_BANNERS,
      live: false,
    }
  }

  const [coursesRes, expertsRes, erRes, crRes, ebooksRes] = await Promise.all([
    supabase.from('courses').select('*').order('sort_order', { ascending: true }),
    supabase.from('experts').select('*'),
    supabase.from('expert_reviews').select('*').order('created_at', { ascending: false }),
    supabase.from('course_reviews').select('*').order('created_at', { ascending: false }),
    supabase.from('ebooks').select('*').order('sort_order', { ascending: true }),
  ])

  const firstError =
    coursesRes.error || expertsRes.error || erRes.error || crRes.error || ebooksRes.error
  if (firstError) {
    // 실데이터 실패 시 목업으로 폴백해 화면이 깨지지 않게 함
    console.error('[api] Supabase 조회 실패, 목업으로 폴백:', firstError.message)
    return {
      courses: COURSES,
      experts: EXPERTS,
      expertReviews: EXPERT_REVIEWS,
      courseReviews: COURSE_REVIEWS,
      ebooks: EBOOKS,
      ebookReviews: EBOOK_REVIEWS,
      banners: PROMO_BANNERS,
      live: false,
    }
  }

  // 배너·전자책리뷰는 별도(방어적) 조회 — 미마이그레이션이어도 나머지는 라이브 유지
  let banners: PromoBanner[] = PROMO_BANNERS
  const bannersRes = await supabase
    .from('banners')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
  if (!bannersRes.error && (bannersRes.data?.length ?? 0) > 0) {
    banners = bannersRes.data!.map(mapBanner)
  }

  let ebookReviews: EbookReview[] = []
  const ebrRes = await supabase
    .from('ebook_reviews')
    .select('*')
    .order('created_at', { ascending: false })
  if (!ebrRes.error) ebookReviews = (ebrRes.data ?? []).map(mapEbookReview)

  return {
    courses: (coursesRes.data ?? []).map(mapCourse),
    experts: (expertsRes.data ?? []).map(mapExpert),
    expertReviews: (erRes.data ?? []).map(mapExpertReview),
    courseReviews: (crRes.data ?? []).map(mapCourseReview),
    ebooks: (ebooksRes.data ?? []).map(mapEbook),
    ebookReviews,
    banners,
    live: true,
  }
}
