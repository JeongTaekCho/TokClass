import { expect, test, type Browser, type Page } from "@playwright/test";

const INSTRUCTOR = { email: "demo@tokclass.dev", password: "tokclass1234" };

async function studentPage(browser: Browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "ko-KR" });
  return ctx.newPage();
}

async function openChat(page: Page) {
  await page.getByRole("tab", { name: /채팅/ }).click();
}

test("강사 방 생성 → 수강생 닉네임 입장 → 채팅 → 투표 → 비밀번호 재입장으로 이전 기록 확인", async ({ page, browser }) => {
  const suffix = Date.now().toString().slice(-6);
  const roomTitle = `E2E 수업 ${suffix}`;
  const nickname = `학생${suffix.slice(-4)}`;
  const chatText = `안녕하세요 E2E ${suffix}`;

  // 1) 강사 로그인
  await page.goto("/login");
  await page.getByLabel("이메일").fill(INSTRUCTOR.email);
  await page.getByLabel("비밀번호").fill(INSTRUCTOR.password);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // 2) 방 만들기 (실습형)
  await page.getByRole("button", { name: "새 방 만들기" }).click();
  await page.getByLabel("수업명").fill(roomTitle);
  await page.getByRole("radio", { name: /실습형/ }).click();
  await page.getByRole("button", { name: "방 만들기" }).click();
  await expect(page).toHaveURL(/\/rooms\/[0-9a-f-]+\/live/);
  const code = (await page.getByTestId("join-code").innerText()).trim();
  expect(code).toMatch(/^\d{6}$/);

  // 3) 투표 활동 미리 만들기
  // 활동 운영은 강사 도구 패널에 있어요 (수강생 화면에는 없음)
  await page.getByRole("tab", { name: /활동/ }).click();
  await page.getByRole("button", { name: "활동 만들기" }).click();
  await page.getByRole("radio", { name: /투표/ }).click();
  await page.getByLabel("질문").fill("가장 좋아하는 언어는?");
  await page.getByLabel("1번 선택지").fill("TypeScript");
  await page.getByLabel("2번 선택지").fill("Python");
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page.getByText("가장 좋아하는 언어는?")).toBeVisible();

  // 4) 수강생: 닉네임으로 새로 참여 → 임시 비밀번호 확인
  const s1 = await studentPage(browser);
  await s1.goto(`/join/${code}`);
  await s1.getByRole("button", { name: "닉네임으로 새로 참여" }).click();
  await s1.getByLabel("닉네임").fill(nickname);
  await s1.getByRole("button", { name: "다음" }).click();
  await expect(s1.getByText(`${nickname}님의 임시 비밀번호예요`)).toBeVisible();
  const password = (await s1.locator("p.font-mono").innerText()).trim();
  expect(password).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
  const enter = s1.getByRole("button", { name: "입장하기" });
  await expect(enter).toBeDisabled(); // [저장했어요] 체크 전에는 입장 불가
  await s1.getByLabel("저장했어요").check();
  await enter.click();
  await expect(s1).toHaveURL(new RegExp(`/r/${code}$`));

  // 5) 채팅: 수강생이 보내면 강사 화면에 실시간으로 보여요
  await openChat(s1);
  await s1.getByLabel("메시지 입력").fill(chatText);
  await s1.getByRole("button", { name: "보내기", exact: true }).click();
  await page.getByRole("tab", { name: "채팅" }).click();
  await expect(page.getByText(chatText)).toBeVisible();

  // 6) 투표: 강사가 시작하면 수강생 화면에 팝업
  await page.locator("li", { hasText: "가장 좋아하는 언어는?" }).getByRole("button", { name: /시작/ }).click();
  const dialog = s1.getByRole("dialog");
  await expect(dialog.getByText("가장 좋아하는 언어는?")).toBeVisible();
  await dialog.getByRole("radio", { name: /TypeScript/ }).click();
  await dialog.getByRole("button", { name: "투표하기" }).click();
  await expect(page.getByText("1표 · 100%").first()).toBeVisible();

  // 7) 다른 기기에서 비밀번호로 재입장 → 이전 기기 연결 해제
  const s2 = await studentPage(browser);
  await s2.goto(`/join/${code}`);
  await s2.getByRole("button", { name: "비밀번호로 참여하기" }).click();
  await s2.getByLabel("임시 비밀번호").fill(password.toLowerCase()); // 소문자로 써도 돼요
  await s2.getByRole("button", { name: "확인" }).click();
  await expect(s2.getByText(`${nickname}님으로 들어갈게요`)).toBeVisible();
  await s2.getByRole("button", { name: "들어가기" }).click();
  await expect(s2).toHaveURL(new RegExp(`/r/${code}$`));
  await expect(s1.getByText("다른 기기에서 들어왔어요")).toBeVisible();

  // 8) 이전 기록이 그대로: 진행 중 투표 팝업에 내 선택, 채팅에 내 메시지
  const popup = s2.getByRole("dialog");
  await expect(popup.getByText("가장 좋아하는 언어는?")).toBeVisible();
  await expect(popup.getByRole("radio", { name: /TypeScript/ })).toHaveAttribute("aria-checked", "true");
  await expect(popup.getByText("내 선택")).toBeVisible();
  await popup.getByRole("button", { name: "닫기" }).click();
  await openChat(s2);
  await expect(s2.getByRole("log").getByText(chatText)).toBeVisible();

  // 9) 정리: 방 삭제
  const roomUrl = page.url().replace(/\/live$/, "/settings");
  await page.goto(roomUrl);
  await page.getByRole("button", { name: "방 삭제" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "영구 삭제" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
