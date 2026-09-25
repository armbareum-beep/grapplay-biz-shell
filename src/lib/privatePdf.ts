import { supabase } from './supabase'

// 비공개 PDF 버킷 — 읽기 자격은 스토리지 RLS가 판단한다(20260926000000_private_pdfs.sql).
//   ebook-files  : {expertId}/{ebookId}/{uuid}.pdf  → 구매자·소유 전문가·관리자
//   reward-files : {expertId}/{courseId}/{uuid}.pdf → 리뷰 작성자·소유 전문가·관리자
export type PrivateBucket = 'ebook-files' | 'reward-files'

// 서명 URL 유효시간(초). pdf.js는 첫 화면 이후 나머지를 백그라운드로 받아두므로 1시간이면 충분.
const SIGNED_URL_TTL = 60 * 60

export async function uploadPrivatePdf(
  bucket: PrivateBucket,
  expertId: string,
  itemId: string,
  file: Blob,
): Promise<{ path: string | null; error: string | null }> {
  if (!supabase) return { path: null, error: '연결이 설정되지 않았습니다.' }
  const path = `${expertId}/${itemId}/${crypto.randomUUID()}.pdf`
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: 'application/pdf', upsert: false })
  if (error) return { path: null, error: error.message }
  return { path, error: null }
}

// 자격이 없으면 RLS에 막혀 error가 온다.
export async function getSignedPdfUrl(
  bucket: PrivateBucket,
  path: string,
): Promise<{ url: string | null; error: string | null }> {
  if (!supabase) return { url: null, error: '연결이 설정되지 않았습니다.' }
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL)
  if (error || !data) return { url: null, error: error?.message ?? '열람 권한이 없습니다.' }
  return { url: data.signedUrl, error: null }
}

export async function downloadPrivatePdf(
  bucket: PrivateBucket,
  path: string,
): Promise<{ data: Blob | null; error: string | null }> {
  if (!supabase) return { data: null, error: '연결이 설정되지 않았습니다.' }
  const { data, error } = await supabase.storage.from(bucket).download(path)
  return { data: data ?? null, error: error?.message ?? null }
}

// 앞 maxPages 쪽만 잘라낸 미리보기 PDF 생성. pdf-lib는 편집·이전 화면에서만 필요하므로 지연 로드.
export async function makePreviewPdf(
  source: Blob,
  maxPages: number,
): Promise<{ bytes: Uint8Array; totalPages: number }> {
  const { PDFDocument } = await import('pdf-lib')
  const src = await PDFDocument.load(await source.arrayBuffer(), { ignoreEncryption: true })
  const totalPages = src.getPageCount()
  const n = Math.max(1, Math.min(maxPages || 1, totalPages))
  const out = await PDFDocument.create()
  const pages = await out.copyPages(src, Array.from({ length: n }, (_, i) => i))
  pages.forEach((p) => out.addPage(p))
  return { bytes: await out.save(), totalPages }
}

// 미리보기 PDF는 공개 covers 버킷(앞 N쪽만 담겨 있으므로 공개해도 됨)
export async function uploadPreviewPdf(
  ebookId: string,
  bytes: Uint8Array,
): Promise<{ url: string | null; error: string | null }> {
  if (!supabase) return { url: null, error: '연결이 설정되지 않았습니다.' }
  const path = `ebook-previews/${ebookId}/${crypto.randomUUID()}.pdf`
  const { error } = await supabase.storage
    .from('covers')
    .upload(path, new Blob([bytes as BlobPart], { type: 'application/pdf' }), {
      contentType: 'application/pdf',
      cacheControl: '3600',
    })
  if (error) return { url: null, error: error.message }
  return { url: supabase.storage.from('covers').getPublicUrl(path).data.publicUrl, error: null }
}

// 원본 → 미리보기 생성 + 업로드를 한 번에
export async function buildAndUploadPreview(
  ebookId: string,
  source: Blob,
  maxPages: number,
): Promise<{ url: string | null; totalPages: number | null; error: string | null }> {
  try {
    const { bytes, totalPages } = await makePreviewPdf(source, maxPages)
    const { url, error } = await uploadPreviewPdf(ebookId, bytes)
    return { url, totalPages, error }
  } catch (e) {
    return { url: null, totalPages: null, error: e instanceof Error ? e.message : String(e) }
  }
}
