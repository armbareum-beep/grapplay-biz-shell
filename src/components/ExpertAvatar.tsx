// 전문가/저자 아바타 — 업로드 사진(avatarUrl)이 있으면 원형 이미지, 없으면 이모지 폴백.
export default function ExpertAvatar({
  emoji,
  src,
  size = 32,
  className = '',
  rounded = 'rounded-full',
  fallbackBg = 'bg-slate-100',
}: {
  emoji?: string | null
  src?: string | null
  size?: number
  className?: string
  rounded?: string
  fallbackBg?: string
}) {
  const px = `${size}px`
  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={{ width: px, height: px }}
        className={`shrink-0 ${rounded} object-cover ${className}`}
      />
    )
  }
  return (
    <span
      style={{ width: px, height: px, fontSize: `${Math.round(size * 0.55)}px` }}
      className={`grid shrink-0 place-items-center ${rounded} ${fallbackBg} ${className}`}
    >
      {emoji || '🧑‍🏫'}
    </span>
  )
}
