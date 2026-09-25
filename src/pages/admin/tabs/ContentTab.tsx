import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice } from '../../../data/mock'
import { useBizData } from '../../../lib/useBizData'
import { deleteCourse, deleteEbook } from '../../../lib/expertApi'
import PdfMigrationPanel from './PdfMigrationPanel'

// 콘텐츠 관리 — 전 전문가의 강의/전자책 조회·편집·삭제.
// 편집은 기존 에디터를 재사용한다(관리자는 requireExpert 가드를 통과, 소유권 유지).
export default function ContentTab() {
  const { courses, ebooks, getExpert, refetch, loading } = useBizData()
  const [kind, setKind] = useState<'강의' | '전자책'>('강의')
  const [busyId, setBusyId] = useState<string | null>(null)

  const onDelete = async (type: 'course' | 'ebook', id: string, title: string) => {
    if (!confirm(`'${title}' 을(를) 삭제할까요? 되돌릴 수 없습니다.`)) return
    setBusyId(id)
    const { error } = type === 'course' ? await deleteCourse(id) : await deleteEbook(id)
    setBusyId(null)
    if (error) return alert('삭제 실패: ' + error)
    refetch()
  }

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-stone-100" />

  return (
    <div className="space-y-4">
      <PdfMigrationPanel />
      <div className="flex gap-2">
        {(['강의', '전자책'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              kind === k ? 'bg-brand-600 text-white' : 'border border-stone-300 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {k} ({k === '강의' ? courses.length : ebooks.length})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {kind === '강의'
          ? courses.map((c) => (
              <ContentRow
                key={c.id}
                emoji={c.thumbEmoji}
                cover={c.cover}
                title={c.title}
                expertName={getExpert(c.expertId)?.name ?? c.expertId}
                meta={`${formatPrice(c.price)} · 수강 ${c.studentCount.toLocaleString()}명 · ${c.lessonCount}강`}
                previewTo={`/courses/${c.id}`}
                editTo={`/expert/courses/${c.id}/edit`}
                busy={busyId === c.id}
                onDelete={() => onDelete('course', c.id, c.title)}
              />
            ))
          : ebooks.map((e) => (
              <ContentRow
                key={e.id}
                emoji={e.emoji}
                cover={e.cover}
                title={e.title}
                expertName={(e.expertId ? getExpert(e.expertId)?.name : undefined) ?? e.expertId ?? '미지정'}
                meta={`${formatPrice(e.price)} · ${e.pageCount}쪽 · 구매 ${e.buyerCount.toLocaleString()}명`}
                previewTo={`/ebooks/${e.id}`}
                editTo={`/expert/ebooks/${e.id}/edit`}
                busy={busyId === e.id}
                onDelete={() => onDelete('ebook', e.id, e.title)}
              />
            ))}

        {((kind === '강의' && courses.length === 0) || (kind === '전자책' && ebooks.length === 0)) && (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-12 text-center text-sm text-stone-500">
            등록된 {kind}이(가) 없어요.
          </div>
        )}
      </div>
    </div>
  )
}

function ContentRow({
  emoji,
  cover,
  title,
  expertName,
  meta,
  previewTo,
  editTo,
  busy,
  onDelete,
}: {
  emoji: string
  cover: string
  title: string
  expertName: string
  meta: string
  previewTo: string
  editTo: string
  busy: boolean
  onDelete: () => void
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center">
      <div className={`grid h-16 w-24 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${cover} text-2xl`}>
        {emoji}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-stone-900">{title}</h3>
        <p className="text-xs text-stone-500">{expertName}</p>
        <div className="mt-1 text-xs text-stone-400">{meta}</div>
      </div>
      <div className="flex gap-2">
        <Link
          to={previewTo}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50"
        >
          미리보기
        </Link>
        <Link
          to={editTo}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
        >
          편집
        </Link>
        <button
          onClick={onDelete}
          disabled={busy}
          className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
        >
          삭제
        </button>
      </div>
    </div>
  )
}
