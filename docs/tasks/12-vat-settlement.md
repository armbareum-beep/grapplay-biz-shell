# 작업 12 — 정산 부가세 10% 차감 (매출 → 부가세 → 8:2 → 원천징수)

**작업일: 2026-08-14**

`orders.amount`는 부가세 포함가(총액표시제)인데, 기존 정산은 그 전액을 분배 기준으로 써서
80%를 나눠주고 있었다. 플랫폼이 국세청에 납부해야 할 부가세만큼을 매번 초과 지급하던 셈이다
(10만원 주문당 7,273원). 분배 **전에** 공급가액을 분리한다.

계산 순서를 **매출 → 부가세 → 8:2 → 원천징수**로 확정한다.

---

## 돈의 흐름

```
결제금액(gross, 부가세 포함)     100,000원
─ 부가세 10% (vat_amount)         −9,091원   gross − supply
= 공급가액 (supply_amount)         90,909원   (gross × 10) / 11
─ 플랫폼 수수료 20% (fee_rate)   −18,182원
= 지급총액 (amount, 공급가액의 80%) 72,727원   ← 세무상 "사업소득 지급액"
─ 원천징수 3.3% (withholding)     −2,399원   floor(amount × 0.033)
= 실지급액 (net_amount)            70,328원   ← 계좌로 실제 송금하는 금액
```

- 부가세는 **매출 전체**에 대한 세금이라 분배보다 **앞**에 온다.
- 원천징수는 **지급액**에 대한 세금이라 분배보다 **뒤**에 온다 — 두 세금의 기준이 다르다(작업 11).
- 고객 결제금액은 그대로다. 부가세는 **정산 단계 계산**이지 판매가를 바꾸지 않는다.

### 정밀도 — 부동소수 금지

`gross / 1.1`을 실수로 계산하면 `Math.floor(110000 / 1.1) === 99999`가 된다(부동소수 오차).
TS·SQL 모두 **정수 연산** `(gross * 10) / 11`로 통일하고, 부가세는 `gross − supply`로 역산해
`supply + vat = gross`가 원 단위까지 항상 성립하게 했다.

| gross | vat | supply | amount(80%) | 원천징수 | net |
|---|---|---|---|---|---|
| 100,000 | 9,091 | 90,909 | 72,727 | 2,399 | 70,328 |
| 110,000 | 10,000 | 100,000 | 80,000 | 2,640 | 77,360 |
| 49,000 | 4,455 | 44,545 | 35,636 | 1,175 | 34,461 |
| 9,900 | 900 | 9,000 | 7,200 | 237 | 6,963 |

---

## 저장 구조

마이그레이션: [supabase/migrations/20260814000000_vat_settlement.sql](../../supabase/migrations/20260814000000_vat_settlement.sql)

- `settlements` 컬럼 3개 추가:
  - `vat_rate` numeric(4,3) default **0.100**
  - `vat_amount` integer — 부가세
  - `supply_amount` integer — 공급가액(= gross_amount − vat_amount)
- `gross_amount`의 의미는 **바뀌지 않는다** — 계속 부가세 포함 결제금액 기준.
  잔액 원장(`v_already`)이 이 값에 의존하므로 건드리면 정산 이력이 어긋난다.
- **기존 정산 이력 보존**: 이미 있던 행은 부가세 차감 없이 지급됐으므로
  `vat_rate=0, supply_amount=gross_amount`로 백필. 작업 11과 같은 방식, 이력 재작성 없음.
- `request_settlement(p_expert_id default null)` RPC가 서버에서 재계산:
  1. `supply = (base * 10) / 11`, `vat = base − supply`
  2. `amount = floor(supply × 0.8)`
  3. `withholding = floor(amount × 0.033)`, `net = amount − withholding`
  - 주민등록번호 미등록 차단(작업 11)과 관리자 대리 신청 분기는 그대로 유지.
- **정산 행 직접 insert 차단**: 기존 `"expert requests settlement"` 정책이 금액을 전혀 제약하지 않아
  지도자가 PostgREST로 임의 금액 행을 직접 넣으면 서버 재계산(부가세·원천징수)을 통째로 우회할 수 있었다.
  정책을 제거해 **정산 행 생성은 security definer RPC로만** 가능하게 했다.

## 프론트

- [src/lib/expertApi.ts](../../src/lib/expertApi.ts):
  `VAT_RATE`(0.1) / `supplyFor(gross)` / **`settlementBreakdown(gross)`** 추가.
  `settlementBreakdown`은 서버 RPC와 1:1 대응하는 **유일한 계산 함수** — 금액을 표시하는
  모든 화면이 자체 계산 대신 이걸 쓴다. `SettlementRow`에 `vat_rate`·`vat_amount`·`supply_amount`,
  `SettlementSummary`에 `vat`·`supply` 추가. `getSettlementSummary()`의 잔액 계산도 이 함수로 교체.
- [src/lib/adminApi.ts](../../src/lib/adminApi.ts): `listAllSettlements()` select에 새 컬럼 3개 추가.
- **지도자 정산 탭** [AcademyExpertDashboard.tsx](../../src/pages/academy-expert/AcademyExpertDashboard.tsx):
  - 출금 가능 카드를 **4단 내역**으로 교체 — 매출 → 부가세 10% → 지도자 80%(공급가액 병기)
    → 원천징수 3.3% → 실수령 예상.
  - 정산 내역 테이블에 매출/부가세/공급가액 컬럼 추가.
  - 수익 분석 탭의 "정산 예정액"도 `settlementBreakdown()` 기준으로 교체
    (기존 `Math.round(total * 0.8)`은 부가세 미반영 + 실지급액보다 1원 높게 나오는 반올림 불일치가 있었다).
- **강의 에디터** [AcademyCourseEditor.tsx](../../src/pages/academy-expert/AcademyCourseEditor.tsx):
  판매가 입력 시 "정산 예상액"도 같은 함수로 계산.
- **관리자 정산 탭** [SettlementsTab.tsx](../../src/pages/admin/tabs/SettlementsTab.tsx):
  매출/부가세/공급가액 컬럼 추가(돈 흐름 순서로 정렬), 지급완료 확인창에 4단 내역 명시,
  상단 안내에 부가세 신고 주기 추가.

**건드리지 않은 것**: 결제 플로우(`Checkout` / `PaymentSuccess` / `confirm-payment` 엣지 함수),
관리자 개요 GMV, 주문 목록, 수익 분석의 월별 매출·누적 판매액 — 이들은 **총매출 지표**라 부가세 차감 대상이 아니다.

---

## 운영 규칙

- 부가세는 **다음 분기 25일까지** 부가가치세 신고·납부 (1·4·7·10월).
  원천징수는 **다음 달 10일까지** — 두 세금의 신고 주기가 다르다.
- 이 구조는 플랫폼이 **일반과세 사업자**이고 결제금액이 부가세 포함가라는 전제다.
- 시행 시점부터 지도자의 출금 가능 잔액이 기존 대비 약 9% 감소한다(= 그동안 과지급되던 몫).
  기존 정산 이력은 소급하지 않는다.

## 남은 과제

- **플랫폼 수수료 20%에 대한 부가세** — 지도자에게 세금계산서를 발행하는 구조는 이번 범위 밖.
- 간이과세·면세 사업자 분기 미고려. 필요해지면 작업 11에서 언급한 `payout_accounts.tax_type`과
  묶어 RPC에서 분기.
- 환불/취소 시 정산 회수(clawback) 경로가 여전히 없다 — `orders.status='canceled'`를 쓰는 코드가 없고,
  지급 후 취소되면 `v_gross − v_already`가 음수가 되어 `no balance`로만 막힌다.
