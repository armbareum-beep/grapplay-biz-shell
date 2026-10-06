import { supabase } from './supabase'

export interface CourseAnswer {
  question_id: string
  content: string
  created_at: string
  updated_at: string
}
export interface CourseQuestion {
  id: string
  course_id: string
  user_id: string
  author_name: string
  content: string
  is_public: boolean
  lesson_index: number | null
  lesson_title: string | null
  answered_at: string | null
  created_at: string
  updated_at: string
  answer: CourseAnswer | null
  course: { id: string; title: string; expert_id: string }
}
export interface InstructorNotification {
  id: string
  expert_id: string
  course_id: string
  question_id: string | null
  review_id: string | null
  kind: 'question' | 'review'
  read_at: string | null
  created_at: string
  course: { title: string } | null
}
export const QNA_PAGE_SIZE = 20
function db() {
  if (!supabase) throw new Error('연결이 설정되지 않았습니다.')
  return supabase
}
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : (error as { message?: string })?.message || '요청을 처리하지 못했습니다. 다시 시도해 주세요.'
}
export async function listQuestions(input: {
  courseId?: string
  expertId?: string
  userId?: string
  questionId?: string
  status?: 'all' | 'pending' | 'answered'
  page?: number
}) {
  let query = db()
    .from('course_questions')
    .select(
      'id,course_id,user_id,author_name,content,is_public,lesson_index,lesson_title,answered_at,created_at,updated_at,answer:course_answers(question_id,content,created_at,updated_at),course:courses!inner(id,title,expert_id)',
      { count: 'exact' },
    )
  if (input.courseId) query = query.eq('course_id', input.courseId)
  if (input.expertId) query = query.eq('course.expert_id', input.expertId)
  if (input.userId) query = query.eq('user_id', input.userId)
  if (input.questionId) query = query.eq('id', input.questionId)
  if (input.status === 'pending') query = query.is('answered_at', null)
  if (input.status === 'answered') query = query.not('answered_at', 'is', null)
  const offset = (input.page ?? 0) * QNA_PAGE_SIZE
  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .order('id')
    .range(offset, offset + QNA_PAGE_SIZE - 1)
  if (error) throw error
  return { rows: (data ?? []) as unknown as CourseQuestion[], count: count ?? 0 }
}
export async function createQuestion(input: {
  courseId: string
  content: string
  isPublic: boolean
  lessonIndex: number | null
}) {
  const { error } = await db().from('course_questions').insert({
    course_id: input.courseId,
    content: input.content.trim(),
    is_public: input.isPublic,
    lesson_index: input.lessonIndex,
  })
  if (error) throw error
}
export async function editQuestion(id: string, content: string, isPublic: boolean) {
  const { data, error } = await db()
    .from('course_questions')
    .update({ content: content.trim(), is_public: isPublic })
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data?.length) throw new Error('질문을 수정할 수 없습니다. 답변 여부와 권한을 확인해 주세요.')
}
export async function saveAnswer(questionId: string, content: string, hasAnswer: boolean) {
  // No upsert: students cannot write author_id, and edits never replace the question ID.
  const query = hasAnswer
    ? db().from('course_answers').update({ content: content.trim() }).eq('question_id', questionId)
    : db().from('course_answers').insert({ question_id: questionId, content: content.trim() })
  const { data, error } = await query.select('question_id')
  if (error) throw error
  if (!data?.length) throw new Error('답변을 저장할 권한이 없습니다.')
}
export async function pendingQuestionCount(expertId: string) {
  const { count, error } = await db()
    .from('course_questions')
    .select('id,course:courses!inner(expert_id)', { count: 'exact', head: true })
    .eq('course.expert_id', expertId)
    .is('answered_at', null)
  if (error) throw error
  return count ?? 0
}
export async function listNotifications(page = 0) {
  const { data, count, error } = await db()
    .from('instructor_notifications')
    .select(
      'id,expert_id,course_id,question_id,review_id,kind,read_at,created_at,course:courses(title)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .order('id')
    .range(page * 20, page * 20 + 19)
  if (error) throw error
  return { rows: (data ?? []) as unknown as InstructorNotification[], count: count ?? 0 }
}
export async function unreadNotificationCount() {
  const { count, error } = await db()
    .from('instructor_notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)
  if (error) throw error
  return count ?? 0
}
export async function markNotificationRead(id?: string) {
  let query = db()
    .from('instructor_notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)
  if (id) query = query.eq('id', id)
  const { error } = await query
  if (error) throw error
}
export function notificationLink(n: InstructorNotification) {
  const query = new URLSearchParams({
    expert: n.expert_id,
    tab: n.kind === 'question' ? 'qna' : 'reviews',
  })
  if (n.question_id) query.set('question', n.question_id)
  if (n.review_id) query.set('review', n.review_id)
  return `/expert/dashboard?${query}`
}
