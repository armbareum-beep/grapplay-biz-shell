import { Fragment, useEffect, useState } from 'react'
import { formatPrice } from '../../../data/mock'
import { useBizData } from '../../../lib/useBizData'
import {
  listAllSettlements,
  updateSettlementStatus,
  getPayoutAccountFor,
  type AdminSettlement,
} from '../../../lib/adminApi'
import type { PayoutAccount } from '../../../lib/expertApi'
import { SettlementStatus } from '../ui'

// 정산 관리 — 전 전문가의 출금 신청을 승인/반려/지급완료 처리
export default function SettlementsTab() {
  const { getExpert } = useBizData()
  const [list, setList] = useState<AdminSettlement[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Record<string, PayoutAccount | null>>({})
  const [openAccount, setOpenAccount] = useState<string | null>(null)

  const reload = () => listAllSettlements().then(setList)
  useEffect(() => {
    reload()
  }, [])

  const act = async (
    s: AdminSettlement,
    status: 'approved' | 'paid' | 'rejected',
  ) => {
    const labels = { approved: '승인', paid: '지급완료 처리', rejected: '반려' }
    if (status === 'rejected' && !confirm('이 정산 신청을 반려할까요?')) return
    if (
      status === 'paid' &&
      !confirm(
        `실지급액 ${formatPrice(s.net_amount)} 송금을 완료했나요?\n` +
          `(매출 ${formatPrice(s.gross_amount)} − 부가세 ${formatPrice(s.vat_amount)} ` +
          `→ 공급가액 ${formatPrice(s.supply_amount)}의 80% ${formatPrice(s.amount)} ` +
          `− 원천징수 ${formatPrice(s.withholding_amount)})\n지급완료로 처리합니다.`,
      )
    )
      return
    setBusyId(s.id)
    const { error } = await updateSettlementStatus(s.id, status)
    setBusyId(null)
    if (error) return alert(labels[status] + ' 실패: ' + error)
    reload()
  }

  const toggleAccount = async (expertId: string) => {
    if (openAccount === expertId) {
      setOpenAccount(null)
      return
    }
    setOpenAccount(expertId)
    if (!(expertId in accounts)) {
      const acc = await getPayoutAccountFor(expertId)
      setAccounts((m) => ({ ...m, [expertId]: acc }))
    }
  }

  if (!list) {
    return <div className="h-40 animate-pulse rounded-2xl bg-stone-100" />
  }

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-16 text-center">
        <div className="text-4xl">💸</div>
        <p className="mt-3 font-semibold text-stone-700">아직 정산 신청이 없어요</p>
        <p className="mt-1 text-sm text-stone-500">전문가가 출금을 신청하면 여기에 표시됩니다.</p>
      </div>
    )
  }

  const pending = list.filter((s) => s.status === 'requested' || s.status === 'approved').length

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">
        처리 대기 중인 신청 <span className="font-bold text-brand-600">{pending}건</span>. 계좌를
        확인한 뒤 승인 → <span className="font-semibold text-stone-700">실지급액</span> 송금 →
        지급완료 처리하세요. 원천징수(3.3%)분은 다음 달 10일까지 홈택스 신고·납부,
        부가세(10%)분은 다음 분기 25일까지 부가가치세 신고·납부해야 합니다.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-stone-200">
        <table className="w-full min-w-[1120px] text-sm">
          <thead className="bg-stone-50 text-left text-xs text-stone-500">
            <tr>
              <th className="px-4 py-3">신청일</th>
              <th className="px-4 py-3">전문가</th>
              <th className="px-4 py-3">기준 매출</th>
              <th className="px-4 py-3">부가세(10%)</th>
              <th className="px-4 py-3">공급가액</th>
              <th className="px-4 py-3">정산액(80%)</th>
              <th className="px-4 py-3">원천징수(3.3%)</th>
              <th className="px-4 py-3">실지급액</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">계좌</th>
              <th className="px-4 py-3 text-right">처리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {list.map((s) => {
              const expert = getExpert(s.expert_id)
              const busy = busyId === s.id
              const acc = accounts[s.expert_id]
              const showAcc = openAccount === s.expert_id
              return (
                <Fragment key={s.id}>
                  <tr>
                    <td className="px-4 py-3 text-stone-500">{s.requested_at?.slice(0, 10)}</td>
                    <td className="px-4 py-3 font-medium text-stone-800">
                      {expert?.name ?? s.expert_id}
                    </td>
                    <td className="px-4 py-3 text-stone-500">{formatPrice(s.gross_amount)}</td>
                    <td className="px-4 py-3 text-stone-500">−{formatPrice(s.vat_amount)}</td>
                    <td className="px-4 py-3 text-stone-500">{formatPrice(s.supply_amount)}</td>
                    <td className="px-4 py-3 text-stone-600">{formatPrice(s.amount)}</td>
                    <td className="px-4 py-3 text-stone-500">
                      −{formatPrice(s.withholding_amount)}
                    </td>
                    <td className="px-4 py-3 font-bold text-stone-900">
                      {formatPrice(s.net_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <SettlementStatus status={s.status} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleAccount(s.expert_id)}
                        className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                      >
                        {showAcc ? '닫기' : '계좌 보기'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        {s.status === 'requested' && (
                          <button
                            onClick={() => act(s, 'approved')}
                            disabled={busy}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            승인
                          </button>
                        )}
                        {s.status === 'approved' && (
                          <button
                            onClick={() => act(s, 'paid')}
                            disabled={busy}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            지급완료
                          </button>
                        )}
                        {(s.status === 'requested' || s.status === 'approved') && (
                          <button
                            onClick={() => act(s, 'rejected')}
                            disabled={busy}
                            className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50"
                          >
                            반려
                          </button>
                        )}
                        {(s.status === 'paid' || s.status === 'rejected') && (
                          <span className="text-xs text-stone-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {showAcc && (
                    <tr className="bg-stone-50">
                      <td colSpan={11} className="px-4 py-3 text-xs text-stone-600">
                        {acc === undefined ? (
                          '계좌 정보를 불러오는 중…'
                        ) : acc ? (
                          <span>
                            <span className="font-semibold text-stone-800">{acc.bank}</span>{' '}
                            {acc.account_no} · 예금주 {acc.holder} · 주민등록번호{' '}
                            {acc.resident_id ? (
                              <span className="font-semibold text-stone-800">
                                {acc.resident_id}
                              </span>
                            ) : (
                              <span className="text-rose-500">미등록 (원천징수 신고 불가)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-rose-500">정산 계좌가 등록되지 않았습니다.</span>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
