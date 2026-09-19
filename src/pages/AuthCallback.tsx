import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// 카카오 등 OAuth 복귀 처리. detectSessionInUrl이 켜져 있어 대부분 자동 처리되지만,
// PKCE code가 있으면 명시적으로 세션 교환한 뒤 returnTo로 이동한다.
export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      if (!supabase) {
        navigate('/', { replace: true })
        return
      }
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
        if (error) {
          setError(error.message)
          return
        }
      }
      const returnTo = localStorage.getItem('returnTo') || '/my'
      localStorage.removeItem('returnTo')
      navigate(returnTo, { replace: true })
    }
    run()
  }, [navigate])

  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      {error ? (
        <div className="text-center">
          <p className="text-sm text-rose-600">로그인 처리 중 오류가 발생했습니다.</p>
          <p className="mt-1 text-xs text-slate-400">{error}</p>
          <button
            onClick={() => navigate('/auth', { replace: true })}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            다시 로그인
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          로그인 처리 중…
        </div>
      )}
    </div>
  )
}
