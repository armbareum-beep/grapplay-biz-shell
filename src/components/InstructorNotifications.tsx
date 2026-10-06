import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import {
  listNotifications,
  unreadNotificationCount,
  markNotificationRead,
  notificationLink,
  errorMessage,
  type InstructorNotification,
} from '../lib/qnaApi'
import { qnaSecondary, QnaError } from './CourseQnA'

export default function InstructorNotifications() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [rows, setRows] = useState<InstructorNotification[]>([])
  const [page, setPage] = useState(0)
  const [count, setCount] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let active = true
    const update = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const n = await unreadNotificationCount()
        if (active) setUnread(n)
      } catch (e) {
        if (active && open) setError(errorMessage(e))
      }
    }
    void update()
    const timer = window.setInterval(update, 30000)
    window.addEventListener('focus', update)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', update)
    }
  }, [refresh, open])
  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    setError('')
    listNotifications(page)
      .then((result) => {
        if (active) {
          setRows(result.rows)
          setCount(result.count)
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', escape)
    return () => {
      active = false
      window.removeEventListener('keydown', escape)
    }
  }, [open, page, refresh])
  async function read(n?: InstructorNotification) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await markNotificationRead(n?.id)
      setRefresh((v) => v + 1)
      if (n) {
        setOpen(false)
        navigate(notificationLink(n))
      }
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`지도자 알림${unread ? `, 미확인 ${unread}개` : ''}`}
        aria-expanded={open}
        aria-controls="instructor-notifications"
        className="relative rounded-lg p-2 hover:bg-stone-100"
        onClick={() => {
          setOpen((v) => !v)
          setPage(0)
        }}
      >
        <Icon name="inbox" size={22} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-brand-700 px-1 text-center text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="알림 닫기"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <section
            id="instructor-notifications"
            aria-label="지도자 알림함"
            className="fixed left-3 right-3 top-16 z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-stone-200 bg-white p-4 shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-96"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-bold">알림 {unread > 0 && `(${unread})`}</h2>
              <button
                className="text-xs text-brand-700"
                disabled={busy || !unread}
                onClick={() => read()}
              >
                모두 읽음
              </button>
            </div>
            <QnaError message={error} />
            {loading ? (
              <p role="status" className="py-6 text-center text-sm">
                불러오는 중…
              </p>
            ) : (
              rows.map((n) => (
                <button
                  key={n.id}
                  disabled={busy}
                  className={`mb-2 block w-full rounded-lg p-3 text-left text-sm ${n.read_at ? 'bg-white text-stone-500' : 'bg-brand-50 text-stone-900'}`}
                  onClick={() => read(n)}
                >
                  <span className="block font-semibold">
                    {n.kind === 'question'
                      ? '새 질문이 등록되었습니다'
                      : '새 리뷰가 등록되었습니다'}
                  </span>
                  <span className="mt-1 block truncate">{n.course?.title ?? '강의'}</span>
                  <time className="mt-1 block text-xs text-stone-400">
                    {new Date(n.created_at).toLocaleString('ko-KR')}
                  </time>
                </button>
              ))
            )}
            {!loading && !error && !rows.length && (
              <p className="py-6 text-center text-sm text-stone-500">새 알림이 없습니다.</p>
            )}
            <div className="mt-2 flex justify-between gap-2">
              <button
                className={qnaSecondary}
                disabled={page === 0 || loading}
                onClick={() => setPage((v) => v - 1)}
              >
                이전
              </button>
              <button className={qnaSecondary} onClick={() => setRefresh((v) => v + 1)}>
                새로고침
              </button>
              <button
                className={qnaSecondary}
                disabled={(page + 1) * 20 >= count || loading}
                onClick={() => setPage((v) => v + 1)}
              >
                다음
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
