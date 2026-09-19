import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

// 로그인 필수 라우트 래퍼.
// requireExpert=true면 전문가(지도자) 권한, requireAdmin=true면 관리자 권한도 검사.
// 관리자는 전문가 전용 페이지(편집기 등)에도 접근 가능하도록 requireExpert를 통과시킨다.
export default function ProtectedRoute({
  children,
  requireExpert = false,
  requireAdmin = false,
}: {
  children: React.ReactNode
  requireExpert?: boolean
  requireAdmin?: boolean
}) {
  const { session, profile, loading } = useAuth()
  const loc = useLocation()

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to={`/auth?returnTo=${encodeURIComponent(loc.pathname)}`} replace />
  }

  const isAdmin = profile?.role === 'admin'

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />
  }

  if (requireExpert && !isAdmin && !(profile?.role === 'expert' && profile.expert_id)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
