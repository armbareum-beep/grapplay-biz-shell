import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom'
import { useBizData } from '../lib/useBizData'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { toEmbedUrl, fetchVimeoPortrait } from '../lib/video'
import VimeoPlayer from '../components/VimeoPlayer'
import { getCourseProgress, saveCourseProgress, type LessonProgress } from '../lib/userData'

// 전체 진도(%) = 영상 있는 회차들의 시청 비율 평균. 90% 이상 본 회차는 1로 간주.
function calcPct(ls: LessonProgress, curriculum: { videoUrl?: string }[]): number {
  const vids = curriculum.filter((l) => l.videoUrl)
  if (!vids.length) return 0
  let watched = 0
  curriculum.forEach((l, i) => {
    const p = ls[i]
    if (l.videoUrl && p && p.d > 0) watched += Math.min(p.s / p.d, 1)
  })
  return Math.round((watched / vids.length) * 100)
}

type Tab = '내용' | '목차' | '공지'
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: '내용', label: '내용', icon: '📖' },
  { id: '목차', label: '목차', icon: '☰' },
  { id: '공지', label: '공지', icon: '🔔' },
]

const NOTICES = [
  '사용기한(구매일로부터 최대 1년) 동안 마이페이지 > 내 강의에서 무제한 다시 볼 수 있습니다.',
  '콘텐츠의 무단 복제·배포·공유는 저작권법에 의해 금지됩니다.',
  '강의는 지속적으로 업데이트되며 추가 비용 없이 시청할 수 있습니다.',
]

export default function AcademyCourseLearn() {
  const { id } = useParams()
  const { getCourse, getExpert, loading } = useBizData()
  const { user } = useAuth()
  const course = getCourse(id ?? '')

  const [enrolled, setEnrolled] = useState<boolean | null>(null)
  const [idx, setIdx] = useState(0)
  const [tab, setTab] = useState<Tab>('내용')
  const [portrait, setPortrait] = useState(false)
  // 회차별 재생 위치(진도) — lessonProg, 저장/언마운트용 ref
  const [lessonProg, setLessonProg] = useState<LessonProgress>({})
  const lessonsRef = useRef<LessonProgress>({})
  const courseRef = useRef(course)
  courseRef.current = course
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resumedRef = useRef(false)

  // 현재 레슨 영상이 세로면 9:16 가운데 정렬, 아니면 기본 16:9
  const lessonUrl = course?.curriculum[idx]?.videoUrl
  useEffect(() => {
    setPortrait(false) // 레슨 바뀌면 일단 가로(기본)로
    let active = true
    fetchVimeoPortrait(lessonUrl).then((p) => {
      if (active && p) setPortrait(true)
    })
    return () => {
      active = false
    }
  }, [lessonUrl])

  useEffect(() => {
    if (!user || !supabase || !id) {
      setEnrolled(false)
      return
    }
    let active = true
    supabase
      .from('enrollments')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('item_type', 'course')
      .eq('item_id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setEnrolled(!!data)
      })
    return () => {
      active = false
    }
  }, [user, id])

  // 진도 로드 + 이어볼 회차 선택(가장 마지막으로 본 회차)
  useEffect(() => {
    if (!user || !id || enrolled !== true) return
    let active = true
    getCourseProgress(user.id, id).then(({ lessons: ls }) => {
      if (!active) return
      lessonsRef.current = ls
      setLessonProg(ls)
      if (!resumedRef.current) {
        resumedRef.current = true
        const keys = Object.keys(ls)
          .map(Number)
          .filter((k) => (ls[k]?.s ?? 0) > 0)
        if (keys.length) setIdx(Math.max(...keys))
      }
    })
    return () => {
      active = false
    }
  }, [user, id, enrolled])

  // 재생 위치 보고 → 회차별 + 전체% 저장(4초 디바운스)
  const handleTime = (seconds: number, duration: number) => {
    const next: LessonProgress = {
      ...lessonsRef.current,
      [idx]: { s: Math.round(seconds), d: Math.round(duration) },
    }
    lessonsRef.current = next
    setLessonProg(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const cur = courseRef.current
      if (user && id && cur) {
        saveCourseProgress(user.id, id, lessonsRef.current, calcPct(lessonsRef.current, cur.curriculum))
      }
    }, 4000)
  }

  // 화면 이탈 시 마지막 진도 저장
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      const cur = courseRef.current
      if (user && id && cur && Object.keys(lessonsRef.current).length) {
        saveCourseProgress(user.id, id, lessonsRef.current, calcPct(lessonsRef.current, cur.curriculum))
      }
    }
  }, [user, id])

  if (loading || enrolled === null) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="text-5xl">🤔</div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">강의를 찾을 수 없어요</h1>
        <Link to="/library" className="mt-6 inline-block rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
          강의 목록으로
        </Link>
      </div>
    )
  }

  // 미등록자는 판매(상세) 페이지로
  if (!enrolled) {
    return <Navigate to={`/courses/${course.id}`} replace />
  }

  const expert = getExpert(course.expertId)
  const lessons = course.curriculum
  const current = lessons[idx]
  const embed = toEmbedUrl(current?.videoUrl)
  const pct = calcPct(lessonProg, course.curriculum)

  return (
    <div className="bg-stone-900 text-white">
      {/* 상단 바 */}
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link to="/my" className="text-xl text-white/80 hover:text-white">
          ←
        </Link>
        <span className="truncate font-bold">{course.title}</span>
        <span className="ml-auto shrink-0 text-sm text-white/50">{pct}% 수강</span>
      </div>

      {/* 영상 */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
          <div
            className={
              portrait
                ? 'mx-auto aspect-[9/16] h-[70vh] max-w-full'
                : 'aspect-video'
            }
          >
            {embed ? (
              /player\.vimeo\.com/.test(embed) ? (
                <VimeoPlayer
                  embed={embed}
                  startSeconds={lessonProg[idx]?.s ?? 0}
                  onTime={handleTime}
                  title={current?.title}
                />
              ) : (
                <iframe
                  key={embed}
                  src={embed}
                  title={current?.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              )
            ) : (
              <div className="grid h-full place-items-center bg-stone-800 text-sm text-white/50">
                🎬 이 레슨은 아직 영상이 등록되지 않았어요
              </div>
            )}
          </div>
        </div>

        {/* 이전/다음 */}
        <div className="mt-3 flex items-center justify-between gap-3 pb-4">
          <div className="min-w-0">
            <div className="text-xs font-medium text-amber-400">{idx + 1}강</div>
            <div className="truncate font-bold">{current?.title}</div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 disabled:opacity-40"
            >
              ‹ 이전 강의
            </button>
            <button
              onClick={() => setIdx((i) => Math.min(lessons.length - 1, i + 1))}
              disabled={idx === lessons.length - 1}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-white/90 disabled:opacity-40"
            >
              다음 강의 ›
            </button>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="border-t border-white/10 bg-stone-900">
        <div className="mx-auto flex max-w-5xl px-4 sm:px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 flex-col items-center gap-1 border-b-2 py-3 text-sm font-semibold transition ${
                tab === t.id
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              <span className="text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 내용 (밝은 배경) */}
      <div className="min-h-[40vh] bg-white text-slate-900">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          {tab === '내용' && (
            <div>
              <h2 className="text-xl font-black">{current?.title}</h2>
              {expert && (
                <p className="mt-1 text-sm text-slate-500">
                  {expert.avatar} {expert.name}
                </p>
              )}
              <p className="mt-4 leading-relaxed text-slate-600">{course.summary}</p>
            </div>
          )}

          {tab === '목차' && (
            <div className="space-y-1.5">
              {lessons.map((l, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setIdx(i)
                    setTab('내용')
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                    i === idx
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-bold ${
                      i === idx ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium text-slate-700">
                    {l.title}
                  </span>
                  {(() => {
                    const p = lessonProg[i]
                    const done = !!p && p.d > 0 && p.s / p.d >= 0.9
                    if (done) return <span className="font-bold text-emerald-500">✓</span>
                    return l.videoUrl ? (
                      <span className="text-slate-400">▶</span>
                    ) : (
                      <span className="text-xs text-slate-300">준비중</span>
                    )
                  })()}
                </button>
              ))}
            </div>
          )}

          {tab === '공지' && (
            <ul className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              {NOTICES.map((n, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-slate-400">{i + 1}.</span> {n}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
