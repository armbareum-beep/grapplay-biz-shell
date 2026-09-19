import type { SettlementRow } from '../../lib/expertApi'

// 관리자 대시보드 공용 UI 조각 (brand 네이비 강조 = 관리자 영역)

export function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string
  icon?: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent ? 'border-brand-200 bg-brand-50' : 'border-stone-200 bg-white'
      }`}
    >
      <div className="text-sm text-stone-500">
        {icon} {label}
      </div>
      <div className="mt-1 text-2xl font-black text-stone-900">{value}</div>
    </div>
  )
}

export function SettlementStatus({ status }: { status: SettlementRow['status'] }) {
  const map: Record<SettlementRow['status'], { label: string; cls: string }> = {
    requested: { label: '신청', cls: 'bg-stone-100 text-stone-600' },
    approved: { label: '승인', cls: 'bg-indigo-100 text-indigo-700' },
    paid: { label: '지급완료', cls: 'bg-emerald-100 text-emerald-700' },
    rejected: { label: '반려', cls: 'bg-rose-100 text-rose-700' },
  }
  const s = map[status]
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.cls}`}>{s.label}</span>
}
