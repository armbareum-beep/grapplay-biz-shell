import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './supabase'

// 프로필(역할/전문가 연결) — profiles 테이블에서 로드
export interface Profile {
  role: 'user' | 'expert' | 'admin'
  expert_id: string | null
  display_name: string | null
  avatar_url: string | null
}

interface AuthCtx {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  configured: boolean
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>
  signInWithKakao: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

// 프로필 조회 — avatar_url 컬럼이 아직 마이그레이션 안 됐어도 깨지지 않도록 폴백.
// (avatar_url 미적용 시 명시적 select가 에러 → 축소 컬럼으로 재조회)
async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const full = await supabase
    .from('profiles')
    .select('role, expert_id, display_name, avatar_url')
    .eq('id', userId)
    .single()
  if (!full.error) return (full.data as Profile) ?? null

  // avatar_url 컬럼 부재 등으로 실패 시 핵심 컬럼만 재조회
  const basic = await supabase
    .from('profiles')
    .select('role, expert_id, display_name')
    .eq('id', userId)
    .single()
  if (basic.error || !basic.data) return null
  return { ...(basic.data as Omit<Profile, 'avatar_url'>), avatar_url: null }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)

  // 세션 초기화 + 변경 구독
  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // 세션 변경 시 프로필 로드
  useEffect(() => {
    if (!supabase || !session) {
      setProfile(null)
      setProfileUserId(null)
      return
    }
    let cancelled = false
    fetchProfile(session.user.id).then((p) => {
      if (!cancelled) {
        setProfile(p)
        setProfileUserId(session.user.id)
      }
    })
    return () => {
      cancelled = true
    }
  }, [session])

  // 프로필 수정(마이페이지) 후 다시 읽어 헤더/마이페이지에 즉시 반영
  const refreshProfile: AuthCtx['refreshProfile'] = async () => {
    if (!supabase || !session) return
    setProfile(await fetchProfile(session.user.id))
  }

  const signInWithPassword: AuthCtx['signInWithPassword'] = async (email, password) => {
    if (!supabase) return { error: '로그인이 아직 설정되지 않았습니다.' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp: AuthCtx['signUp'] = async (email, password, displayName) => {
    if (!supabase) return { error: '회원가입이 아직 설정되지 않았습니다.' }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: displayName } },
    })
    return { error: error?.message ?? null }
  }

  const signInWithKakao: AuthCtx['signInWithKakao'] = async () => {
    if (!supabase) return { error: '소셜 로그인이 아직 설정되지 않았습니다.' }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    return { error: error?.message ?? null }
  }

  const signOut: AuthCtx['signOut'] = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    profile,
    loading: loading || (!!session && profileUserId !== session.user.id),
    configured: isSupabaseConfigured,
    signInWithPassword,
    signUp,
    signInWithKakao,
    signOut,
    refreshProfile,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
