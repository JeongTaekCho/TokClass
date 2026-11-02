-- 교안: 수업 중에 반복해서 여는 링크(바로가기)와 복사해서 쓰는 프롬프트·명령어 카드
-- 라이브러리(원본: lesson_packs / lesson_cards)와 방에 넣은 사본(room_lesson_groups / room_lesson_cards)을 나눠요.
-- 방에 넣을 때 복사하므로, 라이브러리를 고치거나 지워도 진행 중인 수업은 바뀌지 않아요.
-- 모든 쓰기는 서버(service role)만 해요. RLS 읽기 정책은 방어용이에요.

-- ─────────────────────────────────────────────────────────────
-- 라이브러리: 묶음 / 카드
-- ─────────────────────────────────────────────────────────────
create table if not exists public.lesson_packs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade, -- null = 공용(관리자 관리)
  title text not null check (char_length(title) between 1 and 60),
  intro text not null default '' check (char_length(intro) <= 300),
  categories text[] not null default '{}' check (cardinality(categories) <= 20),
  is_published boolean not null default false, -- 공용 묶음만 의미 있어요. 꺼져 있으면 강사에게 안 보여요.
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lesson_packs_owner_idx on public.lesson_packs (owner_id);
create index if not exists lesson_packs_public_idx on public.lesson_packs (position) where owner_id is null;

create table if not exists public.lesson_cards (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.lesson_packs (id) on delete cascade,
  kind text not null check (kind in ('link', 'copy')),
  name text not null check (char_length(name) between 1 and 80),
  org text check (char_length(org) <= 40),
  description text not null default '' check (char_length(description) <= 200),
  url text check (char_length(url) <= 2000),
  body text check (char_length(body) <= 20000),
  icon text not null check (char_length(icon) between 1 and 16), -- 1~4자(grapheme)는 서버에서 확인해요. 이모지는 코드 단위가 여러 개라 여유를 둬요.
  color text not null check (color in ('indigo', 'coral', 'purple', 'green', 'blue', 'orange', 'slate', 'red')),
  category text check (char_length(category) <= 30),
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'link' and url ~* '^https?://') or (kind = 'copy' and body is not null and char_length(body) >= 1))
);
create index if not exists lesson_cards_pack_idx on public.lesson_cards (pack_id, position);

-- ─────────────────────────────────────────────────────────────
-- 방에 넣은 사본: 그룹 / 카드
-- ─────────────────────────────────────────────────────────────
create table if not exists public.room_lesson_groups (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  source_pack_id uuid, -- 출처 표시용. 라이브러리 묶음이 지워져도 남도록 FK를 두지 않아요.
  title text not null check (char_length(title) between 1 and 60),
  intro text not null default '' check (char_length(intro) <= 300),
  categories text[] not null default '{}' check (cardinality(categories) <= 20),
  position int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists room_lesson_groups_room_idx on public.room_lesson_groups (room_id, position);

create table if not exists public.room_lesson_cards (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  group_id uuid not null references public.room_lesson_groups (id) on delete cascade,
  kind text not null check (kind in ('link', 'copy')),
  name text not null check (char_length(name) between 1 and 80),
  org text check (char_length(org) <= 40),
  description text not null default '' check (char_length(description) <= 200),
  url text check (char_length(url) <= 2000),
  body text check (char_length(body) <= 20000),
  icon text not null check (char_length(icon) between 1 and 16),
  color text not null check (color in ('indigo', 'coral', 'purple', 'green', 'blue', 'orange', 'slate', 'red')),
  category text check (char_length(category) <= 30),
  position int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'link' and url ~* '^https?://') or (kind = 'copy' and body is not null and char_length(body) >= 1))
);
create index if not exists room_lesson_cards_room_idx on public.room_lesson_cards (room_id, position);
create index if not exists room_lesson_cards_group_idx on public.room_lesson_cards (group_id, position);

drop trigger if exists lesson_packs_touch on public.lesson_packs;
create trigger lesson_packs_touch before update on public.lesson_packs
  for each row execute function public.tg_touch_updated_at();
drop trigger if exists lesson_cards_touch on public.lesson_cards;
create trigger lesson_cards_touch before update on public.lesson_cards
  for each row execute function public.tg_touch_updated_at();
drop trigger if exists room_lesson_cards_touch on public.room_lesson_cards;
create trigger room_lesson_cards_touch before update on public.room_lesson_cards
  for each row execute function public.tg_touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- RLS (쓰기 정책 없음 → 서버만 써요)
-- ─────────────────────────────────────────────────────────────
alter table public.lesson_packs enable row level security;
alter table public.lesson_cards enable row level security;
alter table public.room_lesson_groups enable row level security;
alter table public.room_lesson_cards enable row level security;

drop policy if exists "lesson_packs: owner read" on public.lesson_packs;
create policy "lesson_packs: owner read" on public.lesson_packs for select to authenticated
  using (owner_id = auth.uid() and coalesce(auth.jwt() ->> 'tk_kind', '') <> 'participant' and public.is_approved_instructor());

drop policy if exists "lesson_packs: public read" on public.lesson_packs;
create policy "lesson_packs: public read" on public.lesson_packs for select to authenticated
  using (owner_id is null and is_published and coalesce(auth.jwt() ->> 'tk_kind', '') <> 'participant' and public.is_approved_instructor());

drop policy if exists "lesson_cards: pack read" on public.lesson_cards;
create policy "lesson_cards: pack read" on public.lesson_cards for select to authenticated
  using (
    coalesce(auth.jwt() ->> 'tk_kind', '') <> 'participant'
    and public.is_approved_instructor()
    and exists (
      select 1 from public.lesson_packs p
      where p.id = pack_id and (p.owner_id = auth.uid() or (p.owner_id is null and p.is_published))
    )
  );

drop policy if exists "room_lesson_groups: owner read" on public.room_lesson_groups;
create policy "room_lesson_groups: owner read" on public.room_lesson_groups for select to authenticated
  using (public.is_room_owner(room_id));

drop policy if exists "room_lesson_cards: owner read" on public.room_lesson_cards;
create policy "room_lesson_cards: owner read" on public.room_lesson_cards for select to authenticated
  using (public.is_room_owner(room_id));

-- ─────────────────────────────────────────────────────────────
-- 관리자 감사 로그: 공용 교안 작업 추가
-- ─────────────────────────────────────────────────────────────
alter table public.admin_audit_logs drop constraint if exists admin_audit_logs_action_check;
alter table public.admin_audit_logs add constraint admin_audit_logs_action_check check (action in (
  'instructor.approve', 'instructor.reject', 'instructor.suspend', 'instructor.unsuspend',
  'instructor.grant_admin', 'instructor.revoke_admin', 'room.end', 'room.delete',
  'lesson.create', 'lesson.update', 'lesson.publish', 'lesson.unpublish', 'lesson.delete', 'lesson.reorder',
  'lesson.card_create', 'lesson.card_update', 'lesson.card_delete', 'lesson.import'
));
alter table public.admin_audit_logs drop constraint if exists admin_audit_logs_target_type_check;
alter table public.admin_audit_logs add constraint admin_audit_logs_target_type_check
  check (target_type in ('instructor', 'room', 'lesson_pack'));
