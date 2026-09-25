import { useEffect, useRef, useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { useBizData } from '../lib/useBizData'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import PdfReader from '../components/PdfReader'
import { watermarkText } from '../lib/pdfWatermark'
import { updateProgress } from '../lib/userData'
import { getSignedPdfUrl } from '../lib/privatePdf'

const NOTICES = [
  '전자책은 마이페이지 > 내 강의에서 다시 열람할 수 있습니다.',
  '다운로드는 제공되지 않으며, 모든 페이지에 열람자 정보가 워터마크로 표시됩니다.',
  '콘텐츠의 무단 복제·배포·공유는 저작권법에 의해 금지됩니다.',
]

export default function AcademyEbookRead() {
  const { id } = useParams()
  const { getEbook, loading } = useBizData()
  const { user } = useAuth()
  const ebook = getEbook(id ?? '')

  const [enrolled, setEnrolled] = useState<boolean | null>(null)
  // 읽기 진도(%) — enrollments.progress 재활용. 이어읽기 + 상단 표시용.
  const [savedPct, setSavedPct] = useState<number | null>(null)
  const [displayPct, setDisplayPct] = useState(0)
  const bestRef = useRef(0) // 최고 도달 퍼센트(되돌아가도 진도는 안 줄임)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user || !supabase || !id) {
      setEnrolled(false)
      return
    }
    let active = true
    supabase
      .from('enrollments')
      .select('item_id, progress')
      .eq('user_id', user.id)
      .eq('item_type', 'ebook')
      .eq('item_id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        setEnrolled(!!data)
        const p = (data?.progress as number) ?? 0
        bestRef.current = p
        setSavedPct(p)
        setDisplayPct(p)
      })
    return () => {
      active = false
    }
  }, [user, id])

  // 비공개 원본은 서명 URL(1시간)로 연다 — 스토리지 RLS가 구매 여부를 다시 확인한다.
  // 구방식(공개 URL)은 이전 완료 전까지만 폴백.
  const [pdfSrc, setPdfSrc] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState(false)
  const pdfPath = ebook?.pdfPath
  const legacyUrl = ebook?.pdfUrl
  useEffect(() => {
    if (!enrolled) return
    let active = true
    setPdfError(false)
    if (pdfPath) {
      getSignedPdfUrl('ebook-files', pdfPath).then(({ url }) => {
        if (!active) return
        if (url) setPdfSrc(url)
        else setPdfError(true)
      })
    } else if (legacyUrl) {
      setPdfSrc(legacyUrl)
    } else {
      setPdfError(true)
    }
    return () => {
      active = false
    }
  }, [enrolled, pdfPath, legacyUrl])

  // 페이지 이동 시 호출 — 최고 진도 갱신 + 1.5초 디바운스 저장
  const handleProgress = (pct: number) => {
    if (pct <= bestRef.current) return
    bestRef.current = pct
    setDisplayPct(pct)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (user && id) updateProgress(user.id, 'ebook', id, pct)
    }, 1500)
  }

  // 화면을 떠날 때 마지막 진도 즉시 저장
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (user && id && bestRef.current > 0) updateProgress(user.id, 'ebook', id, bestRef.current)
    }
  }, [user, id])

  if (loading || enrolled === null) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  if (!ebook) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="text-5xl">🤔</div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">전자책을 찾을 수 없어요</h1>
        <Link to="/ebooks" className="mt-6 inline-block rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
          전자책 목록으로
        </Link>
      </div>
    )
  }

  // 미등록자는 판매(상세) 페이지로
  if (!enrolled) {
    return <Navigate to={`/ebooks/${ebook.id}`} replace />
  }

  return (
    <div className="bg-stone-900 text-white">
      {/* 상단 바 */}
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link to="/my" className="text-xl text-white/80 hover:text-white">
          ←
        </Link>
        <span className="truncate font-bold">{ebook.title}</span>
        <span className="ml-auto shrink-0 text-sm text-white/50">
          {displayPct > 0 ? `${displayPct}% 읽음 · ` : ''}
          {ebook.pageCount}쪽
        </span>
      </div>

      {/* PDF 뷰어 — 다운로드 불가(canvas 렌더) + 워터마크 */}
      <div className="mx-auto max-w-5xl px-4 pb-6 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {pdfSrc ? (
            <PdfReader
              url={pdfSrc}
              watermark={watermarkText(user?.email)}
              initialPercent={savedPct ?? 0}
              onProgress={handleProgress}
            />
          ) : pdfError ? (
            <div className="grid h-64 place-items-center text-sm text-white/60">
              전자책을 불러올 수 없어요. 잠시 후 다시 시도해 주세요.
            </div>
          ) : (
            <div className="grid h-64 place-items-center">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          )}
        </div>

        <ul className="mt-4 space-y-1.5 text-xs text-white/50">
          {NOTICES.map((n, i) => (
            <li key={i} className="flex gap-2">
              <span>{i + 1}.</span> {n}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
