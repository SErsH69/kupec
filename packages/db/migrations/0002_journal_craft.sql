-- Крафт-сделки в журнале: материалы, выставленная цена, частичные продажи.
alter table trades add column if not exists kind         text not null default 'flip';
alter table trades add column if not exists materials    double precision;
alter table trades add column if not exists list_price   double precision;
alter table trades add column if not exists sold_units   integer;
alter table trades add column if not exists sold_revenue double precision;
