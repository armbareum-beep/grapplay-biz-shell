import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'
import { useAuth } from '../lib/auth'
import { useBizData } from '../lib/useBizData'
import { formatPrice } from '../data/mock'

// 미설정 시 토스 공개 테스트 클라이언트 키(API 개별 연동 키)로 동작
const CLIENT_KEY =
  import.meta.env.VITE_TOSS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq'

export default function Checkout() {
  const [params] = useSearchParams()
  const type = params.get('type') as 'course' | 'ebook' | null
  const id = params.get('id')
  const { user, profile } = useAuth()
  const { getCourse, getEbook, loading } = useBizData()

  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const item =
    type === 'course' ? getCourse(id ?? '') : type === 'ebook' ? getEbook(id ?? '') : undefined
  const price = item?.price ?? 0
  const title = item?.title ?? ''

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  if (!item || !type) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-slate-600">결제할 상품을 찾을 수 없어요.</p>
        <Link to="/" className="mt-4 inline-block text-brand-600">
          홈으로
        </Link>
      </div>
    )
  }

  if (price <= 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-slate-600">무료 상품입니다. 상세 페이지에서 바로 받을 수 있어요.</p>
        <Link
          to={type === 'course' ? `/courses/${id}` : `/ebooks/${id}`}
          className="mt-4 inline-block text-brand-600"
        >
          상세로 돌아가기
        </Link>
      </div>
    )
  }

  const onPay = async () => {
    if (!user) return
    setError(null)
    setPaying(true)
    const orderId = crypto.randomUUID() // order_key
    try {
      const toss = await loadTossPayments(CLIENT_KEY)
      const payment = toss.payment({ customerKey: user.id })
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: price },
        orderId,
        orderName: title,
        successUrl: `${window.location.origin}/payments/success?type=${type}&id=${id}`,
        failUrl: `${window.location.origin}/payments/fail`,
        customerEmail: user.email ?? undefined,
        customerName: profile?.display_name ?? undefined,
        card: {
          useEscrow: false,
          flowMode: 'DEFAULT',
          useCardPoint: false,
          useAppCardOnly: false,
        },
      })
    } catch (e) {
      setPaying(false)
      setError('결제를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-black text-slate-900">결제하기</h1>

      {/* 주문 요약 */}
      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid h-16 w-24 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-500 text-2xl text-white">
          {type === 'course' ? '🎬' : '📘'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-brand-600">
            {type === 'course' ? '강의' : '전자책'}
          </div>
          <h2 className="truncate font-bold text-slate-900">{title}</h2>
        </div>
        <div className="text-xl font-black text-slate-900">{formatPrice(price)}</div>
      </div>

      {/* 결제 금액 */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <span className="text-slate-600">최종 결제 금액</span>
          <span className="text-2xl font-black text-slate-900">{formatPrice(price)}</span>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <button
        onClick={onPay}
        disabled={paying}
        className="mt-6 w-full rounded-xl bg-brand-600 py-4 text-lg font-bold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {paying ? '결제 진행 중…' : `${formatPrice(price)} 결제하기`}
      </button>

      <p className="mt-3 text-center text-xs text-slate-400">
        카드 결제창으로 이동합니다. 테스트 모드에서는 실제 결제가 발생하지 않습니다.
      </p>
    </div>
  )
}
