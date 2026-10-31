-- 운영 DB에 이미 있는 instructor_profiles 테이블을 저장소에 맞춰 둡니다.
-- 운영에는 이미 테이블이 있으므로 이 파일은 아무것도 바꾸지 않아요 (if not exists).
-- 컬럼·기본값·NOT NULL은 운영 PostgREST 스키마로 확인했어요. 상태 check·트리거·RLS는 다음 마이그레이션에서 정리합니다.

create table if not exists public.instructor_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  status text not null default 'pending',
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

alter table public.instructor_profiles enable row level security;
