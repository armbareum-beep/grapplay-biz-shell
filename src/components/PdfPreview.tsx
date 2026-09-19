import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { drawWatermark } from '../lib/pdfWatermark'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

// PDF의 앞 maxPages 페이지만 canvas로 렌더링 (미리보기 제한) + 선택 워터마크
export default function PdfPreview({
  url,
  maxPages,
  watermark,
}: {
  url: string
  maxPages: number
  watermark?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    container.innerHTML = ''
    setLoading(true)
    setError(false)

    const task = pdfjsLib.getDocument({ url })
    task.promise
      .then(async (pdf) => {
        if (cancelled) return
        const n = Math.max(1, Math.min(maxPages || 1, pdf.numPages))
        for (let p = 1; p <= n; p++) {
          const page = await pdf.getPage(p)
          if (cancelled) return
          const viewport = page.getViewport({ scale: 1.4 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.className = 'mb-3 w-full rounded-lg border border-slate-200 shadow-sm'
          const ctx = canvas.getContext('2d')
          if (!ctx) continue
          container.appendChild(canvas)
          await page.render({ canvas, canvasContext: ctx, viewport }).promise
          if (cancelled) return
          if (watermark) drawWatermark(ctx, canvas.width, canvas.height, watermark)
        }
        if (!cancelled) setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
      task.destroy()
    }
  }, [url, maxPages, watermark])

  return (
    <div className="bg-slate-50 p-4">
      {loading && (
        <div className="grid h-64 place-items-center text-sm text-slate-400">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      )}
      {error && (
        <div className="grid h-64 place-items-center text-sm text-slate-400">
          미리보기를 불러올 수 없어요. (PDF 주소를 확인해 주세요)
        </div>
      )}
      <div ref={containerRef} />
    </div>
  )
}
