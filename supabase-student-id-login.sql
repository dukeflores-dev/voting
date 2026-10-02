
create table if not exists public.student_accounts (
  student_id text primary key check (student_id ~ '^[0-9]{8}$'),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.student_accounts enable row level security;
revoke all on public.student_accounts from public, anon, authenticated;
grant select on public.student_accounts to service_role;


insert into public.student_accounts (student_id, user_id)
select normalized.student_id, normalized.id
from (
  select
    regexp_replace(users.raw_user_meta_data ->> 'student_id', '[^0-9]', '', 'g') as student_id,
    users.id,
    count(*) over (
      partition by regexp_replace(users.raw_user_meta_data ->> 'student_id', '[^0-9]', '', 'g')
    ) as id_count
  from auth.users users
  where users.raw_user_meta_data ->> 'student_id' ~ '^([0-9]{8}|[0-9]{4}-[0-9]{4})$'
) normalized
where normalized.student_id ~ '^[0-9]{8}$'
  and normalized.id_count = 1
on conflict do nothing;

create or replace function public.register_student_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_student_id text;
  normalized_student_id text;
begin
  raw_student_id := coalesce(new.raw_user_meta_data ->> 'student_id', '');
  if raw_student_id = '' then
    return new;
  end if;

  if raw_student_id !~ '^([0-9]{8}|[0-9]{4}-[0-9]{4})$' then
    raise exception 'Invalid student ID';
  end if;

  normalized_student_id := regexp_replace(
    raw_student_id,
    '[^0-9]',
    '',
    'g'
  );

  insert into public.student_accounts (student_id, user_id)
  values (normalized_student_id, new.id);

  return new;
end;
$$;

revoke all on function public.register_student_account() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_register_student on auth.users;
create trigger on_auth_user_created_register_student
after insert on auth.users
for each row execute function public.register_student_account();