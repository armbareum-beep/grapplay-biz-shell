import { useState } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useBizData, invalidateBizData } from '../../lib/useBizData'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { uploadToCovers } from '../../lib/storage'
import { createEbook, updateEbook, type EbookInput } from '../../lib/expertApi'
import { CATEGORIES, type Category } from '../../data/mock'
import type { Ebook } from '../../data/mockEbooks'

import BlockStyleToolbar, { type BlockStyle } from '../../components/BlockStyleToolbar'

type BlockType = 'heading' | 'text' | 'image'
interface Block {
  id: number
  type: BlockType
  value: string
  size?: BlockStyle['size']
  weight?: BlockStyle['weight']
  color?: BlockStyle['color']
  align?: BlockStyle['align']
}
let blockSeq = 200

const COVERS = [
  'from-violet-500 to-fuchsia-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500',
  'from-sky-500 to-indigo-500',
  'from-amber-400 to-orange-500',
]
const EMOJIS = ['📕', '📗', '📘', '📙', '📋', '📊']

export default function AcademyEbookEditor() {
  const { id } = useParams()
  const { getEbook, loading } = useBizData()
  const isEdit = !!id

  if (isEdit && loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="h-10 w-40 animate-pulse rounded-lg bg-stone-100" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-stone-100" />
      </div>
    )
  }

  const existing = id ? getEbook(id) : undefined
  if (isEdit && !existing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <p className="text-stone-600">전자책을 찾을 수 없습니다.</p>
        <Link to="/expert/dashboard" className="mt-4 inline-block text-amber-600">
          ← 대시보드
        </Link>
      </div>
    )
  }

  return <EditorForm key={id ?? 'new'} existing={existing} isEdit={isEdit} />
}

function EditorForm({ existing, isEdit }: { existing?: Ebook; isEdit: boolean }) {
  const navigate = useNavigate()
  const loc = useLocation()
  const { profile } = useAuth()
  const { getExpert } = useBizData()
  const isAdmin = profile?.role === 'admin'
  // 소유 전문가: 편집 시 기존 전자책의 소유자, 신규 시 라우트 state(관리자) 또는 본인.
  const targetExpertId =
    existing?.expertId ?? (loc.state as { expertId?: string } | null)?.expertId ?? profile?.expert_id ?? null
  const expert = targetExpertId ? getExpert(targetExpertId) : undefined
  const backTo = isAdmin && !profile?.expert_id ? '/admin' : '/expert/dashboard'

  const [title, setTitle] = useState(existing?.title ?? '')
  const [subtitle, setSubtitle] = useState(existing?.subtitle ?? '')
  const [category, setCategory] = useState<Category>(existing?.category ?? CATEGORIES[0].key)
  const [price, setPrice] = useState(String(existing?.price ?? 0))
  const [originalPrice, setOriginalPrice] = useState(String(existing?.originalPrice ?? ''))
  const [pageCount, setPageCount] = useState(String(existing?.pageCount ?? 0))
  const [previewPages, setPreviewPages] = useState(String(existing?.previewPages ?? 3))
  const [summary, setSummary] = useState(existing?.summary ?? '')
  const [cover, setCover] = useState(existing?.cover ?? COVERS[0])
  const [coverImage, setCoverImage] = useState(existing?.coverImage ?? '')
  const [uploading, setUploading] = useState(false)
  const [emoji, setEmoji] = useState(existing?.emoji ?? EMOJIS[0])
  const [pdfUrl, setPdfUrl] = useState(existing?.pdfUrl ?? '')
  const [pdfUploading, setPdfUploading] = useState(false)
  const [highlights, setHighlights] = useState<string[]>(
    existing?.highlights?.length ? existing.highlights : [''],
  )

  const [useLanding, setUseLanding] = useState(existing?.useLandingPage ?? false)
  const [blocks, setBlocks] = useState<Block[]>(
    (existing?.detailBlocks as Block[] | undefined)?.length
      ? (existing!.detailBlocks as Block[])
      : [
          { id: 1, type: 'heading', value: '이 전자책은요' },
          { id: 2, type: 'text', value: '핵심만 담았습니다.' },
        ],
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCoverUpload(file: File) {
    if (!supabase) return
    setError(null)
    setUploading(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `ebooks/${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('covers')
      .upload(path, file, { upsert: true, cacheControl: '3600' })
    if (upErr) {
      setUploading(false)
      setError('이미지 업로드 실패: ' + upErr.message)
      return
    }
    const { data } = supabase.storage.from('covers').getPublicUrl(path)
    setCoverImage(data.publicUrl)
    setUploading(false)
  }

  async function handlePdfUpload(file: File) {
    if (!supabase) return
    setError(null)
    setPdfUploading(true)
    const path = `ebook-pdfs/${crypto.randomUUID()}.pdf`
    const { error: upErr } = await supabase.storage
      .from('covers')
      .upload(path, file, { upsert: true, contentType: 'application/pdf' })
    if (upErr) {
      setPdfUploading(false)
      setError('PDF 업로드 실패: ' + upErr.message)
      return
    }
    const { data } = supabase.storage.from('covers').getPublicUrl(path)
    setPdfUrl(data.publicUrl)
    setPdfUploading(false)
  }

  function addBlock(type: BlockType) {
    setBlocks((b) => [...b, { id: ++blockSeq, type, value: '' }])
  }
  function updateBlock(bid: number, value: string) {
    setBlocks((b) => b.map((x) => (x.id === bid ? { ...x, value } : x)))
  }
  function updateBlockStyle(bid: number, patch: BlockStyle) {
    setBlocks((b) => b.map((x) => (x.id === bid ? { ...x, ...patch } : x)))
  }
  function removeBlock(bid: number) {
    setBlocks((b) => b.filter((x) => x.id !== bid))
  }

  const [blockUploading, setBlockUploading] = useState<Record<number, boolean>>({})
  async function handleBlockImage(blockId: number, file: File) {
    setBlockUploading((u) => ({ ...u, [blockId]: true }))
    const { url, error } = await uploadToCovers(file, 'detail-blocks')
    setBlockUploading((u) => {
      const n = { ...u }
      delete n[blockId]
      return n
    })
    if (error) return setError('이미지 업로드 실패: ' + error)
    if (url) updateBlock(blockId, url)
  }

  async function handleSave() {
    setError(null)
    if (!targetExpertId || !expert) {
      setError('전문가 권한이 없습니다.')
      return
    }
    if (!title.trim()) {
      setError('제목을 입력해 주세요.')
      return
    }
    const input: EbookInput = {
      expertId: targetExpertId,
      title: title.trim(),
      subtitle: subtitle.trim(),
      category,
      author: expert.name,
      avatar: expert.avatar,
      price: Number(price) || 0,
      originalPrice: originalPrice ? Number(originalPrice) : null,
      pageCount: Number(pageCount) || 0,
      previewPages: Number(previewPages) || 0,
      cover,
      coverImage: coverImage || null,
      emoji,
      summary: summary.trim(),
      highlights: highlights.map((h) => h.trim()).filter(Boolean),
      pdfUrl: pdfUrl.trim() || null,
      useLandingPage: useLanding,
      detailBlocks: blocks,
    }
    setSaving(true)
    const res = isEdit ? await updateEbook(existing!.id, input) : await createEbook(input)
    setSaving(false)
    if (res.error) {
      setError(res.error)
      return
    }
    invalidateBizData()
    navigate(backTo)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <Link to={backTo} className="text-sm text-stone-500 hover:text-amber-600">
          ← 대시보드
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-stone-900 px-5 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>

      <h1 className="mt-4 text-2xl font-black text-stone-900">
        {isEdit ? '전자책 편집' : '새 전자책 만들기'}
      </h1>

      {error && (
        <div className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="mt-8 space-y-8">
        <Section title="기본 정보">
          <Field label="제목">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 개업 준비 체크리스트 50"
              className="w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
          </Field>
          <Field label="한 줄 소개">
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="한 문장으로 설명해 주세요"
              className="w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
          </Field>
          <Field label="카테고리">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    category === c.key
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-300 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {c.emoji} {c.key}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="표지 색">
              <div className="flex flex-wrap gap-2">
                {COVERS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCover(c)}
                    className={`h-9 w-9 rounded-lg bg-gradient-to-br ${c} ${
                      cover === c ? 'ring-2 ring-stone-900 ring-offset-2' : ''
                    }`}
                  />
                ))}
              </div>
            </Field>
            <Field label="표지 이모지">
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`grid h-9 w-9 place-items-center rounded-lg border text-lg ${
                      emoji === e ? 'border-stone-900 bg-stone-100' : 'border-stone-300'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <Field label="표지 이미지 (선택 — 업로드하면 색/이모지 대신 표시)">
            <div className="flex items-center gap-4">
              <div
                className={`grid h-24 w-36 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br ${cover} text-3xl`}
              >
                {coverImage ? (
                  <img src={coverImage} alt="표지" className="h-full w-full object-cover" />
                ) : (
                  emoji
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50">
                  {uploading ? '업로드 중…' : '이미지 업로드'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleCoverUpload(f)
                    }}
                  />
                </label>
                {coverImage && (
                  <button
                    onClick={() => setCoverImage('')}
                    className="text-left text-xs text-rose-500 hover:underline"
                  >
                    이미지 제거 (색·이모지로)
                  </button>
                )}
              </div>
            </div>
          </Field>
        </Section>

        <Section title="가격 · 분량">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="판매가 (원)">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-amber-400"
              />
            </Field>
            <Field label="정가 (선택)">
              <input
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                placeholder="할인 전 가격"
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-amber-400"
              />
            </Field>
            <Field label="쪽수">
              <input
                value={pageCount}
                onChange={(e) => setPageCount(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-amber-400"
              />
            </Field>
          </div>
          <Field label="미리보기 페이지 수">
            <div className="max-w-xs">
              <input
                value={previewPages}
                onChange={(e) => setPreviewPages(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-amber-400"
              />
            </div>
            <p className="mt-2 text-xs text-stone-500">
              구매 전 상세 페이지에서 앞 {Number(previewPages) || 0}페이지까지만 보여줍니다.
            </p>
          </Field>
          {Number(price) === 0 && (
            <p className="text-xs text-stone-500">0원으로 두면 무료 전자책으로 공개됩니다.</p>
          )}
        </Section>

        <Section title="소개">
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            placeholder="전자책 소개를 적어주세요."
            className="w-full resize-none rounded-xl border border-stone-300 px-4 py-2.5 text-sm outline-none focus:border-amber-400"
          />
        </Section>

        <Section title="이 책의 핵심">
          <div className="space-y-2">
            {highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-sm text-violet-600">
                  ✓
                </span>
                <input
                  value={h}
                  onChange={(e) =>
                    setHighlights((arr) => arr.map((x, idx) => (idx === i ? e.target.value : x)))
                  }
                  placeholder="예) 오픈 전 준비 항목 한눈에"
                  className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
                />
                <button
                  onClick={() => setHighlights((arr) => arr.filter((_, idx) => idx !== i))}
                  className="grid h-8 w-8 place-items-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-rose-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setHighlights((arr) => [...arr, ''])}
            className="mt-3 rounded-lg border border-dashed border-stone-300 px-4 py-2 text-sm font-semibold text-stone-500 hover:border-amber-300 hover:text-amber-600"
          >
            + 항목 추가
          </button>
        </Section>

        <Section title="PDF 파일">
          <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-rose-100 text-lg">
              📄
            </div>
            <div className="min-w-0 flex-1 text-sm">
              {pdfUrl ? (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate font-medium text-violet-600 hover:underline"
                >
                  {pdfUrl.split('/').pop()}
                </a>
              ) : (
                <span className="text-stone-400">등록된 PDF가 없습니다.</span>
              )}
            </div>
            <label className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50">
              {pdfUploading ? '업로드 중…' : 'PDF 업로드'}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={pdfUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handlePdfUpload(f)
                }}
              />
            </label>
          </div>
          <Field label="또는 PDF URL 직접 입력">
            <input
              value={pdfUrl}
              onChange={(e) => setPdfUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm outline-none focus:border-amber-400"
            />
          </Field>
        </Section>

        <Section title="상세페이지 (랜딩)">
          <label className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4">
            <div>
              <div className="font-semibold text-stone-800">리치 상세페이지 사용</div>
              <div className="text-sm text-stone-500">
                켜면 제목·텍스트 블록으로 만든 상세가 전자책 페이지에 표시됩니다.
              </div>
            </div>
            <Toggle on={useLanding} onChange={() => setUseLanding((v) => !v)} />
          </label>

          {useLanding && (
            <div className="mt-4 space-y-3">
              {blocks.map((b) => (
                <div key={b.id} className="rounded-xl border border-stone-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-500">
                      {b.type === 'heading' ? '제목' : b.type === 'text' ? '텍스트' : '이미지'}
                    </span>
                    <button
                      onClick={() => removeBlock(b.id)}
                      className="grid h-7 w-7 place-items-center rounded hover:bg-stone-100 hover:text-rose-500"
                    >
                      ✕
                    </button>
                  </div>
                  {b.type === 'image' ? (
                    <div>
                      {b.value ? (
                        <img
                          src={b.value}
                          alt=""
                          className="mb-2 w-full rounded-lg border border-stone-200"
                        />
                      ) : (
                        <div className="mb-2 grid place-items-center rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 py-8 text-sm text-stone-400">
                          🖼️ 이미지를 업로드하세요
                        </div>
                      )}
                      <label className="inline-block cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-1.5 text-sm font-semibold text-stone-600 hover:bg-stone-50">
                        {blockUploading[b.id]
                          ? '업로드 중…'
                          : b.value
                            ? '이미지 변경'
                            : '이미지 업로드'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={blockUploading[b.id]}
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) handleBlockImage(b.id, f)
                          }}
                        />
                      </label>
                    </div>
                  ) : b.type === 'heading' ? (
                    <div className="space-y-2">
                      <BlockStyleToolbar value={b} onChange={(patch) => updateBlockStyle(b.id, patch)} />
                      <input
                        value={b.value}
                        onChange={(e) => updateBlock(b.id, e.target.value)}
                        placeholder="제목"
                        style={b.color ? { color: b.color } : undefined}
                        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-lg font-bold outline-none focus:border-amber-400"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <BlockStyleToolbar value={b} onChange={(patch) => updateBlockStyle(b.id, patch)} />
                      <textarea
                        value={b.value}
                        onChange={(e) => updateBlock(b.id, e.target.value)}
                        placeholder="본문"
                        rows={3}
                        style={b.color ? { color: b.color } : undefined}
                        className="w-full resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
                      />
                    </div>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <AddBlockBtn label="+ 제목" onClick={() => addBlock('heading')} />
                <AddBlockBtn label="+ 텍스트" onClick={() => addBlock('text')} />
                <AddBlockBtn label="+ 이미지" onClick={() => addBlock('image')} />
              </div>
            </div>
          )}
        </Section>
      </div>

      <div className="mt-10 flex justify-end gap-2 border-t border-stone-200 pt-6">
        <Link
          to={backTo}
          className="rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50"
        >
          취소
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {saving ? '저장 중…' : isEdit ? '변경사항 저장' : '전자책 등록'}
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-stone-50/50 p-5 sm:p-6">
      <h2 className="text-lg font-black text-stone-900">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-stone-700">{label}</label>
      {children}
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        on ? 'bg-amber-500' : 'bg-stone-300'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
          on ? 'left-[1.375rem]' : 'left-0.5'
        }`}
      />
    </button>
  )
}

function AddBlockBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-dashed border-stone-300 px-4 py-2 text-sm font-semibold text-stone-500 hover:border-amber-300 hover:text-amber-600"
    >
      {label}
    </button>
  )
}
