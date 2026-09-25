import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useBizData, invalidateBizData } from '../../../lib/useBizData'
import { uploadPrivatePdf, buildAndUploadPreview } from '../../../lib/privatePdf'

// 구방식(공개 covers 버킷 URL) PDF를 비공개 버킷으로 복사하는 1회성 도구.
// 관리자 로그인 권한(스토리지·테이블 RLS의 is_admin())으로 동작 — service role 키 불필요.
// 기존 pdf_url / review_reward_pdf_url은 지우지 않는다(3단계에서 일괄 정리).
type Status = { state: 'wait' | 'run' | 'ok' | 'fail'; msg?: string }
interface Job {
  key: string
  kind: '전자책' | '리워드'
  id: string
  title: string
  expertId: string
  url: string
  previewPages: number
}

async function fetchPdf(url: string): Promise<Blob> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`원본을 받을 수 없음 (HTTP ${res.status})`)
  const blob = await res.blob()
  const head = new Uint8Array(await blob.slice(0, 5).arrayBuffer())
  if (String.fromCharCode(...head) !== '%PDF-') throw new Error('PDF 파일이 아님')
  return new Blob([blob], { type: 'application/pdf' })
}

async function migrate(job: Job): Promise<string> {
  if (!supabase) throw new Error('연결이 설정되지 않았습니다.')
  const file = await fetchPdf(job.url)
  const bucket = job.kind === '전자책' ? 'ebook-files' : 'reward-files'
  const up = await uploadPrivatePdf(bucket, job.expertId, job.id, file)
  if (up.error || !up.path) throw new Error('업로드 실패: ' + up.error)

  if (job.kind === '리워드') {
    const { data, error } = await supabase
      .from('courses')
      .update({ reward_pdf_path: up.path })
      .eq('id', job.id)
      .select('id')
    if (error || !data?.length) throw new Error('저장 실패: ' + (error?.message ?? '권한 없음'))
    return '완료'
  }

  const pv = await buildAndUploadPreview(job.id, file, job.previewPages)
  const { data, error } = await supabase
    .from('ebooks')
    .update({ pdf_path: up.path, preview_pdf_url: pv.url })
    .eq('id', job.id)
    .select('id')
  if (error || !data?.length) throw new Error('저장 실패: ' + (error?.message ?? '권한 없음'))
  return pv.url ? '완료' : '완료 (미리보기 생성 실패 — 편집 화면에서 다시 저장해 주세요)'
}

export default function PdfMigrationPanel() {
  const { ebooks, courses, refetch } = useBizData()
  const [status, setStatus] = useState<Record<string, Status>>({})
  const [running, setRunning] = useState(false)

  const jobs: Job[] = [
    ...ebooks
      .filter((e) => e.pdfUrl && !e.pdfPath)
      .map((e) => ({
        key: `e:${e.id}`,
        kind: '전자책' as const,
        id: e.id,
        title: e.title,
        expertId: e.expertId ?? 'unassigned',
        url: e.pdfUrl!,
        previewPages: e.previewPages ?? 3,
      })),
    ...courses
      .filter((c) => c.reviewRewardPdfUrl && !c.rewardPdfPath)
      .map((c) => ({
        key: `c:${c.id}`,
        kind: '리워드' as const,
        id: c.id,
        title: c.title,
        expertId: c.expertId,
        url: c.reviewRewardPdfUrl!,
        previewPages: 0,
      })),
  ]

  if (jobs.length === 0 && !Object.keys(status).length) return null

  const runAll = async () => {
    if (!confirm(`${jobs.length}개 PDF를 비공개 저장소로 옮길까요? 기존 파일은 지우지 않아요.`)) return
    setRunning(true)
    for (const job of jobs) {
      setStatus((s) => ({ ...s, [job.key]: { state: 'run' } }))
      try {
        const msg = await migrate(job)
        setStatus((s) => ({ ...s, [job.key]: { state: 'ok', msg } }))
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setStatus((s) => ({ ...s, [job.key]: { state: 'fail', msg } }))
      }
    }
    setRunning(false)
    invalidateBizData()
    refetch()
  }

  const done = Object.values(status)
  const failed = done.filter((s) => s.state === 'fail').length

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold text-stone-900">🔒 기존 PDF 비공개 이전</p>
          <p className="mt-0.5 text-sm text-stone-600">
            공개 저장소에 있는 전자책·리워드 PDF {jobs.length}개를 구매자/후기 작성자만 볼 수 있는 저장소로
            옮겨요.
          </p>
        </div>
        {jobs.length > 0 && (
          <button
            onClick={runAll}
            disabled={running}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {running ? '이전 중…' : '기존 PDF 이전'}
          </button>
        )}
      </div>
      {jobs.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm">
          {jobs.map((j) => {
            const st = status[j.key] ?? { state: 'wait' }
            return (
              <li key={j.key} className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-white px-1.5 py-0.5 text-xs text-stone-500">{j.kind}</span>
                <span className="truncate text-stone-800">{j.title}</span>
                <span
                  className={`ml-auto text-xs ${
                    st.state === 'ok'
                      ? 'text-emerald-600'
                      : st.state === 'fail'
                        ? 'text-rose-600'
                        : 'text-stone-400'
                  }`}
                >
                  {st.state === 'wait' ? '대기' : st.state === 'run' ? '진행 중…' : st.msg}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {!running && done.length > 0 && (
        <p className="mt-3 text-sm text-stone-600">
          {failed
            ? `${failed}개 실패 — 외부 주소 PDF는 옮길 수 없어요. 편집 화면에서 PDF를 다시 업로드해 주세요.`
            : '모두 옮겼어요.'}
        </p>
      )}
    </div>
  )
}
