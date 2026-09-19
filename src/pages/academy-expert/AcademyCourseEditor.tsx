import { useState } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { CATEGORIES, Category, type Course } from '../../data/mock'
import { useBizData, invalidateBizData } from '../../lib/useBizData'
import { useAuth } from '../../lib/auth'
import {
  createCourse,
  updateCourse,
  settlementBreakdown,
  type CourseInput,
} from '../../lib/expertApi'
import { uploadVideoToVimeo } from '../../lib/vimeo'
import { fetchVimeoDuration } from '../../lib/video'
import { supabase } from '../../lib/supabase'
import { uploadToCovers } from '../../lib/storage'
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

let blockSeq = 100

// 외부: 편집 모드면 실데이터 로드 후 폼을 mount (useState 초기값이 올바르게 들어가도록)
export default function AcademyCourseEditor() {
  const { id } = useParams()
  const { getCourse, loading } = useBizData()
  const isEdit = !!id

  if (isEdit && loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="h-10 w-40 animate-pulse rounded-lg bg-stone-100" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-stone-100" />
      </div>
    )
  }

  const existing = id ? getCourse(id) : undefined
  if (isEdit && !existing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <p className="text-stone-600">강의를 찾을 수 없습니다.</p>
        <Link to="/expert/dashboard" className="mt-4 inline-block text-amber-600">
          ← 대시보드
        </Link>
      </div>
    )
  }

  return <EditorForm key={id ?? 'new'} existing={existing} isEdit={isEdit} />
}

function EditorForm({ existing, isEdit }: { existing?: Course; isEdit: boolean }) {
  const navigate = useNavigate()
  const loc = useLocation()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  // 소유 전문가: 편집 시 기존 강의의 소유자, 신규 시 라우트 state(관리자) 또는 본인.
  // 관리자가 다른 전문가 콘텐츠를 편집해도 소유권이 유지된다.
  const targetExpertId =
    existing?.expertId ?? (loc.state as { expertId?: string } | null)?.expertId ?? profile?.expert_id ?? null
  const backTo = isAdmin && !profile?.expert_id ? '/admin' : '/expert/dashboard'

  // 기본 정보
  const [title, setTitle] = useState(existing?.title ?? '')
  const [subtitle, setSubtitle] = useState(existing?.subtitle ?? '')
  const [category, setCategory] = useState<Category>(existing?.category ?? '마케팅')
  const [price, setPrice] = useState(String(existing?.price ?? 0))
  const [originalPrice, setOriginalPrice] = useState(String(existing?.originalPrice ?? ''))
  const [coverImage, setCoverImage] = useState(existing?.coverImage ?? '')
  const [coverUploading, setCoverUploading] = useState(false)

  const [useLanding, setUseLanding] = useState(existing?.useLandingPage ?? false)
  const [blocks, setBlocks] = useState<Block[]>(
    (existing?.detailBlocks as Block[] | undefined)?.length
      ? (existing!.detailBlocks as Block[])
      : [
          { id: 1, type: 'heading', value: '왜 이 강의가 필요할까요?' },
          { id: 2, type: 'text', value: '현장의 현실적인 고민을 풀어드립니다.' },
          { id: 3, type: 'image', value: '' },
        ],
  )

  const [lessons, setLessons] = useState<{ title: string; videoUrl: string; preview: boolean }[]>(
    existing?.curriculum.map((c) => ({
      title: c.title,
      videoUrl: c.videoUrl ?? '',
      preview: c.preview ?? false,
    })) ?? [{ title: '1강. 강의 소개', videoUrl: '', preview: true }],
  )

  // 이런 걸 배워요 (what_you_learn)
  const [learn, setLearn] = useState<string[]>(
    existing?.whatYouLearn?.length ? existing.whatYouLearn : [''],
  )

  const [pdfUrl, setPdfUrl] = useState<string>(existing?.reviewRewardPdfUrl ?? '')
  const [pdfUploading, setPdfUploading] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 레슨별 Vimeo 업로드 진행률 (0~100). 키 없으면 업로드 중 아님
  const [uploads, setUploads] = useState<Record<number, number>>({})

  async function handleCoverUpload(file: File) {
    if (!supabase) return
    setError(null)
    setCoverUploading(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `courses/${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('covers')
      .upload(path, file, { upsert: true, cacheControl: '3600' })
    if (upErr) {
      setCoverUploading(false)
      setError('이미지 업로드 실패: ' + upErr.message)
      return
    }
    const { data } = supabase.storage.from('covers').getPublicUrl(path)
    setCoverImage(data.publicUrl)
    setCoverUploading(false)
  }

  async function handleVideoUpload(i: number, file: File) {
    setError(null)
    setUploads((u) => ({ ...u, [i]: 0 }))
    try {
      const embedUrl = await uploadVideoToVimeo(file, (pct) =>
        setUploads((u) => ({ ...u, [i]: pct })),
      )
      setLessons((arr) => arr.map((x, idx) => (idx === i ? { ...x, videoUrl: embedUrl } : x)))
    } catch (e) {
      setError('영상 업로드 실패: ' + (e as Error).message)
    } finally {
      setUploads((u) => {
        const n = { ...u }
        delete n[i]
        return n
      })
    }
  }

  async function handlePdfUpload(file: File) {
    if (!supabase) return
    setError(null)
    setPdfUploading(true)
    const path = `course-pdfs/${crypto.randomUUID()}.pdf`
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

  function addBlock(type: BlockType) {
    setBlocks((b) => [...b, { id: ++blockSeq, type, value: '' }])
  }
  function updateBlock(id: number, value: string) {
    setBlocks((b) => b.map((x) => (x.id === id ? { ...x, value } : x)))
  }
  function updateBlockStyle(id: number, patch: BlockStyle) {
    setBlocks((b) => b.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }
  function removeBlock(id: number) {
    setBlocks((b) => b.filter((x) => x.id !== id))
  }
  function moveBlock(id: number, dir: -1 | 1) {
    setBlocks((b) => {
      const i = b.findIndex((x) => x.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= b.length) return b
      const copy = [...b]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    })
  }

  async function handleSave() {
    setError(null)
    if (!targetExpertId) {
      setError('전문가 권한이 없습니다.')
      return
    }
    if (!title.trim()) {
      setError('강의 제목을 입력해 주세요.')
      return
    }
    setSaving(true)
    // 각 강의 영상 길이를 Vimeo에서 조회해 분 단위로 저장(커리큘럼 시간/총 강의시간 표시용).
    const valid = lessons.filter((l) => l.title.trim())
    const durations = await Promise.all(
      valid.map((l) => fetchVimeoDuration(l.videoUrl.trim() || undefined)),
    )
    const curriculum = valid.map((l, i) => ({
      title: l.title.trim(),
      durationMin: durations[i] != null ? Math.max(1, Math.round(durations[i]! / 60)) : 0,
      videoUrl: l.videoUrl.trim() || undefined,
      preview: l.preview,
    }))

    const input: CourseInput = {
      expertId: targetExpertId,
      title: title.trim(),
      subtitle: subtitle.trim(),
      category,
      price: Number(price) || 0,
      originalPrice: originalPrice ? Number(originalPrice) : null,
      coverImage: coverImage || null,
      curriculum,
      whatYouLearn: learn.map((t) => t.trim()).filter(Boolean),
      useLandingPage: useLanding,
      detailBlocks: blocks,
      rewardPdfUrl: pdfUrl.trim() || null,
    }

    const res = isEdit ? await updateCourse(existing!.id, input) : await createCourse(input)
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
      {/* 헤더 바 */}
      <div className="flex items-center justify-between">
        <Link to={backTo} className="text-sm text-stone-500 hover:text-amber-600">
          ← 대시보드
        </Link>
        <div className="flex gap-2">
          <button className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50">
            미리보기
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-stone-900 px-5 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>

      <h1 className="mt-4 text-2xl font-black text-stone-900">
        {isEdit ? '강의 편집' : '새 강의 만들기'}
      </h1>

      {error && (
        <div className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="mt-8 space-y-8">
        {/* 기본 정보 */}
        <Section title="기본 정보">
          <Field label="강의 제목">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 첫 100명 고객 만들기"
              className="w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
          </Field>
          <Field label="한 줄 소개">
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="강의를 한 문장으로 설명해 주세요"
              className="w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
          </Field>
          <Field label="카테고리">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    category === c.key
                      ? 'bg-stone-900 text-white'
                      : 'border border-stone-300 bg-white text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {c.emoji} {c.key}
                </button>
              ))}
            </div>
          </Field>
          <Field label="대표 이미지 (표지)">
            <div className="flex items-center gap-4">
              <div className="grid h-24 w-40 shrink-0 place-items-center overflow-hidden rounded-xl border border-stone-200 bg-stone-100 text-2xl text-stone-400">
                {coverImage ? (
                  <img src={coverImage} alt="표지" className="h-full w-full object-cover" />
                ) : (
                  '🖼️'
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50">
                  {coverUploading ? '업로드 중…' : '이미지 업로드'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={coverUploading}
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
                    이미지 제거 (기본 표지로)
                  </button>
                )}
              </div>
            </div>
          </Field>
        </Section>

        {/* 가격 */}
        <Section title="가격">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="판매 가격 (원)">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                  ₩
                </span>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                  inputMode="numeric"
                  className="w-full rounded-xl border border-stone-300 py-2.5 pl-8 pr-4 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </Field>
            <Field label="정가 (선택 — 할인 표시)">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                  ₩
                </span>
                <input
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value.replace(/[^0-9]/g, ''))}
                  inputMode="numeric"
                  placeholder="할인 전 가격"
                  className="w-full rounded-xl border border-stone-300 py-2.5 pl-8 pr-4 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </Field>
          </div>
          {Number(price) > 0 ? (
            <p className="text-xs text-stone-500">
              정산 예상액(부가세 제외 80%):{' '}
              <span className="font-semibold text-stone-700">
                ₩{settlementBreakdown(Number(price)).amount.toLocaleString()}
              </span>{' '}
              · 판매가 ₩{Number(price).toLocaleString()}
              {Number(originalPrice) > Number(price) && (
                <>
                  {' '}
                  · 정가 ₩{Number(originalPrice).toLocaleString()} (
                  {Math.round((1 - Number(price) / Number(originalPrice)) * 100)}% 할인)
                </>
              )}
            </p>
          ) : (
            <p className="text-xs text-stone-500">0원으로 두면 무료 강의로 공개됩니다.</p>
          )}
        </Section>

        {/* 커리큘럼 */}
        <Section title="커리큘럼">
          <p className="text-sm text-stone-500">
            각 레슨에 영상 URL(YouTube/Vimeo)을 넣으면 강의 상세 상단 플레이어에서 재생됩니다.
            앞 2강은 미리보기로 공개됩니다.
          </p>
          <div className="space-y-3">
            {lessons.map((l, i) => (
              <div key={i} className="rounded-xl border border-stone-200 bg-white p-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-stone-100 text-sm font-bold text-stone-500">
                    {i + 1}
                  </span>
                  <input
                    value={l.title}
                    onChange={(e) =>
                      setLessons((arr) =>
                        arr.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)),
                      )
                    }
                    placeholder="레슨 제목"
                    className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => setLessons((arr) => arr.filter((_, idx) => idx !== i))}
                    className="grid h-8 w-8 place-items-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-rose-500"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2 pl-10">
                  <span className="text-xs text-stone-400">🎬</span>
                  <input
                    value={l.videoUrl}
                    onChange={(e) =>
                      setLessons((arr) =>
                        arr.map((x, idx) => (idx === i ? { ...x, videoUrl: e.target.value } : x)),
                      )
                    }
                    placeholder="영상 URL 직접 입력 또는 오른쪽에서 업로드"
                    className="flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs outline-none focus:border-amber-400"
                  />
                  <label
                    className={`cursor-pointer whitespace-nowrap rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 ${
                      uploads[i] !== undefined ? 'pointer-events-none opacity-60' : ''
                    }`}
                  >
                    {uploads[i] !== undefined ? `업로드 ${uploads[i]}%` : '영상 업로드'}
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      disabled={uploads[i] !== undefined}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleVideoUpload(i, f)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
                {uploads[i] !== undefined && (
                  <div className="mt-2 ml-10 h-1.5 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                      style={{ width: `${uploads[i]}%` }}
                    />
                  </div>
                )}
                {l.videoUrl && /vimeo\.com/.test(l.videoUrl) && uploads[i] === undefined && (
                  <p className="mt-1 ml-10 text-[11px] text-emerald-600">
                    ✓ Vimeo 업로드됨 (영상 처리에 몇 분 걸릴 수 있어요)
                  </p>
                )}
                <label className="mt-2 flex cursor-pointer items-center gap-2 pl-10 text-xs text-stone-600">
                  <input
                    type="checkbox"
                    checked={l.preview}
                    onChange={(e) =>
                      setLessons((arr) =>
                        arr.map((x, idx) => (idx === i ? { ...x, preview: e.target.checked } : x)),
                      )
                    }
                    className="h-4 w-4 rounded border-stone-300 accent-amber-500"
                  />
                  미리보기로 공개 (구매 전에도 이 강을 볼 수 있어요)
                </label>
              </div>
            ))}
          </div>
          <button
            onClick={() =>
              setLessons((arr) => [
                ...arr,
                { title: `${arr.length + 1}강. 새 레슨`, videoUrl: '', preview: false },
              ])
            }
            className="mt-3 rounded-lg border border-dashed border-stone-300 px-4 py-2 text-sm font-semibold text-stone-500 hover:border-amber-300 hover:text-amber-600"
          >
            + 레슨 추가
          </button>
        </Section>

        {/* 이런 걸 배워요 (what_you_learn) */}
        <Section title="이런 걸 배워요">
          <p className="text-sm text-stone-500">
            강의 상세 페이지에 체크리스트로 표시됩니다. 수강생이 얻어갈 핵심을 적어주세요.
          </p>
          <div className="space-y-2">
            {learn.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-sm text-emerald-600">
                  ✓
                </span>
                <input
                  value={l}
                  onChange={(e) =>
                    setLearn((arr) => arr.map((x, idx) => (idx === i ? e.target.value : x)))
                  }
                  placeholder="예) 월 50만원 예산으로 신규 회원 모으는 광고 세팅"
                  className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
                />
                <button
                  onClick={() => setLearn((arr) => arr.filter((_, idx) => idx !== i))}
                  className="grid h-8 w-8 place-items-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-rose-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setLearn((arr) => [...arr, ''])}
            className="mt-3 rounded-lg border border-dashed border-stone-300 px-4 py-2 text-sm font-semibold text-stone-500 hover:border-amber-300 hover:text-amber-600"
          >
            + 항목 추가
          </button>
        </Section>

        {/* 리치 상세페이지 */}
        <Section title="상세페이지 (랜딩)">
          <label className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4">
            <div>
              <div className="font-semibold text-stone-800">리치 상세페이지 사용</div>
              <div className="text-sm text-stone-500">
                켜면 이미지·텍스트 블록으로 만든 판매 랜딩이 표시됩니다.
              </div>
            </div>
            <Toggle on={useLanding} onChange={() => setUseLanding((v) => !v)} />
          </label>

          {useLanding && (
            <div className="mt-4 space-y-3">
              {blocks.map((b, i) => (
                <div key={b.id} className="rounded-xl border border-stone-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-500">
                      {b.type === 'heading' ? '제목' : b.type === 'text' ? '텍스트' : '이미지'}
                    </span>
                    <div className="flex items-center gap-1 text-stone-400">
                      <button
                        onClick={() => moveBlock(b.id, -1)}
                        disabled={i === 0}
                        className="grid h-7 w-7 place-items-center rounded hover:bg-stone-100 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveBlock(b.id, 1)}
                        disabled={i === blocks.length - 1}
                        className="grid h-7 w-7 place-items-center rounded hover:bg-stone-100 disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeBlock(b.id)}
                        className="grid h-7 w-7 place-items-center rounded hover:bg-stone-100 hover:text-rose-500"
                      >
                        ✕
                      </button>
                    </div>
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
                        {blockUploading[b.id] ? '업로드 중…' : b.value ? '이미지 변경' : '이미지 업로드'}
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
                      <BlockStyleToolbar
                        value={b}
                        onChange={(patch) => updateBlockStyle(b.id, patch)}
                      />
                      <input
                        value={b.value}
                        onChange={(e) => updateBlock(b.id, e.target.value)}
                        placeholder="제목을 입력하세요"
                        style={b.color ? { color: b.color } : undefined}
                        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-lg font-bold outline-none focus:border-amber-400"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <BlockStyleToolbar
                        value={b}
                        onChange={(patch) => updateBlockStyle(b.id, patch)}
                      />
                      <textarea
                        value={b.value}
                        onChange={(e) => updateBlock(b.id, e.target.value)}
                        placeholder="본문을 입력하세요"
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

        {/* 리뷰 리워드 PDF */}
        <Section title="리뷰 리워드 PDF">
          <p className="text-sm text-stone-500">
            수강생이 리뷰를 남기면 보내줄 PDF를 강의별로 등록하세요. (전문가가 직접 발송)
          </p>
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-100 text-lg">
              📄
            </div>
            <div className="min-w-0 flex-1 text-sm">
              {pdfUrl ? (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate font-medium text-indigo-600 hover:underline"
                >
                  {decodeURIComponent(pdfUrl.split('/').pop() ?? 'PDF')}
                </a>
              ) : (
                <span className="text-stone-400">등록된 PDF가 없습니다.</span>
              )}
            </div>
            {pdfUrl && (
              <button
                onClick={() => setPdfUrl('')}
                className="text-xs text-rose-500 hover:underline"
              >
                제거
              </button>
            )}
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
                  e.target.value = ''
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
      </div>

      {/* 하단 저장 바 */}
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
          className="rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-2.5 text-sm font-bold text-stone-900 hover:opacity-90 disabled:opacity-50"
        >
          {saving ? '저장 중…' : isEdit ? '변경사항 저장' : '강의 등록'}
        </button>
      </div>
    </div>
  )
}

/* ── 작은 컴포넌트들 ── */
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
