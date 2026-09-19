import { useState } from 'react'
import { useBizData } from '../../../lib/useBizData'
import { createExpert, updateExpert, deleteExpert, type ExpertInput } from '../../../lib/adminApi'
import { CATEGORIES, type Category, type Expert } from '../../../data/mock'
import { uploadToCovers } from '../../../lib/storage'
import ExpertAvatar from '../../../components/ExpertAvatar'

// 전문가 관리 — 전문가 레코드 생성/수정 (회원을 전문가로 승격하기 전 단계)
export default function ExpertsTab() {
  const { experts, refetch, loading } = useBizData()
  const [editing, setEditing] = useState<Expert | 'new' | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const onDelete = async (e: Expert) => {
    if (!confirm(`전문가 "${e.name}"을(를) 삭제할까요? 되돌릴 수 없습니다.`)) return
    setDeletingId(e.id)
    const { error } = await deleteExpert(e.id)
    setDeletingId(null)
    if (error) return alert('삭제 실패: ' + error)
    refetch()
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-stone-100" />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">
          전문가 {experts.length}명. 회원 탭에서 전문가로 승격하려면 먼저 여기서 전문가를 만들어
          연결하세요.
        </p>
        <button
          onClick={() => setEditing('new')}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
        >
          + 새 전문가
        </button>
      </div>

      {editing && (
        <ExpertForm
          expert={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refetch()
          }}
        />
      )}

      <div className="space-y-3">
        {experts.map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4"
          >
            <ExpertAvatar emoji={e.avatar} src={e.avatarUrl} size={48} />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-stone-900">{e.name}</h3>
                {(e.categories?.length ? e.categories : e.category ? [e.category] : []).map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-700"
                  >
                    {c}
                  </span>
                ))}
              </div>
              <p className="text-xs text-stone-500">{e.title}</p>
              <p className="font-mono text-[11px] text-stone-400">{e.id}</p>
            </div>
            <button
              onClick={() => setEditing(e)}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50"
            >
              편집
            </button>
            <button
              onClick={() => onDelete(e)}
              disabled={deletingId === e.id}
              className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              {deletingId === e.id ? '삭제 중…' : '삭제'}
            </button>
          </div>
        ))}
        {experts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-12 text-center text-sm text-stone-500">
            아직 등록된 전문가가 없어요.
          </div>
        )}
      </div>
    </div>
  )
}

function ExpertForm({
  expert,
  onClose,
  onSaved,
}: {
  expert: Expert | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(expert?.name ?? '')
  const [title, setTitle] = useState(expert?.title ?? '')
  const [avatar, setAvatar] = useState(expert?.avatar ?? '🧑‍🏫')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(expert?.avatarUrl ?? null)
  const [bio, setBio] = useState(expert?.bio ?? '')
  const [categories, setCategories] = useState<Category[]>(
    expert?.categories?.length ? expert.categories : expert?.category ? [expert.category] : [],
  )
  const [credentials, setCredentials] = useState<string[]>(expert?.credentials ?? [])
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)

  const toggleCat = (c: Category) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  const setCred = (i: number, v: string) =>
    setCredentials((prev) => prev.map((x, idx) => (idx === i ? v : x)))

  const onUploadPhoto = async (file: File) => {
    setUploading(true)
    const { url, error } = await uploadToCovers(file, 'avatars')
    setUploading(false)
    if (error || !url) return alert('사진 업로드 실패: ' + (error ?? '알 수 없는 오류'))
    setAvatarUrl(url)
  }

  const save = async () => {
    if (!name.trim() || !title.trim()) return alert('이름과 직함을 입력하세요.')
    setBusy(true)
    const input: ExpertInput = {
      name: name.trim(),
      title: title.trim(),
      avatar,
      avatarUrl,
      bio: bio.trim(),
      categories,
      credentials: credentials.map((c) => c.trim()).filter(Boolean),
    }
    const { error } = expert ? await updateExpert(expert.id, input) : await createExpert(input)
    setBusy(false)
    if (error) return alert('저장 실패: ' + error)
    onSaved()
  }

  const input = 'w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-400'

  return (
    <div className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50 p-5">
      <h3 className="font-bold text-stone-900">{expert ? '전문가 편집' : '새 전문가 등록'}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" />
        <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="직함 (예: 공인회계사)" />
      </div>

      {/* 프로필 사진 (업로드) + 이모지 폴백 */}
      <div className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-3">
        <ExpertAvatar emoji={avatar} src={avatarUrl} size={56} />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <label className="cursor-pointer rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800">
              {uploading ? '업로드 중…' : '사진 업로드'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onUploadPhoto(e.target.files[0])}
              />
            </label>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl(null)}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                사진 제거
              </button>
            )}
          </div>
          <input
            className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-brand-400"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="아바타 이모지 (사진 없을 때 폴백, 예: 🥋)"
          />
        </div>
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
      <textarea className={input} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="소개" />

      {/* 약력 (강사소개 ✓ 불릿) */}
      <div>
        <div className="mb-1.5 text-xs font-medium text-stone-500">약력 (강사소개 ✓ 항목)</div>
        <div className="space-y-2">
          {credentials.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-brand-500">✓</span>
              <input
                className={input}
                value={c}
                onChange={(e) => setCred(i, e.target.value)}
                placeholder="예: 소규모 사업 컨설팅 15년"
              />
              <button
                type="button"
                onClick={() => setCredentials((prev) => prev.filter((_, idx) => idx !== i))}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-stone-300 text-stone-500 hover:bg-stone-100"
                aria-label="삭제"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setCredentials((prev) => [...prev, ''])}
            className="rounded-lg border border-dashed border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-500 hover:border-brand-300 hover:text-brand-600"
          >
            + 약력 추가
          </button>
        </div>
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
