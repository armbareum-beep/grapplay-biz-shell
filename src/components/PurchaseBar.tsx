import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Course, formatPrice } from '../data/mock'
import { getCourseMeta, discountPct } from '../data/mockMarketplace'
import { useAuth } from '../lib/auth'
import { useWishlist } from '../lib/wishlist'
import { supabase } from '../lib/supabase'
import { enrollFree } from '../lib/userData'

// 강의 상세 하단 고정 구매바 (pudufu 방식)
export default function PurchaseBar({ course }: { course: Course }) {
  const { user } = useAuth()
  const { isWished, toggle } = useWishlist()
  const navigate = useNavigate()
  const isPaid = course.price > 0
  const meta = getCourseMeta(course.id)
  const originalPrice = course.originalPrice ?? meta.originalPrice
  const off = discountPct(course.price, originalPrice)

  const wished = isWished('course', course.id)
  const [enrolled, setEnrolled] = useState(false)
  const [busy, setBusy] = useState(false)

  // 로그인 시 이 강의의 수강 상태 로드
  useEffect(() => {
    if (!user || !supabase) {
      setEnrolled(false)
      return
    }
    let active = true
    supabase
      .from('enrollments')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('item_type', 'course')
      .eq('item_id', course.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setEnrolled(!!data)
      })
    return () => {
      active = false
    }
  }, [user, course.id])

  const onPrimary = async () => {
    if (!user) {
      navigate('/auth?returnTo=' + encodeURIComponent(`/courses/${course.id}`))
      return
    }
    if (enrolled) {
      navigate(`/learn/${course.id}`)
      return
    }
    if (isPaid) {
      // 결제 플로우 (Phase 04에서 체크아웃 페이지 연결)
      navigate(`/checkout?type=course&id=${course.id}`)
      return
    }
    // 무료 강의 → 즉시 수강 등록
    setBusy(true)
    const { error } = await enrollFree(user.id, 'course', course.id)
    setBusy(false)
    if (error) {
      alert('수강 등록에 실패했습니다: ' + error)
      return
    }
    setEnrolled(true)
    navigate(`/learn/${course.id}`)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        {/* 가격 */}
        <div className="min-w-0">
          {off && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-rose-500">{off}%</span>
              <span className="text-slate-400 line-through">
                ₩{originalPrice!.toLocaleString()}
              </span>
            </div>
          )}
          <div
            className={`text-xl font-black sm:text-2xl ${
              isPaid ? 'text-slate-900' : 'text-emerald-600'
            }`}
          >
            {formatPrice(course.price)}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => toggle('course', course.id)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-300 text-lg hover:bg-slate-50"
            aria-label="찜하기"
          >
            {wished ? '❤️' : '🤍'}
          </button>
          <button className="hidden h-11 rounded-xl border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50 sm:block">
            무료 보기
          </button>
          <button
            onClick={onPrimary}
            disabled={busy}
            className="h-11 rounded-xl bg-brand-600 px-6 font-bold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {enrolled ? '이어보기' : isPaid ? '구매하기' : busy ? '등록 중…' : '무료로 시청하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
