// 파이네시스 워드마크 — 한국어 글자만 (docs/plan/10-rebrand-phynesis.md D2).
// PNS 심볼은 파비콘·앱 아이콘에만 쓰고 화면 안에는 넣지 않는다.
// 헤더·푸터·로그인 화면이 공용으로 쓴다. 링크가 필요하면 바깥에서 <Link>로 감싼다.

type Size = 'sm' | 'md' | 'lg'

const TEXT: Record<Size, string> = {
  sm: 'text-lg',
  md: 'text-xl sm:text-2xl',
  lg: 'text-2xl',
}

export default function BrandLogo({ size = 'md', className = '' }: { size?: Size; className?: string }) {
  return (
    <span className={`${TEXT[size]} font-black tracking-tight text-slate-900 ${className}`}>파이네시스</span>
  )
}
