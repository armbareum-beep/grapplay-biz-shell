-- 파이네시스 리브랜딩 (docs/plan/10-rebrand-phynesis.md §4)
-- 카테고리 "연금" → "투자" rename. 기존 행만 갱신한다.
-- 신설 카테고리 "브랜딩", "인문교양" 은 category 컬럼에 check 제약이 없으므로 DB 변경 불필요(앱 상수만).
-- 선례: 20260615000000_category_rename_ebook_category.sql ("체육관 운영" → "경영")

update courses set category = '투자' where category = '연금';
update ebooks  set category = '투자' where category = '연금';
update experts set category = '투자' where category = '연금';
update experts set categories = array_replace(categories, '연금', '투자')
  where '연금' = any(categories);
