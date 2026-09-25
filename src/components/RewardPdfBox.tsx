import { useState } from 'react'
import { getSignedPdfUrl } from '../lib/privatePdf'

// 강의 상세 — 후기 작성자에게 리뷰 리워드 PDF 제공.
// 실제 열람 자격(숨김 안 된 후기 작성자)은 reward-files 스토리지 RLS가 다시 확인한다.
export default function RewardPdfBox({
  rewardPdfPath,
  legacyUrl,
  enrolled,
  alreadyWrote,
}: {
  rewardPdfPath?: string
  legacyUrl?: string
  enrolled: boolean
  alreadyWrote: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!rewardPdfPath && !legacyUrl) return null
  if (!enrolled && !alreadyWrote) return null

  const open = async () => {
    setError(null)
    // 팝업 차단을 피하려고 클릭 시점에 창을 먼저 연다
    const win = window.open('', '_blank')
    let url: string | null = null
    if (rewardPdfPath) {
      setBusy(true)
      const res = await getSignedPdfUrl('reward-files', rewardPdfPath)
      setBusy(false)
      url = res.url
    } else {
      url = legacyUrl ?? null
    }
    if (!url) {
      win?.close()
      setError('PDF를 열 수 없어요. 잠시 후 다시 시도해 주세요.')
      return
    }
    if (win) win.location.href = url
    else window.location.href = url
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
      <div className="text-2xl">🎁</div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-900">후기 작성 리워드 PDF</p>
        <p className="mt-0.5 text-sm text-slate-600">
          {alreadyWrote
            ? '후기를 남겨주셔서 감사해요. 지금 바로 받을 수 있어요.'
            : '후기를 남기면 이 강의의 리워드 PDF를 바로 받을 수 있어요.'}
        </p>
        {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
      </div>
      {alreadyWrote && (
        <button
          onClick={open}
          disabled={busy}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? '준비 중…' : 'PDF 받기'}
        </button>
      )}
    </div>
  )
}
