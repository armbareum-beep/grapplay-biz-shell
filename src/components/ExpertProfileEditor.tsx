import { useState } from 'react'
import { CATEGORIES, type Category, type Expert } from '../data/mock'
import { updateMyExpert } from '../lib/expertApi'
import { uploadToCovers } from '../lib/storage'
import ExpertAvatar from './ExpertAvatar'

// 전문가 본인 공개 프로필 편집 (사진/직함/소개/다중 분야).
// 마이페이지와 전문가 대시보드에서 공용. RLS owns_expert가 본인 행만 허용.
export default function ExpertProfileEditor({
  expertId,
  initial,
  onSaved,
}: {
  expertId: string
  initial?: Expert
  onSaved?: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [bio, setBio] = useState(initial?.bio ?? '')
  const [avatar, setAvatar] = useState(initial?.avatar ?? '🧑‍🏫')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial?.avatarUrl ?? null)
  const [categories, setCategories] = useState<Category[]>(
    initial?.categories?.length ? initial.categories : initial?.category ? [initial.category] : [],
  )
  const [credentials, setCredentials] = useState<string[]>(initial?.credentials ?? [])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const toggleCat = (c: Category) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))

  const setCred = (i: number, v: string) =>
    setCredentials((prev) => prev.map((x, idx) => (idx === i ? v : x)))
  const addCred = () => setCredentials((prev) => [...prev, ''])
  const removeCred = (i: number) => setCredentials((prev) => prev.filter((_, idx) => idx !== i))

  const uploadPhoto = async (file: File) => {
    setUploading(true)
    const { url, error } = await uploadToCovers(file, 'avatars')
    setUploading(false)
    if (error || !url) return alert('사진 업로드 실패: ' + (error ?? '오류'))
    setAvatarUrl(url)
  }

  const save = async () => {
    setSaving(true)
    const { error } = await updateMyExpert(expertId, {
      title: title.trim(),
      bio: bio.trim(),
      avatar,
      avatarUrl,
      categories,
      credentials: credentials.map((c) => c.trim()).filter(Boolean),
    })
    setSaving(false)
    if (error) return alert('저장 실패: ' + error)
    onSaved?.()
    alert('전문가 프로필을 저장했어요.')
  }

  const field = 'w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-400'

  return (
    <section className="space-y-4 rounded-2xl border border-brand-200 bg-brand-50 p-6">
      <div className="flex items-center gap-2">
        <h2 className="font-black text-stone-900">전문가 공개 프로필</h2>
        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-700">
          EXPERT
        </span>
      </div>
      <p className="text-xs text-stone-500">전문가 페이지·강의 카드에 노출되는 정보예요.</p>

      <div className="flex items-center gap-4">
        <ExpertAvatar emoji={avatar} src={avatarUrl} size={64} />
        <div className="flex items-center gap-2">
          <label className="cursor-pointer rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
            {uploading ? '업로드 중…' : '사진 변경'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
            />
          </label>
          {avatarUrl && (
            <button
              onClick={() => setAvatarUrl(null)}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-white"
            >
              제거
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-500">직함</label>
        <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 15년차 세무사 · 개원 컨설턴트" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-500">소개</label>
        <textarea className={field} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="소개" />
      </div>
      <div>
        <div className="mb-1.5 text-xs font-medium text-stone-500">전문 분야 (여러 개 선택 가능)</div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => toggleCat(c.key)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                categories.includes(c.key)
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-300 bg-white text-stone-600 hover:bg-stone-100'
              }`}
            >
              {categories.includes(c.key) ? '✓ ' : ''}
              {c.key}
            </button>
          ))}
        </div>
      </div>
      {/* 약력 (강사소개 ✓ 불릿) */}
      <div>
        <div className="mb-1.5 text-xs font-medium text-stone-500">
          약력 (강사소개에 ✓ 항목으로 표시)
        </div>
        <div className="space-y-2">
          {credentials.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-brand-500">✓</span>
              <input
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-400"
                value={c}
                onChange={(e) => setCred(i, e.target.value)}
                placeholder="예: 소규모 사업 컨설팅 15년"
              />
              <button
                type="button"
                onClick={() => removeCred(i)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-stone-300 text-stone-500 hover:bg-stone-100"
                aria-label="삭제"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addCred}
            className="rounded-lg border border-dashed border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-500 hover:border-brand-300 hover:text-brand-600"
          >
            + 약력 추가
          </button>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        전문가 프로필 저장
      </button>
    </section>
  )
}
