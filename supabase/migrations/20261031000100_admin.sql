-- 강사 승인 게이트 + 관리자 페이지
-- 1) 강사 상태(pending/approved/rejected/suspended)와 사유
-- 2) 가입 시 프로필 자동 생성 트리거
-- 3) 기존 강사 백필 (이미 활동 중인 강사는 승인 상태로)
-- 4) 관리자 감사 로그

-- ─────────────────────────────────────────────────────────────
-- 강사 상태
-- ─────────────────────────────────────────────────────────────
alter table public.instructor_profiles add column if not exists status_reason text;

-- 운영에 이름이 다른 status check가 있을 수 있어서, status를 검사하는 check는 모두 지우고 다시 만들어요.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.instructor_profiles'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.instructor_profiles drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.instructor_profiles
  add constraint instructor_profiles_status_check check (status in ('pending', 'approved', 'rejected', 'suspended')),
  add constraint instructor_profiles_status_reason_check check (char_length(status_reason) <= 500);

create index if not exists instructor_profiles_status_idx on public.instructor_profiles (status, created_at desc);
create index if not exists instructor_profiles_admin_idx on public.instructor_profiles (user_id) where is_admin;

-- 강사 본인 프로필 읽기 (proxy.ts가 사용자 세션으로 승인 상태를 확인해요)
drop policy if exists "instructor_profiles: self read" on public.instructor_profiles;
create policy "instructor_profiles: self read" on public.instructor_profiles for select to authenticated
  using (user_id = auth.uid() and coalesce(auth.jwt() ->> 'tk_kind', '') <> 'participant');

-- ─────────────────────────────────────────────────────────────
-- 가입 시 프로필 자동 생성 (승인 대기)
-- ─────────────────────────────────────────────────────────────
create or replace function public.tg_create_instructor_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.instructor_profiles (user_id, email, name)
  values (new.id, coalesce(new.email, ''), left(coalesce(trim(new.raw_user_meta_data ->> 'name'), ''), 30))
  on conflict (user_id) do nothing;
  return new;
end $$;
revoke execute on function public.tg_create_instructor_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_instructor_profile on auth.users;
create trigger on_auth_user_created_instructor_profile after insert on auth.users
  for each row execute function public.tg_create_instructor_profile();

-- 프로필이 없는 기존 강사는 승인 상태로 채워요 (이미 있는 행은 건드리지 않아요).
insert into public.instructor_profiles (user_id, email, name, status, reviewed_at, reviewed_by)
select u.id, coalesce(u.email, ''), left(coalesce(trim(u.raw_user_meta_data ->> 'name'), ''), 30), 'approved', now(), 'migration'
from auth.users u
on conflict (user_id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 관리자 감사 로그 (서버 service role만 접근)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  actor_email text not null default '',
  action text not null check (action in (
    'instructor.approve', 'instructor.reject', 'instructor.suspend', 'instructor.unsuspend',
    'instructor.grant_admin', 'instructor.revoke_admin', 'room.end', 'room.delete'
  )),
  target_type text not null check (target_type in ('instructor', 'room')),
  target_id text not null, -- 방은 삭제돼도 기록이 남도록 FK를 두지 않아요
  target_label text not null default '',
  reason text check (char_length(reason) <= 500),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_target_idx on public.admin_audit_logs (target_type, target_id, created_at desc);

alter table public.admin_audit_logs enable row level security;
-- 정책 없음 → anon/authenticated는 접근 불가
