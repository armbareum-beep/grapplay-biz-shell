// 파이네시스 워드마크 — 한국어 "파이네시스" + 아래 작게 영문 "PHYNESIS" (docs/plan/10-rebrand-phynesis.md D2).
// 서체: SUIT Bold 서브셋(font-wordmark, src/index.css). 자간은 한글 +0.04em, 영문 +0.28em.
// PNS 심볼은 파비콘·앱 아이콘에만 쓰고 화면 안에는 넣지 않는다.
// 헤더·푸터·로그인 화면이 공용으로 쓴다. 링크가 필요하면 바깥에서 <Link>로 감싼다.

type Size = 'sm' | 'md' | 'lg'

const KO: Record<Size, string> = {
  sm: 'text-lg',
  md: 'text-xl sm:text-2xl',
  lg: 'text-3xl',
}
const EN: Record<Size, string> = {
  sm: 'text-[8px]',
  md: 'text-[8px] sm:text-[9px]',
  lg: 'text-[11px]',
}

export default function BrandLogo({
  size = 'md',
  className = '',
  tone = 'dark',
}: {
  size?: Size
  className?: string
  tone?: 'dark' | 'light' // light = 어두운 배경 위
}) {
  const ko = tone === 'dark' ? 'text-slate-900' : 'text-white'
  const en = tone === 'dark' ? 'text-slate-500' : 'text-slate-300'
  return (
    <span className={`inline-flex flex-col leading-none font-wordmark font-bold ${className}`} aria-label="파이네시스 PHYNESIS">
      <span className={`${KO[size]} ${ko}`} style={{ letterSpacing: '0.04em' }}>파이네시스</span>
      <span className={`${EN[size]} ${en} mt-1 pl-px`} style={{ letterSpacing: '0.28em' }}>PHYNESIS</span>
    </span>
  )
}
