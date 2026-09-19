import { useEffect, useState } from 'react'
import { formatPrice } from '../../../data/mock'
import { useBizData } from '../../../lib/useBizData'
import { listAllOrders, type AdminOrder } from '../../../lib/adminApi'

const FILTERS: { key: string; label: string }[] = [
  { key: '', label: '전체' },
  { key: 'paid', label: '결제완료' },
  { key: 'pending', label: '대기' },
  { key: 'failed', label: '실패' },
  { key: 'canceled', label: '취소' },
]

const STATUS_CLS: Record<AdminOrder['status'], string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-stone-100 text-stone-600',
  failed: 'bg-rose-100 text-rose-700',
  canceled: 'bg-stone-100 text-stone-500',
}
const STATUS_LABEL: Record<AdminOrder['status'], string> = {
  paid: '결제완료',
  pending: '대기',
  failed: '실패',
  canceled: '취소',
}

// 주문 관리 — 전체 주문 + GMV + 상태 필터
export default function OrdersTab() {
  const { getCourse, getEbook } = useBizData()
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    listAllOrders({ status: status || undefined }).then(setOrders)
  }, [status])

  const itemTitle = (o: AdminOrder) =>
    (o.item_type === 'course' ? getCourse(o.item_id)?.title : getEbook(o.item_id)?.title) ?? o.item_id

  const gmv = (orders ?? []).filter((o) => o.status === 'paid').reduce((s, o) => s + o.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                status === f.key ? 'bg-brand-600 text-white' : 'border border-stone-300 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="text-sm text-stone-500">
          현재 목록 결제완료 합계 <span className="font-bold text-stone-900">{formatPrice(gmv)}</span>
        </div>
      </div>

      {!orders ? (
        <div className="h-40 animate-pulse rounded-2xl bg-stone-100" />
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-12 text-center text-sm text-stone-500">
          주문이 없어요.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-stone-50 text-left text-xs text-stone-500">
              <tr>
                <th className="px-4 py-3">일시</th>
                <th className="px-4 py-3">상품</th>
                <th className="px-4 py-3">유형</th>
                <th className="px-4 py-3">금액</th>
                <th className="px-4 py-3">결제수단</th>
                <th className="px-4 py-3">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 text-stone-500">
                    {(o.paid_at ?? o.created_at)?.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 font-medium text-stone-800">{itemTitle(o)}</td>
                  <td className="px-4 py-3 text-stone-500">
                    {o.item_type === 'course' ? '강의' : '전자책'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-stone-900">{formatPrice(o.amount)}</td>
                  <td className="px-4 py-3 text-stone-500">{o.method ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_CLS[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
