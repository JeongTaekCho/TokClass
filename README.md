# 톡클 (TokClass)

> 듣는 수업을 **함께 만드는 수업**으로.

강사가 방을 만들고 참여코드(6자리)·QR을 공유하면, 수강생은 **설치·가입 없이** 들어와 채팅·교안·투표·산출물 공유를 한 화면에서 함께하는 양방향 강의 플랫폼이에요.

## 주요 기능

| 영역 | 기능 |
|---|---|
| 강사 | 이메일 가입·로그인·비밀번호 재설정, 대시보드, 방 만들기(강의형·실습형·워크숍형·내 템플릿), 참여코드·QR·링크, 탭 켜기/끄기·순서·첫 화면, 입장 마감, 집중 모드, 읽기 전용 링크, 종료·초기화·삭제 |
| 수강생 입장 | 참여코드 → 닉네임으로 새로 참여(임시 비밀번호 발급, [저장했어요] 확인) / 비밀번호로 재참여, 같은 브라우저 자동 재입장, [이 기기 기억 안 함], 1인 1접속 |
| 소통 | 전체 채팅(이미지·코드 블록·링크 미리보기·무한 스크롤), 공지, 강사↔수강생 1:1 메시지, 익명 Q&A(공감 정렬·답변), 이모지 반응, 도움 요청 |
| 교안 | PDF 업로드, 실시간 페이지 동기화([따라가기]/자유 탐색), 페이지별 질문·반응 핀, 개인 메모, 자료실 |
| 이해도 | 🟢이해/🟡헷갈림/🔴막힘 상시 표시, 강사 실시간 비율·기준 초과 강조, 시간대별 기록 |
| 활동 | 투표·워드클라우드·퀴즈(점수판)·순위·자유 응답·아이디어 보드·할 일 타이머, 버튼 하나로 시작/종료, 수강생 팝업 |
| 산출물 | 이미지·파일·링크·텍스트, 최신·인기·내 것·섹션별, 댓글·스티커·베스트, 발표 모드(←/→, Esc) |
| 조별 소그룹방 | 자동 랜덤·수동·수강생 선택, 조별 채팅·산출물, 메인으로 합치기 |
| AI | 비슷한 질문 묶기·요약 (서버에서만 호출, 방당 일일 한도, 키가 없으면 비활성화) |
| 기록 | 수업 리포트(참여율·이해도 추이·TOP 질문·활동 결과), 채팅/Q&A/투표·퀴즈 내보내기(TXT·CSV), 산출물 ZIP, 수강생 복습 페이지, 참여자 관리(접속 상태·비밀번호 재발급·강퇴) |

## 기술 스택

Next.js 16.4 (App Router, TypeScript strict) · Tailwind CSS v4 + shadcn/ui · Supabase (Postgres, Auth, Realtime, Storage) · react-pdf(pdf.js) · zod · SWR · Vitest · Playwright · pnpm

설계(데이터 모델, 실시간 이벤트, 권한)는 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)에 있어요.

## 로컬에서 실행하기

준비물: Node.js 20.9+, pnpm 10, Docker(로컬 Supabase용)

```bash
pnpm install
pnpm supabase start          # 로컬 Supabase (마이그레이션 + seed.sql 자동 적용)
pnpm supabase status -o env  # 키 확인
cp .env.example .env.local
```

`.env.local`을 채워요.

| 변수 | 로컬 값 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `API_URL` (http://127.0.0.1:54321) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `ANON_KEY` 또는 `PUBLISHABLE_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` 또는 `SECRET_KEY` |
| `SUPABASE_JWT_SECRET` | `JWT_SECRET` |
| `PARTICIPANT_PASSWORD_SECRET` | `tokclass-local-dev-password-secret` (시드 데모 비밀번호와 맞추려면 이 값) |
| `SESSION_SECRET` | 32자 이상 아무 문자열 |

```bash
pnpm dev   # http://localhost:3000
```

### 데모 계정 (로컬 seed.sql 전용)

| 구분 | 값 |
|---|---|
| 데모 강사 | `demo@tokclass.dev` / `tokclass1234` |
| 데모 방 참여코드 | `123456` |
| 데모 수강생 비밀번호 | 민지 `TKCP23`, 하나 `HANA27` |

수강생 화면은 시크릿 창이나 휴대폰에서 열면 강사 화면과 함께 테스트할 수 있어요.

### 스크립트

| 명령 | 설명 |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | 개발 / 빌드 / 실행 (pdf.js 워커를 `public/`에 복사한 뒤 실행) |
| `pnpm lint` / `pnpm typecheck` | ESLint / TypeScript 검사 |
| `pnpm test` | 단위 테스트 (Vitest) |
| `pnpm test:e2e` | E2E (Playwright, 로컬 Supabase + `.env.local` 필요. 설치된 Chromium을 쓰려면 `PLAYWRIGHT_CHROMIUM_PATH`) |
| `pnpm db:reset` | 로컬 DB 초기화 (마이그레이션 + 시드 다시 적용) |

## Supabase 프로젝트 만들고 마이그레이션 적용하기

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 만들어요 (리전은 Seoul 권장).
2. 스키마를 적용해요. 테이블·인덱스·RLS·Storage 버킷(`materials`, `uploads`)·Realtime 권한 정책이 `supabase/migrations/`에 모두 들어 있어요.
   ```bash
   pnpm supabase login
   pnpm supabase link --project-ref <프로젝트 ref>
   pnpm supabase db push
   ```
   `supabase/seed.sql`(데모 데이터)은 운영 DB에 넣지 마세요.
3. **Realtime**: Project Settings → Realtime에서 **Allow public access를 꺼요**. 톡클은 private 채널만 써요.
4. **Auth**: Authentication → URL Configuration의 **Site URL**을 배포 주소로, Redirect URLs에 `https://<배포 주소>/auth/callback`을 추가해요. 이메일 인증을 쓰지 않으려면 Email provider의 *Confirm email*을 꺼요.

## Vercel 배포 체크리스트

1. Vercel → Add New Project → 이 GitHub 저장소 선택 (Framework: Next.js, 빌드 설정은 기본값)
2. 아래 환경변수를 **Production·Preview** 모두에 입력
3. Deploy → 배포 주소를 Supabase Auth의 Site URL·Redirect URLs에 반영
4. 배포 후 확인: 강사 가입 → 방 만들기 → 휴대폰으로 QR 입장 → 채팅·투표가 실시간으로 오가는지

### 환경변수

| 변수 | 설명 | 필수 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable 키(또는 레거시 anon 키). 브라우저에 노출돼도 되는 키 | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | secret 키(또는 레거시 service_role 키). **서버 전용, 절대 공개 금지** | ✅ |
| `SUPABASE_JWT_SECRET` | Project Settings → JWT Keys → **Legacy JWT Secret**. 수강생 Realtime 토큰 서명용 | ✅ |
| `PARTICIPANT_PASSWORD_SECRET` | 수강생 임시 비밀번호 HMAC 키 (32자 이상 무작위). **운영 중 변경하면 모든 수강생 비밀번호가 무효** | ✅ |
| `SESSION_SECRET` | 수강생 세션 쿠키 서명 키 (32자 이상 무작위). 바꾸면 수강생은 비밀번호로 다시 들어와야 해요 | ✅ |
| `NEXT_PUBLIC_SITE_URL` | 커스텀 도메인 (QR·참여 링크·인증 메일 링크에 사용). 비우면 요청 주소 사용 | 선택 |
| `AI_API_KEY` | AI 질문 묶기 API 키. 없으면 [질문 정리하기]만 비활성화 | 선택 |
| `AI_PROVIDER` | `anthropic`(기본) 또는 `openai`(OpenAI 호환) | 선택 |
| `AI_MODEL` | 비우면 `claude-opus-5-5` (openai는 `gpt-4o-mini`) | 선택 |
| `AI_BASE_URL` | OpenAI 호환 공급자의 base URL | 선택 |

무작위 문자열 만들기: `openssl rand -base64 48`

## 실시간 권한 처리 방식

- **방 하나당 private 채널 하나** (`room:{roomId}`). 수강생은 탭이 몇 개든 연결 1개만 써요. 조 이벤트도 같은 채널에서 구분해요.
- 구독 권한은 **Supabase Realtime Authorization**(`realtime.messages` RLS)으로 확인해요.
  - 강사: Supabase Auth 세션 토큰 → `rooms.owner_id`가 본인인지 확인
  - 수강생: Supabase 계정이 없으므로, 서버가 세션 쿠키를 검증한 뒤 **10분짜리 Supabase 호환 JWT**를 발급해요(`/api/rooms/[roomId]/realtime-token`, `SUPABASE_JWT_SECRET`으로 서명). 클레임 `tk_room`, `tk_sv`(세션 버전)를 DB와 대조해서, 강퇴·비밀번호 재발급·다른 기기 로그인 시 바로 막혀요.
  - 수강생은 **Presence만 보낼 수 있고 broadcast는 못 보내요.** 페이지 이동 같은 이벤트를 위조할 수 없고, 수강생 행동은 모두 서버 API를 거쳐 서버가 HTTP Broadcast로 전달해요.
- 이 방식을 고른 이유: 계정 없는 수강생도 RLS로 채널 접근을 막을 수 있고, 서버리스(Vercel)에서 WebSocket을 열지 않아도 되며, 수강생 토큰으로는 일반 테이블을 읽을 수 없어요(정책이 강사 소유 데이터만 허용).
- 1:1 메시지·개인 이해도처럼 민감한 이벤트는 내용 없이 신호만 보내고, 받는 사람이 서버에서 다시 조회해요.

## 보안 메모

- 수강생 비밀번호는 원문을 저장하지 않고 `HMAC-SHA256(PARTICIPANT_PASSWORD_SECRET, room_id:password)`만 저장해요. 시도 제한: 같은 기기 5회 / 같은 IP 20회 연속 실패 시 1분 대기 (강의실은 IP를 공유하는 경우가 많아 IP 기준을 넉넉히 둬요).
- 채팅 도배 방지: 수강생 1명당 10초에 8개까지.
- 모든 테이블 RLS 활성화. service role 키는 `server-only` 모듈에서만 사용해요.
- 파일은 서명된 업로드 URL로 브라우저에서 Storage에 직접 올리고, MIME·확장자·크기를 클라이언트와 서버 양쪽에서 확인해요(이미지·파일 10MB, 교안 PDF 30MB, 이미지는 업로드 전 긴 변 1920px로 압축).
- `.env*` 파일은 커밋하지 않아요 (`.env.example`만 예외).

## 무료 플랜 기준 운영

Supabase Free: Realtime 동시 연결 약 200, Storage 1GB, 전송 월 5GB. 방 정원은 최대 100명이고 수강생 1명당 실시간 연결 1개라, 동시에 1~2개 수업이 안전해요.
