# 톡클(TokClass) 아키텍처

이 문서는 MVP의 데이터 모델, 폴더 구조, 인증·권한, 실시간 이벤트 설계를 정리합니다.

## 1. 큰 그림

```
브라우저 (강사 / 수강생 / 읽기 전용)
   │  HTTPS (fetch, SWR)                    │  WebSocket 1개 (Supabase Realtime)
   ▼                                        ▼
Next.js 16 (Vercel 서버리스)          Supabase Realtime  ── private 채널 `room:{roomId}`
   │  Route Handlers / Server Actions        ▲   (Broadcast + Presence, RLS로 구독 권한 확인)
   │  - 세션 검증 (강사: Supabase Auth,       │
   │    수강생: 서명 쿠키)                   │  HTTP Broadcast API (service role)
   │  - zod 검증 → DB 쓰기 ──────────────────┘
   ▼
Supabase Postgres (RLS 활성) + Storage (서명 URL 업로드/다운로드)
```

- **쓰기 경로**: 모든 쓰기는 Next.js Route Handler가 세션을 검증한 뒤 service role 클라이언트로 DB에 기록하고, 필요한 이벤트를 Realtime HTTP Broadcast API로 방 채널에 보냅니다. 서버는 WebSocket을 열지 않습니다.
- **읽기 경로**: 화면은 Route Handler(`/api/rooms/[roomId]/...`)에서 데이터를 받아오고(SWR), 실시간 이벤트를 받으면 캐시를 갱신하거나 다시 조회합니다.
- **파일**: 서버는 Storage 서명 업로드 URL만 발급하고, 브라우저가 Storage로 직접 업로드합니다. 다운로드도 서명 URL(1시간)을 씁니다.

## 2. 폴더 구조

```
src/
  app/
    page.tsx                       랜딩 (강사 시작 / 수업 참여)
    login/ signup/                 강사 인증 (Server Actions)
    dashboard/                     내 방 목록, 새 방, 템플릿
    rooms/[id]/
      settings/ live/ participants/ groups/ report/
    join/ join/[code]/             수강생 입장
    r/[code]/  r/[code]/review/    수강생 메인 / 복습
    view/[token]/                  읽기 전용
    api/
      join/...                     입장(코드 확인, 새로 참여, 비밀번호, 자동 재입장)
      rooms/[roomId]/...           방 단위 API (채팅, Q&A, 교안, 활동, 산출물 ...)
      view/[token]/                읽기 전용 데이터
  components/
    ui/                            shadcn/ui 컴포넌트
    brand/                         로고
    room/                          강사·수강생 공용 (채팅, 교안 뷰어, Q&A ...)
    instructor/                    강사 전용 패널
    student/                       수강생 전용 화면
  lib/
    supabase/                      server(SSR) · admin(service role) · browser 클라이언트
    auth/                          수강생 비밀번호·세션·시도 제한, actor 판별
    realtime/                      이벤트 타입, 서버 broadcast, 클라이언트 Provider
    validation/                    zod 스키마 (서버·클라이언트 공용)
    ai/                            LLM 공급자 추상화, 질문 묶기
    report/                        리포트 집계 함수
supabase/
  migrations/*.sql                 스키마·RLS·Storage·Realtime 권한
  seed.sql                         데모 데이터
tests/
  unit/                            Vitest
  e2e/                             Playwright
```

## 3. 데이터 모델 (ERD)

```
auth.users (강사)
  │1
  ├──< rooms ──────────────┬──< participants ──< login_attempts(room_id, key)
  │     │                   │        │
  │     │                   │        ├──< messages (group_id?)            채팅
  │     │                   │        ├──< direct_messages                 1:1
  │     │                   │        ├──< questions ──< question_votes    익명 Q&A
  │     │                   │        ├──< notes (material, page)          개인 메모
  │     │                   │        ├──< page_reactions                  페이지 이모지 핀
  │     │                   │        ├──  understanding_current / understanding_events
  │     │                   │        ├──< help_requests
  │     │                   │        ├──< activity_responses / idea_notes / idea_likes
  │     │                   │        └──< submissions ──< submission_comments / submission_stickers
  │     ├──< announcements
  │     ├──< materials (PDF)          ├──< resources (파일/링크)
  │     ├──< activities               ├──< groups
  │     └──< ai_usage (day)
  └──< room_templates
```

| 테이블 | 핵심 컬럼 | 비고 |
|---|---|---|
| rooms | owner_id, title, starts_at, capacity(≤100), template, join_code, status(active/ended), locked, focus_mode, settings(jsonb), current_material_id, current_page, readonly_token | `join_code`는 `status='active'`인 방끼리 partial unique |
| room_templates | owner_id, name, base_template, settings | 내 방을 템플릿으로 저장 |
| participants | room_id, nickname, password_hmac, session_version, kicked, group_id, last_active_at | unique(room_id, lower(nickname)), unique(room_id, password_hmac) |
| login_attempts | room_id, key, failed_count, locked_until | 비밀번호 시도 제한 (기기 키 5회·IP 키 20회) |
| messages | room_id, group_id, participant_id(null=강사), body, image_path, hidden | 전체/조 채팅 |
| announcements | room_id, body | 상단 고정 공지 |
| direct_messages | room_id, participant_id, from_instructor, body | 강사 ↔ 수강생 1:1 |
| questions | room_id, participant_id, anonymous, body, material_id, page, answer, answered, hidden, vote_count | 익명 Q&A, 페이지 질문 핀 겸용 |
| question_votes | question_id, participant_id | 공감(👍) |
| materials | room_id, title, storage_path, page_count, position | 교안 PDF |
| resources | room_id, kind(file/link), title, url, storage_path | 자료실 |
| page_reactions | room_id, material_id, page, participant_id, emoji | 페이지별 이모지 핀 |
| notes | participant_id, material_id, page, body | 본인만 |
| understanding_current | room_id, participant_id, status(green/yellow/red) | 현재 상태 |
| understanding_events | room_id, participant_id, status, created_at | 리포트 추이용 이력 |
| help_requests | room_id, participant_id, message, status(open/resolved) | 손들기 대기열 |
| activities | room_id, type, title, config(jsonb), status(draft/live/ended), started_at, ended_at | poll/wordcloud/quiz/ranking/open/ideas/task |
| activity_responses | activity_id, participant_id, data(jsonb), score | 1인 1응답 (재응답 시 갱신) |
| idea_notes / idea_likes | activity_id, participant_id, body, color | 아이디어 보드 |
| submissions | room_id, group_id, section, participant_id, kind(image/file/link/text), title, body, url, storage_path, is_best, hidden | 산출물 |
| submission_comments / submission_stickers | submission_id, participant_id(null=강사), body / sticker | 피드백 |
| groups | room_id, name, position | 조. `rooms.settings.groups.active`가 켜지면 조 모드 |
| ai_usage | room_id, day, count | AI 일일 한도 |

**rooms.settings (jsonb)**

```jsonc
{
  "tabs": [{ "key": "slides", "enabled": true }, ...], // 순서 = 탭 순서
  "defaultTab": "slides",
  "qaRevealAuthor": false,     // 강사가 익명 질문 작성자 확인
  "redThreshold": 30,          // 🔴 강조 기준(%)
  "aiDailyLimit": 20,
  "sections": ["1조", "2조"],   // 산출물 보드 섹션
  "groups": { "active": false, "mode": "random" } // random | manual | choice
}
```

## 4. 인증과 권한

### 강사
Supabase Auth(이메일+비밀번호). 인증·비밀번호 재설정 메일 링크는 `/auth/callback`에서 세션으로 바꿔요. `@supabase/ssr`로 쿠키 세션을 쓰고 `src/proxy.ts`에서 세션을 갱신합니다. Route Handler에서는 `auth.getUser()`로 확인한 뒤 `rooms.owner_id`와 비교합니다.

### 강사 승인 게이트와 관리자
- `instructor_profiles(user_id, email, name, status, status_reason, is_admin, created_at, reviewed_at, reviewed_by)`. 가입 시 `auth.users` AFTER INSERT 트리거가 `pending` 행을 만들어요. `reviewed_by`에는 처리한 관리자 user_id(또는 `bootstrap`/`migration`)를 텍스트로 넣어요.
- 상태 전이 규칙은 `src/lib/admin/rules.ts`(순수 함수, Vitest)에 있고 서버 API와 화면 버튼이 같은 규칙을 써요.
- 헬퍼 (`src/lib/supabase/server.ts`): `getInstructor()`(로그인만) · `getInstructorAccess()`(+프로필, 요청 단위 cache) · `getApprovedInstructor()` · `getAdmin()` · 페이지용 `requireApprovedInstructor(next)`(→ `/login` 또는 `/pending`) · `requireAdmin()`(일반 강사는 404). API는 `instructorHandler` / `adminHandler`(`src/lib/api/handler.ts`), 방 API는 `resolveActor`가 승인된 강사만 instructor로 인정해요.
- `proxy.ts`는 사용자 세션으로 본인 프로필(RLS `self read`)을 읽어 승인 상태가 아니면 `/pending`으로 보내는 **낙관적 확인**만 해요. 행을 못 읽으면 판단하지 않고 페이지의 서버 확인에 맡겨요(리다이렉트 반복 방지).
- 정지·거절된 강사의 방: `isRoomOwnerBlocked()`로 입장 API(`/api/join/*`), 입장 화면, `/r/[code]`, `/view/[token]`, `roomHandler`의 수강생 요청을 403(`room_suspended`)으로 막아요. 데이터는 보존해요. 이미 연결된 수강생은 다음 API 요청 또는 Realtime 토큰 갱신(최대 10분)에서 끊겨요.
- 관리자 작업은 모두 `admin_audit_logs(actor_id, actor_email, action, target_type, target_id, target_label, reason, meta, created_at)`에 남아요. RLS 정책이 없어 service role만 접근해요.

### 수강생 관리 (`/manage`)
- 승인된 강사 본인 방의 수강생만 다뤄요. `/api/manage/*`는 `instructorHandler` + `ownedRoomIds()`로, 개별 작업은 기존 방 API(`/api/rooms/[roomId]/participants/[pid]`, `roomHandler` 방 주인 확인)를 재사용해요.
- 작업 로직은 `src/lib/manage/participants.ts`에 모아 방별 화면·통합 화면·일괄 작업이 같은 코드를 써요. 강퇴·강제 로그아웃·재발급은 `session_version`을 올리고 `participant.session`(reason `kicked`/`signed_out`/`reissued`)을 보내요.
- 여러 방의 접속 상태는 `useRoomsPresence()`가 진행 중인 방 채널을 구독만 하고(track 안 함) Presence를 모아서 보여줘요.
- PostgREST `max_rows`(1000)를 넘는 목록은 `fetchPaged()`로 나눠 받아요 (최대 3,000명).

### 수강생 (계정 없음)
- 참여코드 → 닉네임으로 새로 참여 → 서버가 `crypto.randomInt`로 비밀번호(대문자+숫자 6자리, 0/O/1/I/L 제외) 생성.
- DB에는 `HMAC-SHA256(PARTICIPANT_PASSWORD_SECRET, room_id + ":" + password)`만 저장. 비밀번호만으로 참여자를 찾을 수 있도록 (room_id, password_hmac) unique 인덱스로 조회합니다. 원문은 어디에도 저장하지 않습니다 (본인 브라우저 sessionStorage에만 보관해 "비밀번호 다시 보기"에 사용).
- 시도 제한: `login_attempts`에 (방, IP 해시)와 (방, 기기 ID 해시) 두 키로 실패 횟수를 기록. 기기 기준 5회, IP 기준 20회 연속 실패하면 1분 잠금(강의실은 여러 명이 같은 공인 IP를 쓰는 경우가 많아서). 성공 시 초기화.
- 세션: `tk_p_{roomId}` httpOnly·secure·sameSite=lax 쿠키에 HS256 서명 토큰 `{pid, rid, sv}`. 요청마다 participants에서 `session_version`과 `kicked`를 확인합니다. [이 기기 기억 안 함]을 고르면 브라우저 세션 쿠키(만료 없음)로 발급합니다.
- 1인 1접속: 비밀번호로 로그인하면 `session_version`을 1 올리고 `participant.session` 이벤트를 보냅니다. 이전 기기는 이벤트를 받아(또는 다음 요청에서 401) 연결을 끊고 입장 화면으로 이동합니다.
- 재발급: 강사가 재발급하면 새 HMAC 저장 + `session_version` 증가 → 기존 비밀번호·세션 즉시 무효.

### Actor 판별
`getActor(roomId)`는 (1) Supabase 사용자이고 방 주인이면 `instructor`, (2) 유효한 수강생 쿠키면 `participant`, 아니면 `null`을 돌려줍니다. 모든 API가 이걸로 권한을 확인한 뒤 service role로 DB에 접근합니다.

### RLS
- 모든 테이블 RLS 활성화. anon/authenticated에게는 강사 본인 소유 데이터 읽기 정책만 있고(방어용), 실제 앱은 서버에서 service role로만 접근합니다.
- service role 키는 `src/lib/supabase/admin.ts`(`server-only`)에서만 사용합니다.

## 5. 실시간 설계

### 채널
- 방 하나당 **private 채널 하나**: `room:{roomId}`. 수강생은 탭·컴포넌트가 몇 개든 `RealtimeProvider` 하나가 만든 채널 하나만 씁니다. 조 이벤트도 같은 채널에서 `groupId` 필드로 구분합니다.
- 정원 100명 × 연결 1개 + 강사 → 무료 플랜(동시 연결 약 200) 안에서 방 1~2개 동시 운영 가능.

### 구독 권한 (Supabase Realtime Authorization)
- `realtime.messages`에 RLS 정책을 둡니다.
  - **SELECT(수신·구독)**: `public.can_join_room_topic(realtime.topic())` — 강사면 방 주인인지, 수강생이면 JWT의 `tk_room`이 같고 강퇴되지 않았으며 `tk_sv`가 현재 `session_version`과 같은지 확인.
  - **INSERT(송신)**: 강사는 Broadcast·Presence 모두, 수강생은 **Presence만** 허용. 수강생이 가짜 이벤트(페이지 이동 등)를 보낼 수 없습니다. 수강생 행동은 전부 서버 API를 거쳐 서버가 broadcast합니다.
- 강사: Supabase Auth access token을 그대로 사용.
- 수강생: `/api/rooms/[roomId]/realtime-token`이 쿠키를 검증하고 **10분짜리 Supabase 호환 JWT**(HS256, `SUPABASE_JWT_SECRET`)를 발급합니다. 클레임: `sub=participant_id, role=authenticated, tk_kind=participant, tk_room, tk_sv`. 만료 전에 클라이언트가 재발급받아 `realtime.setAuth()`로 교체합니다. 강퇴·재발급되면 토큰 재발급이 거절되어 자연스럽게 끊깁니다.
- 이 토큰으로 PostgREST에 직접 접근해도, 일반 테이블 정책은 `rooms.owner_id = auth.uid()`만 허용하므로 수강생 JWT로는 아무 데이터도 읽을 수 없습니다.

### 이벤트 목록 (`src/lib/realtime/events.ts`)

| 이벤트 | 보낸 곳 | payload | 받는 쪽 동작 |
|---|---|---|---|
| `room.updated` | 서버 | 방 공개 설정 | 탭·집중 모드·잠금 반영 |
| `chat.message` | 서버 | 메시지 전체 (groupId 포함) | 목록에 추가 |
| `chat.hidden` | 서버 | `{id}` | 숨김 처리 |
| `announce.changed` | 서버 | 공지 | 상단 갱신 |
| `dm.new` | 서버 | `{participantId}` (내용 없음) | 해당 수강생/강사만 다시 조회 |
| `qa.changed` | 서버 | 공개용 질문(익명이면 작성자 제거) | 목록 갱신 |
| `slide.page` | 강사 클라이언트 | `{materialId, page}` | 따라가기 켠 수강생 이동 |
| `material.changed` | 서버 | `{}` | 교안 목록 재조회 |
| `reaction.float` | 서버 | `{emoji, materialId, page}` | 교안 위 떠오르는 효과 |
| `pins.changed` | 서버 | `{materialId}` | 강사 화면 페이지별 개수 재조회 |
| `understanding.counts` | 서버 | `{green, yellow, red}` 합계만 | 강사 비율 바 (개인 상태는 보내지 않음) |
| `help.changed` | 서버 | `{participantId, status}` | 강사 대기열 재조회 |
| `activity.changed` | 서버 | 활동 (퀴즈 정답 제외) | 팝업 열기/닫기 |
| `activity.results` | 서버 | 집계 결과 | 실시간 결과 (공개 시점 설정 반영) |
| `submission.changed` | 서버 | `{id}` | 보드 재조회 |
| `group.changed` | 서버 | `{}` | 조 정보 재조회 |
| `participant.session` | 서버 | `{participantId, reason}` | 해당 기기 연결 해제(강퇴/다른 기기 로그인/재발급/강제 로그아웃) |
| Presence | 각 클라이언트 | `{id, kind, nickname}` | 접속 상태 |

### 재연결과 누락 복구
`RealtimeProvider`는 채널 상태를 추적합니다. 끊겼다가 다시 `SUBSCRIBED`가 되면 `resync` 신호를 내고, 각 화면은 SWR `mutate`로 현재 데이터를 다시 받아옵니다. 브라우저가 다시 온라인이 되거나 탭이 다시 보일 때도 같은 처리를 합니다.

## 6. 파일 업로드
1. 클라이언트에서 MIME + 확장자 검증, 이미지는 긴 변 1920px로 리사이즈 후 WebP(미지원 시 JPEG) 압축.
2. `POST /api/rooms/[roomId]/uploads` → 서버가 용도별 크기(이미지·파일 10MB, 교안 PDF 30MB)와 타입을 다시 검증하고 `createSignedUploadUrl` 발급.
3. 브라우저가 `uploadToSignedUrl`로 Storage에 직접 업로드 → 결과 path로 메시지/산출물 생성 API 호출(서버가 path가 그 방 폴더인지 확인).
- 버킷: `materials`(비공개, PDF 30MB), `uploads`(비공개, 10MB). 경로는 `{roomId}/{용도}/{uuid}.{ext}`.

## 7. AI 질문 묶기
- `src/lib/ai/provider.ts`의 `LlmProvider` 인터페이스 뒤에 Anthropic / OpenAI 호환 구현. `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` 환경변수로 교체.
- 키가 없으면 `/api/rooms/[roomId]/ai/status`가 `enabled:false`를 돌려주고 버튼이 비활성화됩니다.
- `ai_usage`로 방당 일일 한도(기본 20회, 방 설정에서 변경) 적용.

## 8. 리포트 집계
`src/lib/report/aggregate.ts`의 순수 함수로 계산합니다(단위 테스트 대상).
- 참여율 = 1회 이상 상호작용(채팅·질문·공감·응답·산출물·댓글·이해도·도움 요청·반응)한 수강생 / 전체 수강생
- 1인당 평균 상호작용 수, 이해도 추이(5분 단위 버킷), 공감 많은 질문 TOP 5, 활동별 결과
