-- 고정비 담당자(who) 추가. 재실행 안전.
alter table fixed_costs add column if not exists who text check (who in ('husband','wife'));
