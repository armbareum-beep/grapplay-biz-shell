# 강의별 Q&A 및 지도자 사이트 알림

## 범위
- 강의 생성/편집의 `Q&A 사용하기` 설정. 신규·기존 강의 기본 OFF.
- 수강 화면 `/learn/:id?tab=qna`의 질문 등록, 목록, 질문 수정, 답변 확인.
- 지도자 `/expert/dashboard?tab=qna`의 강의·답변 상태 필터, 답변 등록/수정, 미답변 건수.
- 해당 강의 지도자 계정의 상단 알림함: 새 질문 / 강의 리뷰, 읽음·모두 읽음, 해당 질문/리뷰 바로가기.
- **이메일·문자·외부 푸시는 없음.** 알림은 DB에 보관되며 사이트 접속 중 30초 간격 및 창 포커스 복귀 시 미확인 건수를 갱신. 목록은 열 때/새로고침할 때 조회.
- 기존 리뷰나 질문을 소급해서 알리지 않으며, 수정·답변 저장은 새 질문/리뷰 알림을 만들지 않음.

## 운영 규칙
- 로그인 + 해당 강의 수강 권한을 가진 사용자만 질문. 무료 강의도 무료 수강 등록 후 이용.
- 공개 질문은 같은 강의 수강생·담당 지도자·관리자에게 보임. 기본 비공개는 작성자·담당 지도자·관리자에게만 보임.
- Q&A OFF는 **새 질문 접수 중단**. 기존 질문/답변 열람과 지도자 답변은 유지.
- 답변 전에는 본인 질문 내용·공개 여부만 수정. 답변 이후 질문 변경 금지.
- 질문 하나당 공식 답변 하나. 담당 지도자·관리자가 수정 가능.
- 답변 작성자의 Auth 계정 삭제 시 답변 본문·작성시각·답변 상태는 유지하고 author_id만 NULL로 정리. 이후 현재 담당 지도자가 수정하면 수정자의 ID가 기록됨.
- SQL Editor/service role도 사용자 JWT 없이 질문·답변을 등록하거나 수정할 수 없음. 계정 삭제에 따른 답변 author_id 정리만 좁게 예외 처리. 운영 수정을 위해 트리거를 끄거나 권한 검사를 우회하지 않음.
- 공개 질문의 숨김/삭제 관리 UI는 이번 범위에 없음. 도입 전까지 공개 질문 신고는 운영자가 접수하고 별도 대응. 답변 후 질문을 숨기거나 삭제하는 정책·기능은 후속 작업으로 남김.
- `courses.id`는 text, 사용자·질문 ID는 uuid. 회차 index와 서버에서 얻은 당시 제목을 함께 저장.
- 알림 수신자는 현재 강의의 expert_id와 연결된 profiles 중 expert/admin 역할의 계정. 일반 관리자 전체에게 일괄 알리지 않음. 자기 글 알림 제외.
- 알림에는 질문 본문·이메일을 복사하지 않음. 수신자와 현재 담당 강의 권한을 DB에서 확인.
- 강의 소유자가 바뀌면 이전 지도자는 비공개 질문·기존 알림에 접근 불가. 새 지도자는 Q&A 목록에서 기존 질문 관리 가능.
- 후기 화면과 Q&A 화면은 별개. 이번 알림은 **강의 리뷰** 대상이며 전자책/지도자 프로필 리뷰는 포함하지 않음.

## 데이터 및 보안
- `courses.qna_enabled boolean not null default false`
- `course_questions`: 본문, 공개 여부, 작성자/회차 스냅샷, 서버 관리 answered_at.
- `course_answers`: question_id를 PK로 사용. 답변 저장 트리거가 answered_at 동기화.
- `instructor_notifications`: recipient_id + question_id/review_id 고유 제약으로 중복 방지.
- grant를 컬럼 단위로 제한해 강의·작성자·답변 상태 변조 방지. RLS는 등록/조회/수정 별도로 적용.
- 제한된 security-definer 권한 헬퍼·트리거는 비노출 `qna_private` 스키마에 둠. auth.uid()와 DB profiles/enrollments만 권한 근거로 사용.
- Q&A/알림은 공개 `useBizData` 캐시에 합치지 않음. 페이지당 20개 별도 조회.
- 로그인 후 프로필 조회까지 권한 판정을 대기하며 returnTo 쿼리도 보존해 알림 목적지 유지.
- 공개 질문을 읽는 수강생은 작성자 UUID(user_id)도 조회 가능. UUID는 인증 수단은 아니지만 사용자 간 연계 식별자가 되므로, 후속 작업에서 UUID 대신 is_mine을 제공하는 조회 인터페이스 검토.

## 적용 순서
1. 파이네시스 전용 프로젝트인지 확인: 저장소 문서 기준 ref `sjnmkmsdzuvywtaasvdn`. 다른 Grapplay/Reels 프로젝트에 실행하지 않음.
2. staging/local 검증 후 `20261006025002_course_qna_notifications.sql`, `20261006055858_qna_answer_author_deletion.sql`을 순서대로 파이네시스 DB에 적용. 첫 파일이 이미 적용되었다면 두 번째만 추가 적용. 기존 migration은 수정하지 않음.
3. `npm ci`, `npm run test:qna`, `npm run test:qna-ui`, `npm run build`.
4. PR 병합 및 Vercel 배포. DB 적용보다 프론트 배포가 먼저면 강의 저장이 실패하므로 순서를 준수.
5. 지도자 대시보드에서 필요한 강의만 Q&A 활성화.
6. 실제 무료/유료 수강생 계정으로 질문/리뷰 → 올바른 지도자 알림 → 답변 → 수강생 확인. 다른 지도자와 다른 수강생의 비공개 접근 차단도 확인.

배포를 되돌릴 때는 프론트만 이전 버전으로 복구한다. 새 테이블은 보존하고, 필요하면 신규 강의 Q&A를 끈다. 기존 강의·결제·수강 데이터 삭제는 필요 없다.

## 검증
- `npm run test:qna`: PGlite(Postgres WASM)의 실제 RLS/트리거를 사용. 익명, 수강생 2명, 미수강생, 지도자 2명, 관리자 역할을 분리해 검증. 실제 운영 데이터 사용 안 함.
- `npm run test:qna-ui`: jsdom + 모의 HTTP 응답으로 로그인 프로필 대기, Q&A 직접 진입, 지도자 답변, 알림 클릭/읽음, 설정 저장, 수강생 질문 등록을 검증. 실제 브라우저 레이아웃 검증은 아님.
- `npm run build`: TypeScript 및 Vite 프로덕션 빌드.
- 운영 Supabase 접근·실제 사이트 동작은 별도 배포 검증 필요.

## 2026-10-06 리뷰 반영 및 운영 DB 적용
- 파이네시스 프로젝트 `sjnmkmsdzuvywtaasvdn`과 대상 강의 `c_2085f464` 확인 후 두 migration 적용 완료.
- 운영 migration 이력은 MCP가 부여한 버전 `20261006060139_course_qna_notifications`, `20261006060157_qna_answer_author_deletion`. 저장소 파일과 버전 접두사는 다르지만 SQL 내용은 같음. CLI로 후속 배포하기 전에는 이 매핑을 기준으로 이력을 정합화하고, 적용된 초기 파일을 중복 실행하지 않음.
- 적용 후 강의 2개·수강등록 56개 유지, Q&A 활성 강의 0개 확인. 신규 3개 테이블 RLS 활성, 정책 8개, 익명 조회·클라이언트 작성자 변경·트리거 직접 실행 차단 확인.
- 로컬 DB 검사 48개 통과: 기존 답변이 있는 상태에서 보완 migration 적용·재적용, JWT 없는 계정 삭제, 다른 사용자의 JWT가 있는 삭제, 답변 보존·이후 담당자 수정 확인.
- 화면 검사 통과: 일반 리뷰 탭은 캐시를 사용하고 리뷰 알림 진입 시에만 다시 조회. 빌드 및 diff 검사 통과.
- 보안 advisor의 Q&A 관련 신규 지적 없음. 적용 전부터 있던 page_views 정책 없음, 기존 공개 함수 실행 권한, 유출 암호 보호 비활성 지적은 이번 변경 범위 밖이며 해결된 것으로 간주하지 않음. 참고: [정책 검사](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [익명 함수 권한](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [로그인 사용자 함수 권한](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [암호 보호](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- PR은 병합하지 않음. 운영 프런트엔드 배포와 실제 계정으로의 최종 화면 검증은 남아 있음.
