import type { CSSProperties } from 'react'
import type { DetailBlock } from '../data/mock'

// 랜딩(리치 상세) 텍스트 블록 꾸미기 — 크기/굵기/색상/정렬 (요청 ⑨)
// 값이 없으면 타입별 기본값을 적용해 기존 디자인을 그대로 유지(하위호환).

export type BlockSize = NonNullable<DetailBlock['size']>
export type BlockWeight = NonNullable<DetailBlock['weight']>
export type BlockAlign = NonNullable<DetailBlock['align']>

export const SIZE_OPTIONS: { key: BlockSize; label: string }[] = [
  { key: 'sm', label: '작게' },
  { key: 'base', label: '보통' },
  { key: 'lg', label: '크게' },
  { key: 'xl', label: '더크게' },
  { key: '2xl', label: '제목' },
]

export const WEIGHT_OPTIONS: { key: BlockWeight; label: string }[] = [
  { key: 'normal', label: '기본' },
  { key: 'medium', label: '중간' },
  { key: 'bold', label: '굵게' },
  { key: 'black', label: '매우굵게' },
]

export const ALIGN_OPTIONS: { key: BlockAlign; label: string }[] = [
  { key: 'left', label: '왼쪽' },
  { key: 'center', label: '가운데' },
  { key: 'right', label: '오른쪽' },
]

// 색상 프리셋 스와치 (직접 입력도 가능)
export const COLOR_SWATCHES = [
  '#0f172a', // slate-900
  '#475569', // slate-600
  '#7c3aed', // brand-600
  '#db2777', // pink-600
  '#dc2626', // red-600
  '#ea580c', // orange-600
  '#16a34a', // green-600
  '#2563eb', // blue-600
]

const SIZE_CLASS: Record<BlockSize, string> = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
}
const WEIGHT_CLASS: Record<BlockWeight, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  bold: 'font-bold',
  black: 'font-black',
}
const ALIGN_CLASS: Record<BlockAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

// 타입별 기본 (값이 없을 때) — 기존 하드코딩 스타일과 동일
const DEFAULTS: Record<'heading' | 'text', { size: BlockSize; weight: BlockWeight }> = {
  heading: { size: 'lg', weight: 'black' },
  text: { size: 'base', weight: 'normal' },
}

export function blockClass(b: Pick<DetailBlock, 'type' | 'size' | 'weight' | 'align'>): string {
  const def = b.type === 'heading' ? DEFAULTS.heading : DEFAULTS.text
  const size = SIZE_CLASS[b.size ?? def.size]
  const weight = WEIGHT_CLASS[b.weight ?? def.weight]
  const align = b.align ? ALIGN_CLASS[b.align] : ''
  return [size, weight, align].filter(Boolean).join(' ')
}

export function blockStyle(b: Pick<DetailBlock, 'color'>): CSSProperties {
  return b.color ? { color: b.color } : {}
}
