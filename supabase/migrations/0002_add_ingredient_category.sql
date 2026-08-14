alter table public.ingredients
  add column category text not null default 'etc'
  constraint ingredients_category_check
  check (category in ('veggie', 'meat', 'dairy', 'grain', 'sauce', 'etc'));
