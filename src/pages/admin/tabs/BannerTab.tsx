import { useEffect, useState } from 'react'
import { resolveGradient } from '../../../data/mockMarketplace'
import {
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  type AdminBanner,
  type BannerInput,
} from '../../../lib/adminApi'
import { invalidateBizData } from '../../../lib/useBizData'

// 그라데이션 프리셋 (배너 배경)
const GRADIENTS = [
  'from-brand-600 to-brand-500',
  'from-fuchsia-600 to-brand-600',
  'from-indigo-600 to-brand-600',
  'from-rose-500 to-orange-500',
  'from-emerald-500 to-teal-500',
  'from-sky-500 to-indigo-500',
  'from-amber-400 to-orange-500',
  'from-slate-700 to-slate-900',
]

// 배너 관리 — 랜딩 히어로 배너 추가/수정/삭제 (요청 ②③)
export default function BannerTab() {
  const [banners, setBanners] = useState<AdminBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminBanner | 'new' | null>(null)

  const reload = async () => {
    setLoading(true)
    setBanners(await listBanners())
    setLoading(false)
  }
  useEffect(() => {
    reload()
  }, [])

  const onSaved = () => {
    setEditing(null)
    invalidateBizData() // 랜딩이 다음 로드에서 새 배너를 받도록 캐시 무효화
    reload()
  }

  const remove = async (id: string) => {
    if (!confirm('이 배너를 삭제할까요?')) return
    const { error } = await deleteBanner(id)
    if (error) return alert('삭제 실패: ' + error)
    invalidateBizData()
    reload()
  }

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-stone-100" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">
          랜딩 상단 슬라이드 배너 {banners.length}개. 노출순서·링크·활성 여부를 관리하세요.
        </p>
        <button
          onClick={() => setEditing('new')}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
        >
          + 새 배너
        </button>
      </div>

      {editing && (
        <BannerForm
          banner={editing === 'new' ? null : editing}
          nextOrder={banners.length}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}

      <div className="space-y-3">
        {banners.map((b) => (
          <div
            key={b.id}
            className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-3"
          >
            <div
              className={`grid h-16 w-28 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${resolveGradient(b.gradient)} px-2 text-center text-[11px] font-bold text-white`}
            >
              {b.title}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-bold text-stone-900">{b.title}</h3>
                {!b.active && (
                  <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-bold text-stone-500">
                    숨김
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-stone-500">{b.subtitle}</p>
              <p className="truncate font-mono text-[11px] text-brand-500">
                {b.link || '링크 없음'} · 순서 {b.sort_order}
              </p>
            </div>
            <button
              onClick={() => setEditing(b)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50"
            >
              편집
            </button>
            <button
              onClick={() => remove(b.id)}
              className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
            >
              삭제
            </button>
          </div>
        ))}
        {banners.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-12 text-center text-sm text-stone-500">
            아직 배너가 없어요.
          </div>
        )}
      </div>
    </div>
  )
}

function BannerForm({
  banner,
  nextOrder,
  onClose,
  onSaved,
}: {
  banner: AdminBanner | null
  nextOrder: number
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(banner?.title ?? '')
  const [subtitle, setSubtitle] = useState(banner?.subtitle ?? '')
  const [gradient, setGradient] = useState(resolveGradient(banner?.gradient ?? GRADIENTS[0]))
  const [cta, setCta] = useState(banner?.cta ?? '')
  const [link, setLink] = useState(banner?.link ?? '')
  const [sortOrder, setSortOrder] = useState(banner?.sort_order ?? nextOrder)
  const [active, setActive] = useState(banner?.active ?? true)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!title.trim()) return alert('제목을 입력하세요.')
    setBusy(true)
    const input: BannerInput = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      gradient,
      cta: cta.trim(),
      link: link.trim(),
      sort_order: sortOrder,
      active,
    }
    const { error } = banner ? await updateBanner(banner.id, input) : await createBanner(input)
    setBusy(false)
    if (error) return alert('저장 실패: ' + error)
    onSaved()
  }

  const input =
    'w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-400'

  return (
    <div className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50 p-5">
      <h3 className="font-bold text-stone-900">{banner ? '배너 편집' : '새 배너'}</h3>

      {/* 미리보기 */}
      <div
        className={`relative flex min-h-[110px] flex-col justify-center overflow-hidden rounded-xl bg-gradient-to-br ${gradient} p-5 text-white`}
      >
        <h2 className="text-lg font-black">{title || '배너 제목'}</h2>
        <p className="mt-1 text-sm text-white/85">{subtitle || '부제목이 여기에 표시됩니다'}</p>
        {cta && (
          <span className="mt-3 w-fit rounded-lg bg-white/95 px-4 py-1.5 text-xs font-bold text-slate-900">
            {cta} →
          </span>
        )}
      </div>

      <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" />
      <input className={input} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="부제목" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={input} value={cta} onChange={(e) => setCta(e.target.value)} placeholder="버튼 문구 (예: 무료로 보기)" />
        <input className={input} value={link} onChange={(e) => setLink(e.target.value)} placeholder="링크 (예: /library?free=1 또는 https://...)" />
      </div>

      <div>
        <div className="mb-1.5 text-xs font-medium text-stone-500">배경 그라데이션</div>
        <div className="flex flex-wrap gap-2">
          {GRADIENTS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGradient(g)}
              className={`h-9 w-9 rounded-lg bg-gradient-to-br ${g} ring-offset-2 transition ${
                gradient === g ? 'ring-2 ring-stone-900' : ''
              }`}
              aria-label={g}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-stone-600">
          노출순서
          <input
            type="number"
            className="w-20 rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          활성(노출)
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          저장
        </button>
        <button
          onClick={onClose}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-white"
        >
          취소
        </button>
      </div>
    </div>
  )
}
