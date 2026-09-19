import { Link } from 'react-router-dom'

// 문서형 페이지 공용 레이아웃 (약관/개인정보 등) — 파이네시스 라이트 테마
export default function StaticPage({
  title,
  updated,
  children,
}: {
  title: string
  updated?: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-black text-stone-900">{title}</h1>
      {updated && <p className="mt-2 text-sm text-stone-400">시행일 {updated}</p>}
      <div className="mt-8 space-y-8 leading-relaxed text-stone-600">{children}</div>
      <div className="mt-12 border-t border-stone-200 pt-8">
        <Link
          to="/"
          className="inline-block rounded-xl bg-stone-900 px-6 py-3 text-sm font-semibold text-white hover:bg-stone-800"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}

// 조항 섹션
export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-violet-700">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
        {heading}
      </h2>
      <div className="space-y-2 border-l border-stone-200 pl-4 text-sm text-stone-600">{children}</div>
    </section>
  )
}

export function OL({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="list-decimal space-y-2 pl-5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ol>
  )
}

export function UL({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-stone-500">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  )
}
