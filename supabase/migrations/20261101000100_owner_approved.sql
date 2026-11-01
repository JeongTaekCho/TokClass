-- 정지·거절·승인 대기 강사는 Supabase에 직접 접근해도 자기 방 데이터를 읽거나 방 채널에 들어갈 수 없어요.
-- (앱 API는 이미 승인 여부를 확인해요. 이건 RLS·Realtime 쪽 구멍을 막는 거예요.)

create or replace function public.is_approved_instructor() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.instructor_profiles ip where ip.user_id = auth.uid() and ip.status = 'approved');
$$;

create or replace function public.is_room_owner(p_room uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'tk_kind', '') <> 'participant'
    and exists (select 1 from public.rooms r where r.id = p_room and r.owner_id = auth.uid())
    and public.is_approved_instructor();
$$;

create or replace function public.can_join_room_topic(p_topic text) returns boolean
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

  return exists (select 1 from public.rooms r where r.id = v_room and r.owner_id = auth.uid())
    and public.is_approved_instructor();
end $$;

-- ─────────────────────────────────────────────────────────────
-- 요청 횟수 제한 (서버리스라 인스턴스 메모리 대신 DB 카운터를 써요)
-- 키 예: "join-miss:ip:<hash>", "react:<participant>". 고정 창(window) 방식이에요.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits int not null default 0
);
create index if not exists rate_limits_window_idx on public.rate_limits (window_start);
alter table public.rate_limits enable row level security; -- 정책 없음: 서버(service role)만 접근

-- 한 번 세고, 한도를 넘었으면 다시 시도할 수 있을 때까지 남은 초를 돌려줘요 (넘지 않았으면 0).
create or replace function public.hit_rate_limit(p_key text, p_window_sec int, p_max int) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_start timestamptz;
  v_hits int;
begin
  insert into public.rate_limits as r (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case when r.window_start <= now() - make_interval(secs => p_window_sec) then now() else r.window_start end,
    hits = case when r.window_start <= now() - make_interval(secs => p_window_sec) then 1 else r.hits + 1 end
  returning window_start, hits into v_start, v_hits;
  if v_hits > p_max then
    return greatest(1, ceil(extract(epoch from (v_start + make_interval(secs => p_window_sec) - now())))::int);
  end if;
  return 0;
end $$;
revoke execute on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
