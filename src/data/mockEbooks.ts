// 전자책 — 타입 + 헬퍼만 유지. 목업 데이터는 제거(실데이터는 Supabase).

import type { Category, DetailBlock } from './mock'

// 전자책 리뷰 (댓글형, 별점 없음) — 강의 리뷰와 동일 구조
export interface EbookReview {
  id: string
  ebookId: string
  userName: string
  userEmail: string
  content: string
  rating?: number // 1~5 별점 (없으면 평점 미포함)
  createdAt: string
  hidden: boolean
}

export const EBOOK_REVIEWS: EbookReview[] = []

export interface Ebook {
  id: string
  title: string
  subtitle: string
  author: string
  category?: Category
  expertId?: string
  avatar: string // 이모지
  cover: string // Tailwind 그라데이션 (이미지 없을 때 폴백)
  coverImage?: string // 업로드한 표지 이미지 URL
  emoji: string
  price: number // 0 = 무료
  originalPrice?: number
  pageCount: number
  previewPages?: number // 상세에서 공개할 앞 페이지 수
  rating: number
  buyerCount: number
  summary: string
  highlights: string[]
  pdfPath?: string // 비공개 ebook-files 버킷 경로 (구매자만 서명 URL로 열람)
  previewPdfUrl?: string // 앞 N쪽만 담은 공개 미리보기 PDF
  isNew?: boolean
  useLandingPage?: boolean
  detailBlocks?: DetailBlock[]
}

export const EBOOKS: Ebook[] = []

export function getEbook(id: string): Ebook | undefined {
  return EBOOKS.find((e) => e.id === id)
}

export function ebookDiscountPct(price: number, originalPrice?: number): number | null {
  if (!originalPrice || originalPrice <= price) return null
  return Math.round((1 - price / originalPrice) * 100)
}
