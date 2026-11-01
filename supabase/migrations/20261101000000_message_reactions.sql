-- 채팅 메시지 이모지 반응
-- 한 사람(수강생 또는 강사)이 한 메시지에 같은 이모지를 한 번만 누를 수 있어요. 다시 누르면 취소돼요.
-- 메시지가 지워지면(방 초기화 포함) 반응도 함께 지워져요.

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  participant_id uuid references public.participants (id) on delete cascade, -- null = 강사
  emoji text not null check (char_length(emoji) <= 8),
  created_at timestamptz not null default now()
);

-- 강사(participant_id null)도 한 번만 누르도록 null을 고정 값으로 바꿔 유일성을 검사해요.
create unique index if not exists message_reactions_unique_idx
  on public.message_reactions (message_id, coalesce(participant_id, '00000000-0000-0000-0000-000000000000'::uuid), emoji);
create index if not exists message_reactions_room_idx on public.message_reactions (room_id, message_id);

alter table public.message_reactions enable row level security;

drop policy if exists "message_reactions: owner read" on public.message_reactions;
create policy "message_reactions: owner read" on public.message_reactions
  for select to authenticated using (public.is_room_owner(room_id));
