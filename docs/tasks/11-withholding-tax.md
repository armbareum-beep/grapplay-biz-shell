# 작업 11 — 정산 원천징수 3.3% + 주민등록번호 수집

**작업일: 2026-08-06**

지도자(개인·프리랜서)에게 정산금을 보낼 때 사업소득 원천징수 3.3%(소득세 3% + 지방소득세 0.3%)를
떼고 보내야 하는데, 기존 정산 구조(80/20)에는 이 단계가 없었다. 원천징수액·실지급액을 정산 행에
기록하고, 신고에 필요한 주민등록번호를 정산 계좌에 수집한다.

---

## 돈의 흐름

```
주문 매출(gross_amount)          100,000원
─ 플랫폼 수수료 20% (fee_rate)   −20,000원
= 지급총액 (amount, 80%)          80,000원   ← 세무상 "사업소득 지급액"
─ 원천징수 3.3% (withholding)     −2,640원   floor(amount × 0.033)
= 실지급액 (net_amount)           77,360원   ← 계좌로 실제 송금하는 금액
```

- 3.3%는 **매출이 아니라 지도자 몫(80%)** 에 적용한다 — 원천징수는 "지급액"에 대한 세금.
- 세 값(지급총액/원천징수액/실지급액)을 모두 저장해 홈택스 신고 시 그대로 쓴다.

---

## 저장 구조

마이그레이션: [supabase/migrations/20260806000000_withholding_tax.sql](../../supabase/migrations/20260806000000_withholding_tax.sql)

- `payout_accounts.resident_id`(text, nullable) — **주민등록번호**, 원천징수 신고용.
  RLS는 기존 정책 그대로(본인 지도자 + 관리자만 read/write).
- `settlements` 컬럼 3개 추가:
  - `withholding_rate` numeric(4,3) default **0.033**
  - `withholding_amount` integer — 원천징수액
  - `net_amount` integer — 실지급액(= amount − withholding_amount)
- **기존 정산 이력 보존**: 이미 있던 행은 원천징수 없이 지급됐으므로
  `withholding_rate=0, net_amount=amount`로 백필. 이력 재작성 없음.
- `request_settlement()` RPC(security definer)가 서버에서 재계산:
  1. `payout_accounts.resident_id` 미등록이면 `no resident id` 예외로 **신청 차단**
  2. `amount = floor((총매출 − 기정산 매출) × 0.8)`
  3. `withholding = floor(amount × 0.033)`, `net = amount − withholding`

## 프론트

- [src/lib/expertApi.ts](../../src/lib/expertApi.ts):
  `WITHHOLDING_RATE`(0.033) / `withholdingFor(amount)` / `maskResidentId()` 추가.
  `SettlementRow`에 `withholding_amount`·`net_amount`, `PayoutAccount`에 `resident_id`.
  `requestSettlement()`가 `no resident id` 오류를 한국어 안내로 매핑.
- **지도자 정산 탭** [src/pages/academy-expert/AcademyExpertDashboard.tsx](../../src/pages/academy-expert/AcademyExpertDashboard.tsx):
  - 출금 가능 카드에 "원천징수 3.3% −X → 실수령 예상 Y" 표시.
  - 계좌 폼에 주민등록번호 입력 + 수집 목적 안내 문구. 조회 시 `900101-1******` 마스킹.
  - 미등록 상태로 출금 신청 시 클라이언트에서도 선차단(서버 RPC가 최종 방어).
  - 정산 내역 테이블에 원천징수/실지급액 컬럼.
- **관리자 정산 탭** [src/pages/admin/tabs/SettlementsTab.tsx](../../src/pages/admin/tabs/SettlementsTab.tsx):
  - 원천징수·**실지급액(굵게)** 컬럼 — 관리자가 이체할 금액은 실지급액.
  - "계좌 보기"에 주민등록번호 전체 표시(신고용), 미등록이면 빨간 경고.
  - 지급완료 확인창에 실지급액 명시. 상단에 "다음 달 10일까지 홈택스 신고·납부" 안내.

---

## 운영 규칙

- 원천징수한 세금은 **지급한 달의 다음 달 10일까지** 홈택스 원천세 신고·납부.
- 지도자가 사업자(세금계산서 발행)면 원천징수 대상이 아님 — 현재는 전원 개인 가정.
  필요해지면 `payout_accounts.tax_type`(freelancer/business) 추가해 RPC에서 분기.
- 소득세 1,000원 미만 소액부징수 규정은 누적 잔액 단위 정산이라 사실상 미적용 — 무시.

## 남은 과제

- 주민등록번호 **암호화 저장**(개인정보보호법상 암호화 의무 항목) — 현재는 RLS 보호만.
  Supabase Vault/pgcrypto + security definer RPC로 전환 검토.
- 자동 송금(토스 지급대행), 월 마감 배치, 지급명세서 자동 생성.
