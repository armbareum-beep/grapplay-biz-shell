-- ───────────────────────────────────────────────────────────
-- 보안: 수강 권한 바꿔치기 차단
--
-- "update own progress" 정책은 행 소유(auth.uid() = user_id)만 확인하므로,
-- 무료 강의를 self-enroll한 뒤 item_type/item_id를 유료 강의·전자책으로 update하면
-- 결제 없이 수강 권한을 얻을 수 있었다.
--
-- 클라이언트가 실제로 수정하는 컬럼은 진도(progress, lesson_progress)뿐이므로
-- update 권한을 이 두 컬럼으로만 제한한다. RLS(본인 행만)는 그대로 유지.
-- 유료 수강 부여(confirm-payment)는 service role이라 영향 없음. 재실행 안전.
-- ───────────────────────────────────────────────────────────
revoke update on table public.enrollments from anon, authenticated;
grant update (progress, lesson_progress) on table public.enrollments to authenticated;
