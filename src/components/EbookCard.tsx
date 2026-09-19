import { Link } from 'react-router-dom'
import Icon from './Icon'
import { formatPrice, COVER_BY_CATEGORY, COVER_DEFAULT } from '../data/mock'
import { Ebook, ebookDiscountPct } from '../data/mockEbooks'
import { useWishlist } from '../lib/wishlist'
import { useBizData } from '../lib/useBizData'
import ExpertAvatar from './ExpertAvatar'

export default function EbookCard({ ebook }: { ebook: Ebook }) {
  const { isWished, toggle } = useWishlist()
  const { getExpert, getEbookRating } = useBizData()
  const expert = ebook.expertId ? getExpert(ebook.expertId) : undefined
  const { rating: avgRating, count: ratingCount } = getEbookRating(ebook.id)
  const wished = isWished('ebook', ebook.id)
  const isPaid = ebook.price > 0
  const off = ebookDiscountPct(ebook.price, ebook.originalPrice)

  return (
    <Link
      to={`/ebooks/${ebook.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-brand-600"
    >
      {/* 표지 — 이미지 위 어두운 오버레이 또는 카테고리별 다크 그라데이션. 제목은 표지 안에 흰색으로 */}
      <div
        className={`relative aspect-[16/10] bg-gradient-to-br ${(ebook.category && COVER_BY_CATEGORY[ebook.category]) || COVER_DEFAULT}`}
      >
        {ebook.coverImage && (
          <>
            <img src={ebook.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-slate-950/10" />
          </>
        )}
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold tracking-wider text-white backdrop-blur">
            전자책{ebook.category ? ` · ${ebook.category}` : ''}
          </span>
          {ebook.isNew && (
            <span className="rounded-full bg-gold-500 px-2 py-1 text-[10px] font-bold tracking-wider text-white">
              NEW
            </span>
          )}
        </div>
        <h3 className="absolute inset-x-4 bottom-4 line-clamp-2 text-lg font-bold leading-snug text-white">
          {ebook.title}
        </h3>
        <button
          onClick={(e) => {
            e.preventDefault()
            toggle('ebook', ebook.id)
          }}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-sm shadow-sm transition hover:scale-110"
          aria-label="찜하기"
        >
          <Icon name="heart" size={15} filled={wished} className={wished ? 'text-rose-500' : 'text-slate-500'} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <ExpertAvatar emoji={expert?.avatar ?? ebook.avatar} src={expert?.avatarUrl} size={18} />
          <span className="truncate">{ebook.author}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
          {ratingCount > 0 && (
            <span className="font-semibold text-amber-400">
              ★ <span className="text-slate-600">{avgRating.toFixed(1)}</span>
              <span className="text-slate-400"> ({ratingCount})</span>
            </span>
          )}
          <span>{ebook.pageCount}p</span>
        </div>

        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            {off && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-rose-500">{off}%</span>
                <span className="text-slate-400 line-through">
                  ₩{ebook.originalPrice!.toLocaleString()}
                </span>
              </div>
            )}
            <span
              className={`text-lg font-black ${isPaid ? 'text-slate-900' : 'text-gold-600'}`}
            >
              {formatPrice(ebook.price)}
            </span>
          </div>
          <span className="text-sm font-semibold text-brand-600 group-hover:underline">
            보기 →
          </span>
        </div>
      </div>
    </Link>
  )
}
