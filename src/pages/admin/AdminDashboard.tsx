import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import OverviewTab from './tabs/OverviewTab'
import SettlementsTab from './tabs/SettlementsTab'
import UsersTab from './tabs/UsersTab'
import ExpertsTab from './tabs/ExpertsTab'
import ContentTab from './tabs/ContentTab'
import OrdersTab from './tabs/OrdersTab'
import ReviewsTab from './tabs/ReviewsTab'
import BannerTab from './tabs/BannerTab'

// 관리자 대시보드 — 단일 페이지 + 내부 탭 (전문가 대시보드 패턴 미러링).
// 접근 권한은 ProtectedRoute requireAdmin + RLS is_admin()이 이중으로 강제한다.
type Tab = '개요' | '정산' | '회원' | '전문가' | '콘텐츠' | '주문' | '리뷰' | '배너'
const TABS: Tab[] = ['개요', '정산', '회원', '전문가', '콘텐츠', '주문', '리뷰', '배너']

export default function AdminDashboard() {
  const { profile, session } = useAuth()
  const [tab, setTab] = useState<Tab>('개요')

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-3xl">
          🛠️
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-stone-900">관리자 대시보드</h1>
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-700">
              ADMIN
            </span>
          </div>
          <p className="text-sm text-stone-500">
            {profile?.display_name || session?.user.email}
          </p>
        </div>
      </div>

      {/* 탭 */}
      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-stone-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
              tab === t
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === '개요' && <OverviewTab />}
        {tab === '정산' && <SettlementsTab />}
        {tab === '회원' && <UsersTab />}
        {tab === '전문가' && <ExpertsTab />}
        {tab === '콘텐츠' && <ContentTab />}
        {tab === '주문' && <OrdersTab />}
        {tab === '리뷰' && <ReviewsTab />}
        {tab === '배너' && <BannerTab />}
      </div>
    </div>
  )
}
