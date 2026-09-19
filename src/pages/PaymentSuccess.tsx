import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

type State = 'confirming' | 'done' | 'error'

export default function PaymentSuccess() {
  const [params] = useSearchParams()
  const [state, setState] = useState<State>('confirming')
  const [message, setMessage] = useState('')
  const ran = useRef(false)

  const type = params.get('type') as 'course' | 'ebook' | null
  const id = params.get('id')

  useEffect(() => {
    if (ran.current) return // 중복 호출 방지(뒤로가기 등)
    ran.current = true

    const run = async () => {
      const paymentKey = params.get('paymentKey')
      const orderId = params.get('orderId')
      const amount = Number(params.get('amount'))
      if (!paymentKey || !orderId || !amount || !type || !id || !supabase) {
        setState('error')
        setMessage('결제 정보가 올바르지 않습니다.')
        return
      }
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setState('error')
        setMessage('로그인이 필요합니다.')
        return
      }
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/confirm-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ paymentKey, orderId, amount, itemType: type, itemId: id }),
        })
        const data = await res.json()
        if (!res.ok || !data.ok) {
          setState('error')
          setMessage(data.message || '결제 승인에 실패했습니다.')
          return
        }
        setState('done')
      } catch (e) {
        setState('error')
        setMessage('결제 승인 중 오류가 발생했습니다.')
      }
    }
    run()
  }, [params, type, id])

  const readUrl = type === 'course' ? `/learn/${id}` : `/read/${id}`

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      {state === 'confirming' && (
        <>
          <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="mt-4 text-slate-600">결제를 확인하고 있어요…</p>
        </>
      )}

      {state === 'done' && (
        <>
          <div className="text-6xl">🎉</div>
          <h1 className="mt-4 text-2xl font-black text-slate-900">결제가 완료됐어요</h1>
          <p className="mt-2 text-slate-500">바로 학습을 시작해 보세요.</p>
          <div className="mt-8 flex flex-col gap-2">
            <Link
              to={readUrl}
              className="rounded-xl bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700"
            >
              {type === 'course' ? '바로 수강하기' : '바로 읽기'}
            </Link>
            <Link to="/my" className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50">
              내 강의로 가기
            </Link>
          </div>
        </>
      )}

      {state === 'error' && (
        <>
          <div className="text-6xl">😢</div>
          <h1 className="mt-4 text-2xl font-black text-slate-900">결제 확인에 실패했어요</h1>
          <p className="mt-2 text-sm text-slate-500">{message}</p>
          <div className="mt-8 flex flex-col gap-2">
            <Link
              to={type === 'course' ? `/courses/${id}` : `/ebooks/${id}`}
              className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800"
            >
              다시 시도
            </Link>
            <Link to="/my" className="text-sm text-slate-500 hover:underline">
              주문 내역 확인
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
