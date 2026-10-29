-- 톡클 로컬 개발용 데모 데이터
-- 데모 강사: demo@tokclass.dev / tokclass1234
-- 데모 방 참여코드: 123456
-- 데모 수강생 비밀번호(로컬 PARTICIPANT_PASSWORD_SECRET='tokclass-local-dev-password-secret' 기준):
--   민지 → TKCP23, 하나 → HANA27

do $$
declare
  v_user uuid := '11111111-1111-4111-8111-111111111111';
  v_room uuid := '22222222-2222-4222-8222-222222222222';
  v_secret text := 'tokclass-local-dev-password-secret';
  v_p1 uuid := '33333333-3333-4333-8333-333333333331';
  v_p2 uuid := '33333333-3333-4333-8333-333333333332';
  v_poll uuid := '44444444-4444-4444-8444-444444444441';
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated', 'demo@tokclass.dev',
    extensions.crypt('tokclass1234', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"name":"데모 강사"}', now(), now(),
    '', '', '', ''
  ) on conflict (id) do nothing;

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), v_user, v_user::text,
    jsonb_build_object('sub', v_user::text, 'email', 'demo@tokclass.dev', 'email_verified', true),
    'email', now(), now(), now()
  ) on conflict do nothing;

  insert into public.rooms (id, owner_id, title, starts_at, capacity, template, join_code, settings)
  values (
    v_room, v_user, '생성형 AI 실무 활용 1회차 (데모)', now(), 100, 'practice', '123456',
    '{
      "tabs": [
        {"key": "slides", "enabled": true},
        {"key": "board", "enabled": true},
        {"key": "chat", "enabled": true},
        {"key": "qa", "enabled": true},
        {"key": "resources", "enabled": true}
      ],
      "defaultTab": "slides",
      "qaRevealAuthor": false,
      "redThreshold": 30,
      "aiDailyLimit": 20,
      "sections": ["1주차"],
      "groups": {"active": false, "mode": "random"}
    }'::jsonb
  ) on conflict (id) do nothing;

  insert into public.participants (id, room_id, nickname, password_hmac) values
    (v_p1, v_room, '민지', encode(extensions.hmac(v_room::text || ':' || 'TKCP23', v_secret, 'sha256'), 'hex')),
    (v_p2, v_room, '하나', encode(extensions.hmac(v_room::text || ':' || 'HANA27', v_secret, 'sha256'), 'hex'))
  on conflict do nothing;

  insert into public.announcements (room_id, body) values
    (v_room, '오늘 실습 자료는 자료실에 있어요. 쉬는 시간은 15:00에 가질게요!');

  insert into public.messages (room_id, participant_id, body, created_at) values
    (v_room, null, '안녕하세요! 오늘 수업에 오신 걸 환영해요 👋', now() - interval '20 minutes'),
    (v_room, v_p1, '안녕하세요~ 잘 부탁드려요!', now() - interval '19 minutes'),
    (v_room, v_p2, '프롬프트 예시는 어디서 볼 수 있나요?', now() - interval '18 minutes');

  insert into public.questions (room_id, participant_id, anonymous, body, created_at) values
    (v_room, v_p1, true, '프롬프트를 길게 쓰면 결과가 더 좋아지나요?', now() - interval '15 minutes'),
    (v_room, v_p2, false, '회사 문서를 넣어도 보안상 괜찮을까요?', now() - interval '12 minutes'),
    (v_room, v_p1, true, '긴 프롬프트가 항상 더 나은 결과를 내나요?', now() - interval '10 minutes');

  insert into public.resources (room_id, kind, title, url) values
    (v_room, 'link', '실습 센터 바로가기', 'https://example.com/lab'),
    (v_room, 'link', '프롬프트 예시 모음', 'https://example.com/prompts');

  insert into public.activities (id, room_id, type, title, config, position) values
    (v_poll, v_room, 'poll', '오늘 수업에서 가장 기대되는 것은?',
      '{"options": ["프롬프트 작성법", "업무 자동화", "이미지 생성", "보안·윤리"], "multiple": false, "reveal": "live"}', 0),
    (gen_random_uuid(), v_room, 'wordcloud', 'AI 하면 떠오르는 단어를 적어 주세요', '{"maxWords": 3}', 1),
    (gen_random_uuid(), v_room, 'quiz', '다음 중 좋은 프롬프트의 특징은?',
      '{"options": ["모호하게 쓴다", "역할과 목표를 분명히 한다", "최대한 짧게 쓴다"], "correct": [1], "timeLimitSec": 30, "points": 100, "leaderboard": true}', 2),
    (gen_random_uuid(), v_room, 'task', '실습 1: 나만의 업무 프롬프트 만들기',
      '{"description": "업무 하나를 골라 역할·목표·형식이 들어간 프롬프트를 작성하고 산출물 보드에 올려 주세요.", "durationSec": 600}', 3),
    (gen_random_uuid(), v_room, 'ideas', 'AI로 바꾸고 싶은 우리 팀 업무는?', '{}', 4);

  insert into public.understanding_current (room_id, participant_id, status) values
    (v_room, v_p1, 'green'), (v_room, v_p2, 'yellow');
  insert into public.understanding_events (room_id, participant_id, status, created_at) values
    (v_room, v_p1, 'green', now() - interval '14 minutes'),
    (v_room, v_p2, 'red', now() - interval '13 minutes'),
    (v_room, v_p2, 'yellow', now() - interval '6 minutes');

  insert into public.submissions (room_id, participant_id, kind, title, body, section) values
    (v_room, v_p1, 'text', '회의록 요약 프롬프트', '너는 꼼꼼한 비서야. 아래 회의록을 3줄 요약하고 할 일을 표로 정리해 줘.', '1주차'),
    (v_room, v_p2, 'link', '참고한 가이드', '', '1주차');
  update public.submissions set url = 'https://example.com/guide' where room_id = v_room and kind = 'link';
end $$;
