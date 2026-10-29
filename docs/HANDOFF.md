# 작업 인수인계 (다음 세션용)

## 현재 상태 (완료)
- 기획 1~11단계 기능 전부 구현·커밋 완료 (`git log` 참고)
- `pnpm lint`, `pnpm typecheck`, `pnpm test`(Vitest 40개), `pnpm build` 통과
- E2E(`tests/e2e/class-flow.spec.ts`) 통과 — 레거시 키와 신규 키(`sb_publishable_`/`sb_secret_`) 모두 확인
- `.env.example` 작성 완료, `docs/ARCHITECTURE.md` 작성 완료

## 남은 일
1. **README.md 작성** (현재는 create-next-app 기본 README) — 포함할 내용:
   - 서비스 소개, 로컬 실행 방법
   - Supabase 프로젝트 생성 → `supabase link` → `supabase db push`로 마이그레이션 적용
   - Vercel 배포 체크리스트 + 환경변수 목록 (`.env.example` 주석 참고)
   - 실시간 권한 처리 방식 설명 (`docs/ARCHITECTURE.md` 5장 요약)
   - 운영 Supabase에서 Realtime 설정의 "Allow public access" 끄기 권장
   - `SUPABASE_JWT_SECRET`은 Project Settings → JWT Keys → Legacy JWT Secret
   - 데모 계정: demo@tokclass.dev / tokclass1234, 참여코드 123456 (seed.sql, 로컬 전용)
   - 데모 수강생 비밀번호: 민지 TKCP23, 하나 HANA27 (로컬 `PARTICIPANT_PASSWORD_SECRET=tokclass-local-dev-password-secret` 기준)
2. `docs/ARCHITECTURE.md`에 시도 제한 IP 기준 20회(기기 기준 5회) 반영
3. 최종 `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 후 커밋
4. GitHub 푸시 (`main`, force push 금지). 이 세션에서는 GitHub App 권한이 없어 푸시가 거부됐음 →
   https://github.com/apps/claude/installations/select_target 에서 저장소에 Claude 앱 설치 필요

## 로컬 개발 환경 재현
```bash
pnpm install
pnpm supabase start          # Docker 필요
cp .env.example .env.local   # 아래 값 채우기 (pnpm supabase status -o env 참고)
# NEXT_PUBLIC_SUPABASE_URL=API_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY=ANON_KEY 또는 PUBLISHABLE_KEY
# SUPABASE_SERVICE_ROLE_KEY=SERVICE_ROLE_KEY 또는 SECRET_KEY, SUPABASE_JWT_SECRET=JWT_SECRET
# PARTICIPANT_PASSWORD_SECRET=tokclass-local-dev-password-secret (시드 데모 비밀번호용)
# SESSION_SECRET=아무 32자 이상 문자열
pnpm dev
pnpm test:e2e   # 미리 설치된 Chromium을 쓰려면 PLAYWRIGHT_CHROMIUM_PATH 지정
```

## 알려진 제약·메모
- shadcn 레지스트리 접근이 막혀 있어 `src/components/ui/*`는 shadcn 소스를 직접 작성함 (Checkbox는 네이티브 input)
- 조별 채팅 메시지는 방 채널 1개로 broadcast되므로 다른 조 수강생 브라우저에도 이벤트가 도착함(화면에서 필터). 1:1 메시지·개인 이해도는 내용 없이 신호만 보냄
- Lighthouse 접근성 점수는 아직 측정하지 않음
