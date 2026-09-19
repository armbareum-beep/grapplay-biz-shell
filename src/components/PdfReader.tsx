import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { drawWatermark } from '../lib/pdfWatermark'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

// 전자책 본문 뷰어 — 전체 페이지를 canvas로 렌더(브라우저 PDF 툴바=다운로드/인쇄 없음)
// + 페이지마다 워터마크. 우클릭/드래그 저장 방지(완전 차단 아님, 캐주얼 방지).
export default function PdfReader({
  url,
  watermark,
  initialPercent = 0,
  onProgress,
}: {
  url: string
  watermark?: string
  initialPercent?: number
  onProgress?: (percent: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  // 콜백/초기값은 ref로 보관 — effect가 매 렌더 재실행(PDF 전체 재렌더)되지 않도록 deps에서 제외
  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress
  const initialPercentRef = useRef(initialPercent)
  initialPercentRef.current = initialPercent

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    let renderObserver: IntersectionObserver | null = null
    let progressObserver: IntersectionObserver | null = null
    container.innerHTML = ''
    setLoading(true)
    setError(false)

    const task = pdfjsLib.getDocument({ url })
    task.promise
      .then(async (pdf) => {
        if (cancelled) return
        const numPages = pdf.numPages
        // 1페이지로 대표 비율 산출 → 플레이스홀더 크기(스크롤바·이어읽기 위치 정확)
        const first = await pdf.getPage(1)
        if (cancelled) return
        const v0 = first.getViewport({ scale: 1.5 })
        const ratio = v0.height / v0.width

        // 페이지마다 빈 자리(div)만 먼저 깔고, 실제 그림은 화면 근처에 올 때 그린다(지연 렌더)
        const wraps: HTMLDivElement[] = []
        const rendered = new Set<number>()
        for (let p = 1; p <= numPages; p++) {
          const wrap = document.createElement('div')
          wrap.dataset.page = String(p)
          wrap.className = 'mx-auto mb-4 w-full max-w-3xl rounded-lg bg-stone-700/30 shadow-lg'
          wrap.style.aspectRatio = `1 / ${ratio}`
          wrap.style.userSelect = 'none'
          container.appendChild(wrap)
          wraps.push(wrap)
        }
        if (cancelled) return
        setLoading(false)

        const renderPage = async (p: number) => {
          if (cancelled || rendered.has(p) || p < 1 || p > numPages) return
          rendered.add(p)
          const page = await pdf.getPage(p)
          if (cancelled) return
          const viewport = page.getViewport({ scale: 1.5 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.className = 'block w-full rounded-lg'
          canvas.style.userSelect = 'none'
          ;(canvas.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect =
            'none'
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          await page.render({ canvas, canvasContext: ctx, viewport }).promise
          if (cancelled) return
          drawWatermark(ctx, canvas.width, canvas.height, watermark ?? '')
          const wrap = wraps[p - 1]
          wrap.style.aspectRatio = '' // 실제 캔버스 크기로 대체
          wrap.replaceChildren(canvas)
        }

        // 화면에 들어오기 전(앞뒤 약 1.5화면)에 미리 렌더해 스크롤 끊김 방지
        renderObserver = new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (e.isIntersecting) renderPage(Number((e.target as HTMLElement).dataset.page))
            }
          },
          { rootMargin: '150% 0px' },
        )
        wraps.forEach((w) => renderObserver!.observe(w))

        // 이어읽기: 저장된 퍼센트 → 페이지로 환산해 스크롤
        const startPct = initialPercentRef.current
        if (startPct > 0) {
          const target = Math.min(numPages, Math.max(1, Math.round((startPct / 100) * numPages)))
          wraps[target - 1]?.scrollIntoView({ block: 'start' })
        }

        // 현재 보고 있는 페이지 추적 → 퍼센트 보고(부모에서 디바운스 저장)
        const ratios = new Map<number, number>()
        progressObserver = new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              const pg = Number((e.target as HTMLElement).dataset.page)
              ratios.set(pg, e.isIntersecting ? e.intersectionRatio : 0)
            }
            let best = 0
            let bestRatio = 0
            for (const [pg, r] of ratios) {
              if (r > bestRatio) {
                bestRatio = r
                best = pg
              }
            }
            if (best > 0) onProgressRef.current?.(Math.round((best / numPages) * 100))
          },
          { threshold: [0.1, 0.5, 0.9] },
        )
        wraps.forEach((w) => progressObserver!.observe(w))
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
      renderObserver?.disconnect()
      progressObserver?.disconnect()
      task.destroy()
    }
  }, [url, watermark])

  return (
    <div
      className="select-none bg-stone-800 p-4"
      onContextMenu={(e) => e.preventDefault()}
    >
      {loading && (
        <div className="grid h-64 place-items-center text-sm text-white/50">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
        </div>
      )}
      {error && (
        <div className="grid h-64 place-items-center text-sm text-white/50">
          본문을 불러올 수 없어요.
        </div>
      )}
      <div ref={containerRef} />
    </div>
  )
}
