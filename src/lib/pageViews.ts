import { supabase } from './supabase'

// 상세페이지 조회 기록 — 전환율 분석용.
// 브라우저 세션당 아이템별 1회만 기록해 새로고침/재방문 중복을 줄인다.
export function trackPageView(itemType: 'course' | 'ebook', itemId: string) {
  if (!supabase) return
  const key = `pv_${itemType}_${itemId}`
  try {
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    // 프라이빗 모드 등 sessionStorage 불가 시에도 기록은 시도
  }
  supabase.rpc('track_page_view', { p_item_type: itemType, p_item_id: itemId }).then(
    () => {},
    () => {}, // 실패해도 페이지 동작에는 영향 없음
  )
}
