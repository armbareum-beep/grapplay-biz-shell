// 파이네시스 워드마크 — PNS 심볼 + 한국어 글자 조합 (docs/plan/10-rebrand-phynesis.md D2).
// 헤더·푸터·로그인 화면이 공용으로 쓴다. 링크가 필요하면 바깥에서 <Link>로 감싼다.

type Size = 'sm' | 'md' | 'lg'

const IMG: Record<Size, string> = {
  sm: 'h-5',
  md: 'h-6 sm:h-7',
  lg: 'h-8',
}
const TEXT: Record<Size, string> = {
  sm: 'text-lg',
  md: 'text-xl sm:text-2xl',
  lg: 'text-2xl',
}

export default function BrandLogo({ size = 'md', className = '' }: { size?: Size; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img src="/logo/pns-symbol-ui.png" alt="" aria-hidden className={`${IMG[size]} w-auto`} />
      <span className={`${TEXT[size]} font-black tracking-tight text-slate-900`}>파이네시스</span>
    </span>
  )
}
