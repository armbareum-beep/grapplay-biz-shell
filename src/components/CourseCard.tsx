import { Link } from 'react-router-dom'
import Icon from './Icon'
import { Course, formatPrice } from '../data/mock'
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
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60"
    >
      {/* 썸네일 (이미지 있으면 이미지, 없으면 그라데이션+이모지) */}
      <div
        className={`relative aspect-[16/10] ${course.coverImage ? 'bg-slate-100' : `bg-gradient-to-br ${course.cover}`}`}
      >
        {course.coverImage ? (
          <img
            src={course.coverImage}
            alt={course.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-5xl">
            {course.thumbEmoji}
          </span>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {course.category}
        </span>
        {meta.isNew && (
          <span className="absolute left-3 bottom-3 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white">
            NEW
          </span>
        )}
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
        <h3 className="line-clamp-2 font-bold leading-snug text-slate-900 group-hover:text-brand-700">
          {course.title}
        </h3>

        {/* 작성자(전문가) — 전자책 카드와 통일 */}
        {expert && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
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
                isPaid ? 'text-slate-900' : 'text-emerald-600'
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
