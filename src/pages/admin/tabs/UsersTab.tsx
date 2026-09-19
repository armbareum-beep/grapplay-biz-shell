import { Fragment, useEffect, useState } from 'react'
import { useBizData } from '../../../lib/useBizData'
import { listUsers, setUserRole, type AdminUser, type UserRole } from '../../../lib/adminApi'

// 회원 관리 — 검색 + 역할 변경(전문가 승격/관리자 지정/일반회원 강등)
export default function UsersTab() {
  const { experts, getExpert } = useBizData()
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [promoting, setPromoting] = useState<string | null>(null) // 승격 패널 펼친 user id
  const [pickExpert, setPickExpert] = useState('')

  const reload = (term?: string) => listUsers(term).then(setUsers)
  useEffect(() => {
    reload()
  }, [])

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    reload(search)
  }

  const changeRole = async (u: AdminUser, role: UserRole, expertId?: string) => {
    setBusyId(u.id)
    const { error } = await setUserRole(u.id, role, expertId)
    setBusyId(null)
    if (error) return alert('변경 실패: ' + error)
    setPromoting(null)
    setPickExpert('')
    reload(search)
  }

  const roleBadge = (role: UserRole) => {
    const map: Record<UserRole, string> = {
      user: 'bg-stone-100 text-stone-600',
      expert: 'bg-indigo-100 text-indigo-700',
      admin: 'bg-brand-100 text-brand-700',
    }
    const label: Record<UserRole, string> = { user: '일반', expert: '전문가', admin: '관리자' }
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${map[role]}`}>{label[role]}</span>
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSearch} className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이메일 또는 이름 검색"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
        <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800">
          검색
        </button>
      </form>

      {!users ? (
        <div className="h-40 animate-pulse rounded-2xl bg-stone-100" />
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-12 text-center text-sm text-stone-500">
          회원이 없어요.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-stone-50 text-left text-xs text-stone-500">
              <tr>
                <th className="px-4 py-3">회원</th>
                <th className="px-4 py-3">역할</th>
                <th className="px-4 py-3">연결 전문가</th>
                <th className="px-4 py-3">가입일</th>
                <th className="px-4 py-3 text-right">역할 변경</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((u) => {
                const busy = busyId === u.id
                const expert = u.expert_id ? getExpert(u.expert_id) : undefined
                return (
                  <Fragment key={u.id}>
                    <tr>
                      <td className="px-4 py-3">
                        <div className="font-medium text-stone-800">{u.display_name || '—'}</div>
                        <div className="text-xs text-stone-400">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">{roleBadge(u.role)}</td>
                      <td className="px-4 py-3 text-stone-500">
                        {expert ? expert.name : u.expert_id ? u.expert_id : '—'}
                      </td>
                      <td className="px-4 py-3 text-stone-500">{u.created_at?.slice(0, 10)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {u.role !== 'expert' && (
                            <button
                              onClick={() => {
                                setPromoting(promoting === u.id ? null : u.id)
                                setPickExpert('')
                              }}
                              disabled={busy}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                              전문가 승격
                            </button>
                          )}
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => {
                                if (confirm(`${u.email} 님을 관리자로 지정할까요?`)) changeRole(u, 'admin')
                              }}
                              disabled={busy}
                              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                            >
                              관리자 지정
                            </button>
                          )}
                          {u.role !== 'user' && (
                            <button
                              onClick={() => {
                                if (confirm(`${u.email} 님을 일반회원으로 변경할까요?`)) changeRole(u, 'user')
                              }}
                              disabled={busy}
                              className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50"
                            >
                              일반회원
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {promoting === u.id && (
                      <tr className="bg-indigo-50/50">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-stone-600">연결할 전문가 선택:</span>
                            <select
                              value={pickExpert}
                              onChange={(e) => setPickExpert(e.target.value)}
                              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-brand-400"
                            >
                              <option value="">전문가를 선택하세요</option>
                              {experts.map((e) => (
                                <option key={e.id} value={e.id}>
                                  {e.name} ({e.title})
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => pickExpert && changeRole(u, 'expert', pickExpert)}
                              disabled={busy || !pickExpert}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
                            >
                              승격 확정
                            </button>
                            <span className="text-xs text-stone-400">
                              전문가가 없다면 전문가 탭에서 먼저 등록하세요.
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
