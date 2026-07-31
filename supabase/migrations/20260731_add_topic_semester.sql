-- Add semester assignment for topics.
alter table public.topics
  add column if not exists semester text;

-- Optional integrity check for labels like "1. Semester" through "12. Semester".
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'topics_semester_label_check'
  ) then
    alter table public.topics
      add constraint topics_semester_label_check
      check (
        semester is null
        or semester ~ '^(?:[1-9]|1[0-2])\. Semester$'
      );
  end if;
end
$$;

create index if not exists topics_semester_idx on public.topics (semester);
