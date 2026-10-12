import { test, expect, devices } from "@playwright/test";
for (const size of [
  { width: 360, height: 800 },
  { width: 393, height: 851 },
  { width: 412, height: 915 },
  { width: 900, height: 412 },
])
  test(`Android Chrome touch layout ${size.width}x${size.height}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      ...devices["Pixel 7"],
      viewport: size,
      deviceScaleFactor: 3,
      timezoneId: "Asia/Seoul",
      locale: "ko-KR",
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:3000");
    await page
      .getByRole("button", { name: "기본 측정 세트 선택", exact: true })
      .tap();
    await page.getByRole("button", { name: "나의 여정 시작하기" }).tap();
    await expect(page.locator(".hero")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() =>
        [...document.fonts].some(
          (font) =>
            font.family.toLowerCase().includes("pretendard") &&
            font.status === "loaded",
        ),
      ),
    ).toBeTruthy();
    expect(
      await page.evaluate(() =>
        getComputedStyle(document.body)
          .fontFamily.toLowerCase()
          .includes("pretendard"),
      ),
    ).toBeTruthy();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await expect(page.locator(".mobile-nav")).toBeVisible();
    await page.getByRole("button", { name: "내 사진 등록" }).tap();
    await page
      .getByLabel("프로필 사진 파일")
      .setInputFiles("public/icon-192.png");
    await page.getByRole("button", { name: "프로필 사진 저장" }).tap();
    await expect(page.locator(".hero .profile-photo img")).toBeVisible();
    expect(
      await page
        .locator(".hero .profile-photo img")
        .evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
    ).toBeTruthy();
    await page.getByRole("button", { name: "체중 기록", exact: true }).tap();
    await page.getByLabel("기록값 · kg").fill("75.5");
    await page.getByRole("button", { name: "기록 저장" }).tap();
    await expect(page.getByText("75.5 kg 기록했어요")).toBeVisible();
    if (size.width === 393) {
      await page
        .locator(".toast")
        .evaluateAll((els) =>
          els.forEach((e) => ((e as HTMLElement).style.visibility = "hidden")),
        );
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: "docs/preview-android.png" });
    }
    await page
      .locator(".mobile-nav")
      .getByRole("button", { name: "나의 스탯", exact: true })
      .tap();
    await expect(page.locator(".radar-container")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.getByRole("button", { name: "차트 축 선택" }).tap();
    await expect(page.locator(".axis-editor")).toBeVisible();
    const controls = await page
      .locator(".mobile-nav button")
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    expect(controls.every((height) => height >= 44)).toBeTruthy();
    if (size.width === 393) {
      await page.getByRole("button", { name: "차트 축 선택" }).tap();
      await page.locator(".activity-radar").scrollIntoViewIfNeeded();
      await page.screenshot({ path: "docs/preview-android-balance.png" });
    }
    await page
      .locator(".mobile-nav")
      .getByRole("button", { name: "나의 기록", exact: true })
      .tap();
    await page
      .getByRole("button", { name: "성장 항목 추가", exact: true })
      .tap();
    await page.getByLabel("항목 이름").fill("안드로이드 터치 기록");
    if (size.width <= 412)
      await page.setViewportSize({ width: size.width, height: 420 });
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "성장 항목 추가", exact: true })
      .tap();
    await expect(
      page.getByRole("heading", { name: "안드로이드 터치 기록", exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
    await context.close();
  });

test("default starter routines, evidence library, XP ledger and added balance axes", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "나의 여정 시작하기" }).click();
  await expect(
    page.getByRole("button", { name: "걷기 기록", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".snapshot-grid .stat-card")).toHaveCount(3);
  await page.getByRole("button", { name: "걷기 기록", exact: true }).click();
  await page.getByLabel("기록값 · 분").fill("10");
  await page.getByRole("button", { name: "기록 저장" }).click();
  await page.getByRole("button", { name: "XP 계산 기준", exact: true }).click();
  await expect(page.getByRole("dialog").locator(".xp-total")).toContainText(
    "10 XP",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "논문에서 정한 효과 수치가 아닙니다",
  );
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "나의 기록", exact: true })
    .click();
  await page.getByRole("button", { name: "추천 활동 라이브러리" }).click();
  const modal = page.getByRole("dialog");
  await modal.getByRole("checkbox", { name: /수면 준비/ }).check();
  await modal.getByRole("checkbox", { name: /마음챙김 휴식/ }).check();
  await modal.getByRole("checkbox", { name: /의미 있는 안부/ }).check();
  await modal.getByRole("button", { name: "근거와 적용 범위" }).first().click();
  await expect(modal.locator(".practice-evidence")).toContainText("일반 지침");
  await modal.getByRole("button", { name: "선택한 3개 활동 추가" }).click();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "나의 스탯", exact: true })
    .click();
  await expect(page.locator(".recharts-polar-angle-axis-tick")).toHaveCount(6);
  await page
    .locator(".activity-radar")
    .screenshot({ path: "docs/preview-balance-six.png" });
  await page.getByRole("button", { name: "차트 축 선택" }).click();
  await page
    .locator(".axis-editor")
    .getByRole("checkbox", { name: "관계", exact: true })
    .uncheck();
  await expect(page.locator(".recharts-polar-angle-axis-tick")).toHaveCount(5);
  await page.reload();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "나의 기록", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "마음챙김 휴식", exact: true }),
  ).toBeVisible();
});

test("large camera-sized photos are optimized and corrupt stored photos use a fallback", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "나의 여정 시작하기" }).click();
  const source = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2500;
    canvas.height = 1600;
    const c = canvas.getContext("2d")!;
    const g = c.createLinearGradient(0, 0, 2500, 1600);
    g.addColorStop(0, "#c4aae3");
    g.addColorStop(1, "#9aceba");
    c.fillStyle = g;
    c.fillRect(0, 0, 2500, 1600);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.getByRole("button", { name: "내 사진 등록" }).click();
  await page.getByLabel("프로필 사진 파일").setInputFiles({
    name: "camera.png",
    mimeType: "image/png",
    buffer: Buffer.from(source, "base64"),
  });
  await expect(
    page.getByRole("dialog").locator(".profile-photo img"),
  ).toBeVisible();
  await page.getByRole("button", { name: "프로필 사진 저장" }).click();
  expect(
    await page
      .locator(".hero .profile-photo img")
      .evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBe(1024);
  const { emptyData } = await import("../../lib/model");
  const broken = emptyData();
  broken.initialized = true;
  broken.profile.photo = "data:image/png;base64,iVBORw0KGgo=";
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "설정", exact: true })
    .click();
  await page.locator("input[type=file]").setInputFiles({
    name: "broken-photo.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(broken)),
  });
  await page.getByRole("button", { name: "전체 교체하여 복원" }).click();
  await expect(page.locator(".photo-settings-panel img")).toHaveCount(0);
  await expect(
    page.locator(".photo-settings-panel .profile-photo svg"),
  ).toBeVisible();
});
