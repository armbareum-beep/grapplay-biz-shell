# 운영자 텔레그램 알림

## 범위
- 아래 이벤트가 DB에 저장되면 운영자 텔레그램 채팅 1곳으로 메시지를 보냄.
  - 💰 정산 신청 (`settlements` insert — 지도자 신청, 관리자 대리 신청 모두)
  - ❓ 새 강의 질문 (`course_questions` insert)
  - ⭐ 새 강의 리뷰 (`course_reviews` insert)
- 사이트 알림함(지도자용)은 그대로 유지. 텔레그램은 운영자용 추가 채널.
- 전자책 리뷰, 결제 완료, 정산 상태 변경(승인/지급)은 이번 범위에 없음.

## 동작 원리
- `supabase/migrations/20261012000000_telegram_ops_alerts.sql`
- insert 트리거 → `ops_private.telegram_send` → `pg_net`으로 Bot API `sendMessage` 호출.
- pg_net 요청은 트랜잭션에 묶여 **커밋된 이벤트만** 발송. 롤백된 신청은 알림 없음.
- 봇 토큰·채팅 ID는 **Supabase Vault**에만 저장. 미설정이면 발송을 건너뜀.
- 텔레그램/네트워크 오류는 경고 로그만 남기고 **정산 신청·질문·리뷰 저장은 정상 진행**.
- 질문·리뷰 **본문, 수강생 이름·이메일, 계좌·주민번호는 보내지 않음** (텔레그램은 외부 서비스). 강의명·지도자명·금액·바로가기 링크만 포함.
- `ops_private` 스키마는 클라이언트에 노출되지 않으며 anon/authenticated는 발송 함수를 실행할 수 없음.

## 메시지 예시
```
💰 정산 신청
지도자: 김지도
신청액: 1,234,567원
실지급액: 1,193,827원 (원천징수 40,740원)
신청 시각: 2026-10-12 14:03
https://<사이트>/admin
```
```
❓ 새 강의 질문 (비공개)
강의: 주식 입문
지도자: 김지도
https://<사이트>/expert/dashboard?expert=e1&tab=qna&question=<id>
```

## 설정 (최초 1회)
1. 텔레그램에서 **@BotFather** → `/newbot` → 봇 토큰 발급 (`123456:ABC...`).
2. 알림 받을 곳 정하기
   - 개인 채팅: 만든 봇에게 아무 메시지나 보냄.
   - 단체방: 봇을 방에 초대하고 방에서 메시지 1개 보냄.
3. 채팅 ID 확인: 브라우저에서 `https://api.telegram.org/bot<토큰>/getUpdates` 열고 `"chat":{"id": ...}` 값 복사 (단체방은 `-100...`처럼 음수).
4. 파이네시스 Supabase(`sjnmkmsdzuvywtaasvdn`) → SQL Editor:
   - 마이그레이션 파일 전체 실행.
   - 이어서 (값은 저장소·채팅에 남기지 말 것):
     ```sql
     select vault.create_secret('<봇 토큰>', 'telegram_bot_token');
     select vault.create_secret('<채팅 ID>', 'telegram_chat_id');
     select vault.create_secret('https://<사이트 도메인>', 'site_url'); -- 선택: 바로가기 링크
     ```
5. 테스트 발송:
   ```sql
   select ops_private.telegram_send('✅ 파이네시스 알림 연결 테스트');
   ```
   몇 초 뒤 텔레그램 도착 확인. 안 오면 `select status_code, content from net._http_response order by created desc limit 5;`로 응답 확인 (401=토큰 오류, 400 chat not found=채팅 ID 오류 또는 봇에게 먼저 메시지를 안 보냄).

## 변경·중지
- 값 변경: `select vault.update_secret((select id from vault.secrets where name='telegram_chat_id'), '<새 값>');`
- 일시 중지: `delete from vault.secrets where name='telegram_bot_token';` (다시 등록하면 재개)
- 토큰 유출 시 BotFather `/revoke`로 재발급 후 Vault 값 교체.

## 검증
- `npm run test:telegram`: 실제 PostgreSQL 엔진(PGlite)에서 pg_net·Vault 대역으로 10개 검사 — 미설정 시 무발송, 메시지 내용·링크, 본문/이메일 미포함, 발송 실패 시에도 저장 성공, 롤백 시 무발송, 클라이언트 직접 호출 차단, 재실행 안전.
