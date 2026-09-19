import { useParams, Link } from 'react-router-dom'
import { useBizData } from '../lib/useBizData'
import CourseCard from '../components/CourseCard'
import EbookCard from '../components/EbookCard'
import ExpertAvatar from '../components/ExpertAvatar'

export default function AcademyExpertReviews() {
  const { expertId } = useParams()
  const { getExpert, getExpertStats, getCoursesByExpert, getEbooksByExpert, loading } = useBizData()
  const expert = getExpert(expertId ?? '')

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="h-40 animate-pulse rounded-3xl bg-stone-100" />
      </div>
    )
  }

  if (!expert) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="text-5xl">🤔</div>
        <h1 className="mt-4 text-2xl font-bold text-stone-900">전문가를 찾을 수 없어요</h1>
        <Link
          to="/experts"
          className="mt-6 inline-block rounded-xl bg-stone-900 px-6 py-3 font-semibold text-white"
        >
          전문가 목록으로
        </Link>
      </div>
    )
  }

  const stats = getExpertStats(expert.id)
  const courses = getCoursesByExpert(expert.id)
  const ebooks = getEbooksByExpert(expert.id)
  const categories = expert.categories?.length
    ? expert.categories
    : expert.category
      ? [expert.category]
      : stats.categories

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link to="/experts" className="text-sm text-stone-500 hover:text-amber-600">
        ← 전문가 목록
      </Link>

      {/* 프로필 */}
      <div className="mt-4 flex flex-col items-start gap-5 rounded-3xl border border-stone-200 bg-white p-6 sm:flex-row sm:items-center">
        <ExpertAvatar emoji={expert.avatar} src={expert.avatarUrl} size={80} />
        <div className="flex-1">
          <h1 className="text-2xl font-black text-stone-900">{expert.name}</h1>
          <p className="font-medium text-amber-600">{expert.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">{expert.bio}</p>
          {categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <div className="text-2xl font-black text-stone-900">{courses.length}</div>
            <div className="text-xs text-stone-500">강의</div>
          </div>
          <div>
            <div className="text-2xl font-black text-stone-900">{ebooks.length}</div>
            <div className="text-xs text-stone-500">전자책</div>
          </div>
          <div>
            <div className="text-2xl font-black text-stone-900">
              {stats.studentCount.toLocaleString()}
            </div>
            <div className="text-xs text-stone-500">수강생</div>
          </div>
        </div>
      </div>

      {/* 약력 (있을 때) */}
      {expert.credentials && expert.credentials.length > 0 && (
        <ul className="mt-6 grid gap-2 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
          {expert.credentials.map((c) => (
            <li key={c} className="flex items-center gap-2 text-sm text-stone-600">
              <span className="text-brand-500">✓</span> {c}
            </li>
          ))}
        </ul>
      )}

      {/* 전문가 강의 */}
      <h2 className="mt-10 text-xl font-black text-stone-900">강의 ({courses.length})</h2>
      {courses.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white py-12 text-center text-sm text-stone-500">
          아직 등록된 강의가 없어요.
        </div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}

      {/* 전문가 전자책 */}
      <h2 className="mt-10 text-xl font-black text-stone-900">전자책 ({ebooks.length})</h2>
      {ebooks.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white py-12 text-center text-sm text-stone-500">
          아직 등록된 전자책이 없어요.
        </div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {ebooks.map((e) => (
            <EbookCard key={e.id} ebook={e} />
          ))}
        </div>
      )}
    </div>
  )
}
