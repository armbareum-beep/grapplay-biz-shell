import { Link } from 'react-router-dom'
import Icon from './Icon'
import { Course, formatPrice, COVER_BY_CATEGORY, COVER_DEFAULT } from '../data/mock'
import { getCourseMeta, discountPct } from '../data/mockMarketplace'
import { useWishlist } from '../lib/wishlist'
import { useBizData } from '../lib/useBizData'
import ExpertAvatar from './ExpertAvatar'

export default function CourseCard({ course }: { course: Course }) {
  const { isWished, toggle } = useWishlist()
  const { getExpert, getCourseRating } = useBizData()
  const expert = getExpert(course.expertId)
  const { rating: avgRating, count: ratingCount } = getCourseRating(course.id)
  const wished = isWished('course', course.id)
  const isPaid = course.price > 0
  const meta = getCourseMeta(course.id)
  const originalPrice = course.originalPrice ?? meta.originalPrice
  const off = discountPct(course.price, originalPrice)

  return (
    <Link
      to={`/courses/${course.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-brand-600"
    >
      {/* 표지 — 이미지 위 어두운 오버레이 또는 카테고리별 다크 그라데이션. 제목은 표지 안에 흰색으로 */}
      <div
        className={`relative aspect-[16/10] bg-gradient-to-br ${COVER_BY_CATEGORY[course.category] ?? COVER_DEFAULT}`}
      >
        {course.coverImage && (
          <>
            <img
              src={course.coverImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-slate-950/10" />
          </>
        )}
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold tracking-wider text-white backdrop-blur">
            {course.category}
          </span>
          {meta.isNew && (
            <span className="rounded-full bg-brand-600 px-2 py-1 text-[10px] font-bold tracking-wider text-white">
              NEW
            </span>
          )}
        </div>
        <h3 className="absolute inset-x-4 bottom-4 line-clamp-2 text-lg font-bold leading-snug text-white">
          {course.title}
        </h3>
        {/* 찜 하트 */}
        <button
          onClick={(e) => {
            e.preventDefault()
            toggle('course', course.id)
          }}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-sm shadow-sm transition hover:scale-110"
          aria-label="찜하기"
        >
          <Icon name="heart" size={15} filled={wished} className={wished ? 'text-rose-500' : 'text-slate-500'} />
        </button>
      </div>

      {/* 본문 */}
      <div className="flex flex-1 flex-col p-4">
        {/* 작성자(전문가) — 전자책 카드와 통일 */}
        {expert && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ExpertAvatar emoji={expert.avatar} src={expert.avatarUrl} size={18} />
            <span className="truncate">{expert.name}</span>
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
          {ratingCount > 0 && (
            <span className="font-semibold text-amber-400">
              ★ <span className="text-slate-600">{avgRating.toFixed(1)}</span>
              <span className="text-slate-400"> ({ratingCount})</span>
            </span>
          )}
          <span>{course.lessonCount}강</span>
        </div>

        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            {off && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-rose-500">{off}%</span>
                <span className="text-slate-400 line-through">
                  ₩{originalPrice!.toLocaleString()}
                </span>
              </div>
            )}
            <span
              className={`text-lg font-black ${
                isPaid ? 'text-slate-900' : 'text-brand-600'
              }`}
            >
              {formatPrice(course.price)}
            </span>
          </div>
          <span className="text-sm font-semibold text-brand-600 group-hover:underline">
            자세히 →
          </span>
        </div>
      </div>
    </Link>
  )
}
