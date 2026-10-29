-- 톡클(TokClass) 초기 스키마
-- 모든 앱 쓰기는 Next.js 서버(service role)가 세션을 검증한 뒤 수행합니다.
-- RLS는 모든 테이블에 켜고, 강사 본인 데이터 읽기 정책만 방어적으로 둡니다.

-- ─────────────────────────────────────────────────────────────
-- 방 / 템플릿
-- ─────────────────────────────────────────────────────────────
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  starts_at timestamptz,
  capacity int not null default 100 check (capacity between 1 and 100),
  template text not null default 'lecture' check (template in ('lecture', 'practice', 'workshop', 'custom')),
  join_code char(6) not null check (join_code ~ '^[0-9]{6}$'),
  status text not null default 'active' check (status in ('active', 'ended')),
  locked boolean not null default false,
  focus_mode boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  current_material_id uuid,
  current_page int not null default 1,
  readonly_token text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- 진행 중인 방끼리 참여코드 중복 금지
create unique index rooms_active_join_code_key on public.rooms (join_code) where status = 'active';
create index rooms_owner_idx on public.rooms (owner_id, created_at desc);
create index rooms_join_code_idx on public.rooms (join_code);

create table public.room_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  base_template text not null default 'custom',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index room_templates_owner_idx on public.room_templates (owner_id);

-- ─────────────────────────────────────────────────────────────
-- 조 / 참여자 / 로그인 시도
-- ─────────────────────────────────────────────────────────────
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index groups_room_idx on public.groups (room_id, position);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 12),
  password_hmac text not null,
  session_version int not null default 1,
  kicked boolean not null default false,
  group_id uuid references public.groups (id) on delete set null,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index participants_room_nickname_key on public.participants (room_id, lower(nickname));
create unique index participants_room_password_key on public.participants (room_id, password_hmac);
create index participants_room_idx on public.participants (room_id, created_at);

create table public.login_attempts (
  room_id uuid not null references public.rooms (id) on delete cascade,
  key text not null,
  failed_count int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (room_id, key)
);

-- ─────────────────────────────────────────────────────────────
-- 소통: 채팅 / 공지 / 1:1 / Q&A
-- ─────────────────────────────────────────────────────────────
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  group_id uuid references public.groups (id) on delete cascade,
  participant_id uuid references public.participants (id) on delete cascade, -- null = 강사
  body text not null default '' check (char_length(body) <= 2000),
  image_path text,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_room_idx on public.messages (room_id, created_at desc);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index announcements_room_idx on public.announcements (room_id, created_at desc);

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  from_instructor boolean not null,
  body text not null check (char_length(body) between 1 and 1000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index direct_messages_idx on public.direct_messages (room_id, participant_id, created_at);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  storage_path text not null,
  page_count int not null default 0,
  size_bytes bigint not null default 0,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index materials_room_idx on public.materials (room_id, position);

alter table public.rooms
  add constraint rooms_current_material_fk foreign key (current_material_id) references public.materials (id) on delete set null;

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  participant_id uuid references public.participants (id) on delete cascade,
  anonymous boolean not null default true,
  body text not null check (char_length(body) between 1 and 500),
  material_id uuid references public.materials (id) on delete set null,
  page int,
  answer text check (char_length(answer) <= 1000),
  answered boolean not null default false,
  hidden boolean not null default false,
  vote_count int not null default 0,
  source text not null default 'qa' check (source in ('qa', 'chat')),
  created_at timestamptz not null default now()
);
create index questions_room_idx on public.questions (room_id, vote_count desc, created_at desc);
create index questions_page_idx on public.questions (room_id, material_id, page);

create table public.question_votes (
  question_id uuid not null references public.questions (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (question_id, participant_id)
);

-- ─────────────────────────────────────────────────────────────
-- 교안: 자료실 / 페이지 반응 / 메모
-- ─────────────────────────────────────────────────────────────
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  kind text not null check (kind in ('file', 'link')),
  title text not null check (char_length(title) between 1 and 100),
  url text,
  storage_path text,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);
create index resources_room_idx on public.resources (room_id, created_at);

create table public.page_reactions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  page int not null,
  participant_id uuid references public.participants (id) on delete cascade,
  emoji text not null check (char_length(emoji) <= 8),
  created_at timestamptz not null default now()
);
create index page_reactions_idx on public.page_reactions (room_id, material_id, page);

create table public.notes (
  participant_id uuid not null references public.participants (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  page int not null,
  room_id uuid not null references public.rooms (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (participant_id, material_id, page)
);

-- ─────────────────────────────────────────────────────────────
-- 이해도 / 도움 요청
-- ─────────────────────────────────────────────────────────────
create table public.understanding_current (
  room_id uuid not null references public.rooms (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  status text not null check (status in ('green', 'yellow', 'red')),
  updated_at timestamptz not null default now(),
  primary key (room_id, participant_id)
);

create table public.understanding_events (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.rooms (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  status text not null check (status in ('green', 'yellow', 'red')),
  created_at timestamptz not null default now()
);
create index understanding_events_idx on public.understanding_events (room_id, created_at);

create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  message text not null default '' check (char_length(message) <= 200),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index help_requests_idx on public.help_requests (room_id, status, created_at);
-- 한 사람당 열린 요청은 하나
create unique index help_requests_open_key on public.help_requests (room_id, participant_id) where status = 'open';

-- ─────────────────────────────────────────────────────────────
-- 활동
-- ─────────────────────────────────────────────────────────────
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  type text not null check (type in ('poll', 'wordcloud', 'quiz', 'ranking', 'open', 'ideas', 'task')),
  title text not null check (char_length(title) between 1 and 200),
  config jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'live', 'ended')),
  position int not null default 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index activities_room_idx on public.activities (room_id, position, created_at);

create table public.activity_responses (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  data jsonb not null,
  score int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id, participant_id)
);
create index activity_responses_room_idx on public.activity_responses (room_id);

create table public.idea_notes (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  participant_id uuid references public.participants (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 200),
  color text not null default 'yellow',
  like_count int not null default 0,
  created_at timestamptz not null default now()
);
create index idea_notes_idx on public.idea_notes (activity_id, created_at);

create table public.idea_likes (
  idea_id uuid not null references public.idea_notes (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  primary key (idea_id, participant_id)
);

-- ─────────────────────────────────────────────────────────────
-- 산출물
-- ─────────────────────────────────────────────────────────────
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  group_id uuid references public.groups (id) on delete set null,
  section text check (char_length(section) <= 30),
  participant_id uuid references public.participants (id) on delete cascade, -- null = 강사
  kind text not null check (kind in ('image', 'file', 'link', 'text')),
  title text not null default '' check (char_length(title) <= 100),
  body text not null default '' check (char_length(body) <= 3000),
  url text,
  storage_path text,
  file_name text,
  mime text,
  size_bytes bigint not null default 0,
  is_best boolean not null default false,
  hidden boolean not null default false,
  sticker_count int not null default 0,
  comment_count int not null default 0,
  created_at timestamptz not null default now()
);
create index submissions_room_idx on public.submissions (room_id, created_at desc);

create table public.submission_comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  participant_id uuid references public.participants (id) on delete cascade, -- null = 강사
  body text not null check (char_length(body) between 1 and 500),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index submission_comments_idx on public.submission_comments (submission_id, created_at);

create table public.submission_stickers (
  submission_id uuid not null references public.submissions (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  actor_key text not null, -- participant_id 또는 'instructor'
  participant_id uuid references public.participants (id) on delete cascade,
  sticker text not null check (char_length(sticker) <= 8),
  created_at timestamptz not null default now(),
  primary key (submission_id, actor_key, sticker)
);

-- ─────────────────────────────────────────────────────────────
-- AI 사용량
-- ─────────────────────────────────────────────────────────────
create table public.ai_usage (
  room_id uuid not null references public.rooms (id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (room_id, day)
);

-- ─────────────────────────────────────────────────────────────
-- 카운터 트리거
-- ─────────────────────────────────────────────────────────────
create function public.tg_question_vote_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.questions set vote_count = vote_count + 1 where id = new.question_id;
  else
    update public.questions set vote_count = greatest(vote_count - 1, 0) where id = old.question_id;
  end if;
  return null;
end $$;
create trigger question_votes_count after insert or delete on public.question_votes
  for each row execute function public.tg_question_vote_count();

create function public.tg_idea_like_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.idea_notes set like_count = like_count + 1 where id = new.idea_id;
  else
    update public.idea_notes set like_count = greatest(like_count - 1, 0) where id = old.idea_id;
  end if;
  return null;
end $$;
create trigger idea_likes_count after insert or delete on public.idea_likes
  for each row execute function public.tg_idea_like_count();

create function public.tg_submission_counts() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'submission_stickers' then
    if tg_op = 'INSERT' then
      update public.submissions set sticker_count = sticker_count + 1 where id = new.submission_id;
    else
      update public.submissions set sticker_count = greatest(sticker_count - 1, 0) where id = old.submission_id;
    end if;
  else
    if tg_op = 'INSERT' then
      update public.submissions set comment_count = comment_count + 1 where id = new.submission_id;
    else
      update public.submissions set comment_count = greatest(comment_count - 1, 0) where id = old.submission_id;
    end if;
  end if;
  return null;
end $$;
create trigger submission_stickers_count after insert or delete on public.submission_stickers
  for each row execute function public.tg_submission_counts();
create trigger submission_comments_count after insert or delete on public.submission_comments
  for each row execute function public.tg_submission_counts();

create function public.tg_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger rooms_touch before update on public.rooms
  for each row execute function public.tg_touch_updated_at();

-- AI 일일 한도: 원자적으로 1 증가시키고, 한도를 넘으면 증가하지 않고 false
create function public.consume_ai_quota(p_room uuid, p_limit int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_count int;
begin
  insert into public.ai_usage (room_id, day, count) values (p_room, (now() at time zone 'Asia/Seoul')::date, 0)
    on conflict (room_id, day) do nothing;
  update public.ai_usage set count = count + 1
    where room_id = p_room and day = (now() at time zone 'Asia/Seoul')::date and count < p_limit
    returning count into v_count;
  return v_count is not null;
end $$;
revoke execute on function public.consume_ai_quota(uuid, int) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
-- 강사 본인 소유 방인지 (수강생용 Realtime JWT는 tk_kind=participant 라서 항상 false)
create function public.is_room_owner(p_room uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'tk_kind', '') <> 'participant'
    and exists (select 1 from public.rooms r where r.id = p_room and r.owner_id = auth.uid());
$$;

alter table public.rooms enable row level security;
alter table public.room_templates enable row level security;
alter table public.groups enable row level security;
alter table public.participants enable row level security;
alter table public.login_attempts enable row level security;
alter table public.messages enable row level security;
alter table public.announcements enable row level security;
alter table public.direct_messages enable row level security;
alter table public.materials enable row level security;
alter table public.questions enable row level security;
alter table public.question_votes enable row level security;
alter table public.resources enable row level security;
alter table public.page_reactions enable row level security;
alter table public.notes enable row level security;
alter table public.understanding_current enable row level security;
alter table public.understanding_events enable row level security;
alter table public.help_requests enable row level security;
alter table public.activities enable row level security;
alter table public.activity_responses enable row level security;
alter table public.idea_notes enable row level security;
alter table public.idea_likes enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_comments enable row level security;
alter table public.submission_stickers enable row level security;
alter table public.ai_usage enable row level security;

create policy "rooms: owner read" on public.rooms for select to authenticated
  using (owner_id = auth.uid() and coalesce(auth.jwt() ->> 'tk_kind', '') <> 'participant');
create policy "room_templates: owner read" on public.room_templates for select to authenticated
  using (owner_id = auth.uid() and coalesce(auth.jwt() ->> 'tk_kind', '') <> 'participant');

-- 방 단위 테이블: 방 주인(강사)만 읽기
do $$
declare t text;
begin
  foreach t in array array[
    'groups', 'participants', 'messages', 'announcements', 'direct_messages', 'materials', 'questions',
    'resources', 'page_reactions', 'understanding_current', 'understanding_events', 'help_requests',
    'activities', 'activity_responses', 'idea_notes', 'submissions', 'submission_comments', 'submission_stickers'
  ] loop
    execute format('create policy "%1$s: owner read" on public.%1$I for select to authenticated using (public.is_room_owner(room_id))', t);
  end loop;
end $$;
-- notes(개인 메모), login_attempts, ai_usage, question_votes, idea_likes: 정책 없음 → 서버(service role)만 접근

-- 참여자 비밀번호 HMAC은 강사도 볼 필요가 없어요
revoke select on public.participants from anon, authenticated;
grant select (id, room_id, nickname, session_version, kicked, group_id, last_active_at, created_at)
  on public.participants to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Realtime Authorization (private 채널 `room:{roomId}`)
-- ─────────────────────────────────────────────────────────────
create function public.can_join_room_topic(p_topic text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_room uuid;
  v_claims jsonb := auth.jwt();
begin
  if p_topic is null or p_topic !~ '^room:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  v_room := substring(p_topic from 6)::uuid;

  if v_claims ->> 'tk_kind' = 'participant' then
    return (v_claims ->> 'tk_room') = v_room::text
      and exists (
        select 1 from public.participants p
        where p.id = (v_claims ->> 'sub')::uuid
          and p.room_id = v_room
          and not p.kicked
          and p.session_version = coalesce((v_claims ->> 'tk_sv')::int, -1)
      );
  end if;

  return exists (select 1 from public.rooms r where r.id = v_room and r.owner_id = auth.uid());
end $$;

create policy "tokclass: room members receive" on realtime.messages for select to authenticated
  using (public.can_join_room_topic(realtime.topic()));

-- 강사는 broadcast·presence 모두, 수강생은 presence만 보낼 수 있어요.
create policy "tokclass: instructors broadcast, participants presence" on realtime.messages for insert to authenticated
  with check (
    public.can_join_room_topic(realtime.topic())
    and (coalesce(auth.jwt() ->> 'tk_kind', '') <> 'participant' or realtime.messages.extension = 'presence')
  );

-- ─────────────────────────────────────────────────────────────
-- Storage 버킷 (비공개, 서명 URL로만 업로드/다운로드)
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('materials', 'materials', false, 31457280, array['application/pdf']),
  ('uploads', 'uploads', false, 10485760, array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain', 'text/csv', 'application/zip', 'application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword', 'application/vnd.ms-powerpoint', 'application/vnd.ms-excel',
    'application/x-hwp', 'application/haansofthwp', 'application/vnd.hancom.hwp', 'application/vnd.hancom.hwpx',
    'application/octet-stream'
  ])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
-- storage.objects에는 정책을 두지 않아요: 서버가 service role로 발급한 서명 URL만 동작합니다.
