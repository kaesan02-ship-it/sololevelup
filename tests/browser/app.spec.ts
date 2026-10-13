import { test, expect } from "@playwright/test";
test("personal growth workflow persists, edits and restores backup", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "기본 측정 세트 선택", exact: true })
    .click();
  await page.getByRole("button", { name: "나의 여정 시작하기" }).click();
  await expect(
    page.getByRole("heading", { name: "오늘도, 한 단계 더." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "독서 기록", exact: true }).click();
  await page.getByLabel("기록값 · 쪽").fill("10");
  await page.getByRole("button", { name: "기록 저장" }).click();
  await expect(page.getByText("10 쪽 기록했어요")).toBeVisible();
  await page.getByRole("button", { name: "독서 기록", exact: true }).click();
  await page.getByLabel("기록값 · 쪽").fill("20");
  await page.getByRole("button", { name: "기록 저장" }).click();
  await expect(page.getByText("30 쪽 기록했어요")).toBeVisible();
  await page.reload();
  await expect(page.getByText("30 쪽 기록했어요")).toBeVisible();
  await page
    .getByRole("button", { name: "스트레칭 기록", exact: true })
    .click();
  await expect(page.getByText("오늘 완료했어요")).toBeVisible();
  await page
    .getByRole("button", { name: "스트레칭 기록", exact: true })
    .click();
  await expect(page.getByText("오늘 완료했어요")).toHaveCount(0);
  await page
    .getByRole("button", { name: "성장 항목 추가", exact: true })
    .click();
  await page.getByLabel("항목 이름").fill("기타 연습");
  await page.getByLabel("기록 방식").selectOption("time");
  await page.getByLabel("이번 주 목표").fill("90");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "성장 항목 추가", exact: true })
    .click();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "나의 기록", exact: true })
    .click();
  const guitar = page.locator(".record-card").filter({
    has: page.getByRole("heading", { name: "기타 연습", exact: true }),
  });
  await guitar.getByRole("button", { name: "기록하기" }).click();
  await page.getByLabel("기록값 · 분").fill("25");
  await page.getByRole("button", { name: "기록 저장" }).click();
  await guitar.getByRole("button", { name: "상세", exact: true }).click();
  await expect(page.locator(".detail-value")).toContainText("25");
  await page.getByRole("button", { name: /기록 수정/ }).click();
  await page.getByLabel("기록값 · 분").fill("30");
  await page.getByRole("button", { name: "기록 저장" }).click();
  await expect(page.locator(".detail-value")).toContainText("30");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "설정", exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON 백업", exact: true }).click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "성장 분석", exact: true })
    .click();
  await page.getByLabel("분석 항목").selectOption({ label: "기타 연습" });
  await page.getByRole("button", { name: /기록 삭제/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "삭제하기", exact: true })
    .click();
  await expect(page.locator(".detail-value")).toContainText("—");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "설정", exact: true })
    .click();
  await page.locator("input[type=file]").setInputFiles(backupPath!);
  await page.getByRole("button", { name: "전체 교체하여 복원" }).click();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "성장 분석", exact: true })
    .click();
  await page.getByLabel("분석 항목").selectOption({ label: "기타 연습" });
  await expect(page.locator(".detail-value")).toContainText("30");
  expect(errors).toEqual([]);
});
test("measurement overwrite requires confirmation; malformed backup preserves data", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "기본 측정 세트 선택", exact: true })
    .click();
  await page.getByRole("button", { name: "나의 여정 시작하기" }).click();
  await page.getByRole("button", { name: "체중 기록", exact: true }).click();
  await page.getByLabel("기록값 · kg").fill("75");
  await page.getByRole("button", { name: "기록 저장" }).click();
  await page.getByRole("button", { name: "체중 기록", exact: true }).click();
  await page.getByLabel("기록값 · kg").fill("74");
  await page.getByRole("button", { name: "기록 저장" }).click();
  await expect(page.locator(".form-error")).toContainText("확인해주세요");
  await page.getByRole("checkbox", { name: /기존 기록/ }).check();
  await page.getByRole("button", { name: "기록 저장" }).click();
  await expect(page.getByText("74 kg 기록했어요")).toBeVisible();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "설정", exact: true })
    .click();
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":2}'),
  });
  await expect(page.locator(".error-banner")).toContainText("지원하지 않는");
  await page.reload();
  await expect(page.getByText("74 kg 기록했어요")).toBeVisible();
});
test("mobile layout, onboarding and keyboard focus are usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "기본 측정 세트 선택", exact: true })
    .click();
  await page.getByRole("button", { name: "나의 여정 시작하기" }).click();
  await expect(page.locator(".mobile-nav")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "/tmp/solo-mobile.png", fullPage: true });
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "나의 기록" })
    .click();
  await page
    .getByRole("button", { name: "성장 항목 추가", exact: true })
    .click();
  const name = page.getByLabel("항목 이름");
  await name.fill("아침 산책");
  await name.press("Tab");
  await expect(page.getByLabel("기록 방식")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
test("desktop layout renders without external requests", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname !== "127.0.0.1")
      external.push(request.url());
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "기본 측정 세트 선택", exact: true })
    .click();
  await page.getByRole("button", { name: "나의 여정 시작하기" }).click();
  await page.screenshot({ path: "/tmp/solo-desktop.png", fullPage: true });
  await expect(page.locator(".hero")).toBeVisible();
  expect(external).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});

test("sample records render period comparisons, goals and preview images", async ({
  page,
}) => {
  const { emptyData, presets, today, shift } = await import("../../lib/model");
  const sample = emptyData();
  sample.initialized = true;
  sample.profile = { nickname: "성장하는 나", timezone: "Asia/Seoul" };
  sample.metrics = presets.map((m, i) => ({
    ...m,
    id: "sample-metric-" + i,
    goal: i === 2 ? 30 : i === 3 ? 100 : i === 4 ? 120 : i === 5 ? 3 : null,
    direction: i === 0 ? "down" : m.direction,
  }));
  const date = today("Asia/Seoul");
  for (let day = 0; day < 14; day++) {
    const d = shift(date, day - 13);
    for (let i = 0; i < 6; i++) {
      if (i === 5 && day % 2 === 0) continue;
      sample.entries.push({
        id: `sample-${day}-${i}`,
        metricId: sample.metrics[i].id,
        date: d,
        value:
          i === 0
            ? Math.round((77 - day * 0.06) * 100) / 100
            : i === 1
              ? 30.2 + Math.round(day * 0.03 * 100) / 100
              : i === 2
                ? 15 + Math.floor(day / 2)
                : i === 3
                  ? 10 + (day % 3) * 5
                  : i === 4
                    ? 20
                    : 1,
        note: "화면 검토용 예시 기록",
        createdAt: d + "T09:00:00Z",
      });
    }
  }
  await page.goto("/");
  await page
    .getByRole("button", { name: "기본 측정 세트 선택", exact: true })
    .click();
  await page.getByRole("button", { name: "나의 여정 시작하기" }).click();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "설정", exact: true })
    .click();
  await page.locator("input[type=file]").setInputFiles({
    name: "preview.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(sample)),
  });
  await page.getByRole("button", { name: "전체 교체하여 복원" }).click();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "상태창", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "성장하는 나님의 여정" }),
  ).toBeVisible();
  await expect(
    page.locator(".stat-card").filter({ hasText: "독서" }),
  ).toContainText("105");
  await page
    .locator(".toast")
    .evaluateAll((els) =>
      els.forEach((el) => ((el as HTMLElement).style.visibility = "hidden")),
    );
  await page.mouse.move(0, 0);
  await page.screenshot({ path: "docs/preview-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "docs/preview-mobile.png" });
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "나의 능력치", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "나의 능력치", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/preview-stats-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: "docs/preview-stats.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBeTruthy();
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "성장 분석" })
    .click();
  await page.getByLabel("분석 항목").selectOption({ label: "체중" });
  await expect(page.locator(".detail-value")).toContainText("76.22");
  await expect(page.locator(".chart")).toBeVisible();
});

test("profile photo replaces character art, persists and survives backup", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "기본 측정 세트 선택", exact: true })
    .click();
  await page.getByRole("button", { name: "나의 여정 시작하기" }).click();
  await expect(page.getByRole("button", { name: "캐릭터 꾸미기" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "내 사진 등록" }).click();
  await page
    .getByLabel("프로필 사진 파일")
    .setInputFiles("public/icon-192.png");
  await expect(
    page.getByRole("dialog").locator(".profile-photo img"),
  ).toBeVisible();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(page.locator(".hero .profile-photo img")).toHaveCount(0);
  await page.getByRole("button", { name: "내 사진 등록" }).click();
  await page
    .getByLabel("프로필 사진 파일")
    .setInputFiles("public/icon-192.png");
  await page.getByRole("button", { name: "프로필 사진 저장" }).click();
  await expect(page.locator(".hero .profile-photo img")).toBeVisible();
  await page.reload();
  await expect(page.locator(".hero .profile-photo img")).toBeVisible();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "설정", exact: true })
    .click();
  await page.getByLabel("닉네임").fill("성장하는 나");
  await page.getByRole("button", { name: "변경 저장" }).click();
  await expect(page.locator(".photo-settings-panel img")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON 백업", exact: true }).click();
  const file = await (await downloadPromise).path();
  const { readFile } = await import("node:fs/promises");
  const saved = JSON.parse(await readFile(file!, "utf8"));
  expect(saved.profile.photo).toMatch(/^data:image\/png;base64,/);
  expect(saved.profile.character).toBeUndefined();
  await page.getByRole("button", { name: "프로필 사진 설정" }).click();
  await page.getByRole("button", { name: "사진 제거" }).click();
  await page.getByRole("button", { name: "프로필 사진 저장" }).click();
  await expect(page.locator(".photo-settings-panel img")).toHaveCount(0);
  await page.locator("input[type=file]").setInputFiles(file!);
  await page.getByRole("button", { name: "전체 교체하여 복원" }).click();
  await expect(page.locator(".photo-settings-panel img")).toBeVisible();
  await page.getByRole("button", { name: "프로필 사진 설정" }).click();
  await page.getByLabel("프로필 사진 파일").setInputFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.locator(".form-error")).toBeVisible();
  await page.getByRole("button", { name: "취소", exact: true }).click();
});
test("old database upgrade preserves records and removes old avatar styles", async ({
  page,
}) => {
  const { emptyData, presets, today } = await import("../../lib/model");
  const legacy = {
    ...emptyData(),
    profile: {
      ...emptyData().profile,
      character: {
        archetype: "hunter",
        palette: "violet",
        hair: "tousled",
        skin: "light",
      },
    },
  };
  legacy.initialized = true;
  legacy.metrics = [{ ...presets[3], id: "legacy-reading" }];
  const date = today(legacy.profile.timezone);
  legacy.entries = [
    {
      id: "legacy-entry",
      metricId: "legacy-reading",
      date,
      value: 35,
      note: "이전 버전 기록",
      createdAt: date + "T12:00:00Z",
    },
  ];
  await page.goto("/icon.svg");
  await page.evaluate(async (data) => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("solo-levelup", 10);
      req.onupgradeneeded = () =>
        req.result.createObjectStore("state", { keyPath: "id" });
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("state", "readwrite");
        tx.objectStore("state").put({ id: "main", data });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, legacy);
  await page.goto("/");
  await expect(page.getByText("35 쪽 기록했어요")).toBeVisible();
  await expect(page.getByRole("button", { name: "캐릭터 꾸미기" })).toHaveCount(
    0,
  );
  await expect(page.locator(".hero-level-pill")).toHaveText("LV. 1");
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole("button", { name: "내 사진 등록" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(page.getByText("35 쪽 기록했어요")).toBeVisible();
});
test("white theme has readable surfaces and PWA runs and records offline", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "기본 측정 세트 선택", exact: true })
    .click();
  await page.getByRole("button", { name: "나의 여정 시작하기" }).click();
  await expect(page.locator(".stat-card").first()).toBeVisible();
  const theme = await page.evaluate(() => ({
    scheme: getComputedStyle(document.documentElement).colorScheme,
    background: getComputedStyle(document.querySelector(".stat-card")!)
      .backgroundColor,
  }));
  expect(theme.scheme).toBe("light");
  expect(theme.background).toBe("rgb(255, 255, 255)");
  const manifest = await (
    await page.request.get("/manifest.webmanifest")
  ).json();
  expect(manifest.display).toBe("standalone");
  await expect(page.locator("link[rel=manifest]")).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "설정", exact: true })
    .click();
  await expect(
    page.getByText("오프라인 준비 완료", { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await context.setOffline(true);
  await page.reload();
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
  await expect(
    page.getByRole("heading", { name: "오늘도, 한 단계 더." }),
  ).toBeVisible();
  await expect(
    page.getByText("오프라인 · 기록은 이 기기에 저장돼요", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "독서 기록", exact: true }).click();
  await page.getByLabel("기록값 · 쪽").fill("18");
  await page.getByRole("button", { name: "기록 저장" }).click();
  await expect(page.getByText("18 쪽 기록했어요")).toBeVisible();
  await page.reload();
  await expect(page.getByText("18 쪽 기록했어요")).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByText("18 쪽 기록했어요")).toBeVisible();
});

test("snapshot editing supports six favorites, filters and detailed stat actions", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "기본 측정 세트 선택", exact: true })
    .click();
  await page.getByRole("button", { name: "나의 여정 시작하기" }).click();
  await page.getByRole("button", { name: "변화 요약 편집" }).click();
  await page
    .getByRole("dialog")
    .getByRole("checkbox", { name: /골격근량/ })
    .check();
  await page
    .getByRole("dialog")
    .getByRole("checkbox", { name: /집중 공부/ })
    .check();
  await page.getByRole("button", { name: "변화 요약 저장" }).click();
  await expect(page.locator(".snapshot-grid .stat-card")).toHaveCount(6);
  await page.reload();
  await expect(page.locator(".snapshot-grid .stat-card")).toHaveCount(6);
  await page.getByLabel("변화 요약 분류").selectOption("learn");
  await expect(page.locator(".snapshot-grid .stat-card")).toHaveCount(2);
  await page.getByLabel("변화 요약 분류").selectOption("all");
  await page.getByRole("button", { name: "최근 기록", exact: true }).click();
  await expect(page.locator(".snapshot-grid .stat-card")).toHaveCount(0);
  await page.getByRole("button", { name: "독서 기록", exact: true }).click();
  await page.getByLabel("기록값 · 쪽").fill("25");
  await page.getByRole("button", { name: "기록 저장" }).click();
  await expect(page.locator(".snapshot-grid .stat-card")).toHaveCount(1);
  await page.getByRole("button", { name: "상세 능력치창 열기" }).click();
  await expect(
    page.getByRole("heading", { name: "나의 능력치", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".overview-card").filter({ hasText: "전체 기록" }),
  ).toContainText("1");
  await expect(page.locator(".day-record-row")).toContainText("25 쪽");
  const row = page.locator(".metric-table-row").filter({
    has: page.locator(".metric-table-name").filter({ hasText: "독서" }),
  });
  await row.getByRole("button", { name: "독서 능력치에서 기록" }).click();
  await page.getByLabel("기록값 · 쪽").fill("5");
  await page.getByRole("button", { name: "기록 저장" }).click();
  await expect(row.locator(".metric-table-value")).toContainText("30");
  const check = page.getByRole("button", {
    name: "스트레칭 능력치에서 기록",
    exact: true,
  });
  await check.click();
  await expect(check).toHaveAttribute("aria-pressed", "true");
  await expect(check).toHaveText("체크 취소");
  await check.click();
  await expect(check).toHaveAttribute("aria-pressed", "false");
  await page.setViewportSize({ width: 360, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "/tmp/solo-stats-mobile.png", fullPage: true });
  await row.locator(".metric-table-name").click();
  await expect(page.locator(".detail-value")).toContainText("30");
});

test("records and settings audit: reorder, archive restore, category CRUD and CSV export", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "기본 측정 세트 선택", exact: true })
    .click();
  await page.getByRole("button", { name: "나의 여정 시작하기" }).click();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "나의 기록", exact: true })
    .click();
  await page
    .getByRole("button", { name: "골격근량 위로 이동", exact: true })
    .click();
  await expect(page.locator(".record-card").first()).toContainText("골격근량");
  await page
    .getByRole("button", { name: "골격근량 설정", exact: true })
    .click();
  await page.getByRole("button", { name: "항목 보관", exact: true }).click();
  await expect(
    page.locator(".record-card").filter({
      has: page.getByRole("heading", { name: "골격근량", exact: true }),
    }),
  ).toHaveCount(0);
  await page.getByLabel("분류 필터").selectOption("archive");
  await page
    .getByRole("button", { name: "골격근량 설정", exact: true })
    .click();
  await page.getByRole("button", { name: "보관 해제", exact: true }).click();
  await page.getByLabel("분류 필터").selectOption("all");
  await expect(page.locator(".record-card").first()).toContainText("골격근량");
  await page
    .locator(".record-card")
    .first()
    .getByRole("button", { name: "기록하기" })
    .click();
  await page.getByLabel("기록값 · kg").fill("31.2");
  await page.getByRole("button", { name: "기록 저장" }).click();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "설정", exact: true })
    .click();
  await page.getByLabel("새 분류 이름").fill("취미");
  await page.getByRole("button", { name: "추가", exact: true }).click();
  await expect(page.getByLabel("취미 분류 이름")).toBeVisible();
  const category = page
    .locator(".category-row")
    .filter({ has: page.getByLabel("취미 분류 이름") });
  await category
    .getByRole("button", { name: "취미 분류 삭제", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "삭제하기", exact: true })
    .click();
  await expect(page.getByLabel("취미 분류 이름")).toHaveCount(0);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV 내보내기", exact: true }).click();
  const path = await (await pending).path();
  const { readFile } = await import("node:fs/promises");
  const csv = await readFile(path!, "utf8");
  expect(csv).toContain("골격근량");
  expect(csv).toContain("31.2");
});

test("a stale tab cannot overwrite newer records and can retry without losing its draft", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "기본 측정 세트 선택", exact: true })
    .click();
  await page.getByRole("button", { name: "나의 여정 시작하기" }).click();
  const other = await context.newPage();
  await other.goto("/");
  await other.getByRole("button", { name: "독서 기록", exact: true }).click();
  await other.getByLabel("기록값 · 쪽").fill("20");
  await page.getByRole("button", { name: "독서 기록", exact: true }).click();
  await page.getByLabel("기록값 · 쪽").fill("10");
  await page.getByRole("button", { name: "기록 저장" }).click();
  await expect(page.getByText("10 쪽 기록했어요")).toBeVisible();
  await other.getByRole("button", { name: "기록 저장" }).click();
  await expect(other.locator(".error-banner")).toContainText(
    "덮어쓰지 않았어요",
  );
  await expect(other.getByLabel("기록값 · 쪽")).toHaveValue("20");
  await page.reload();
  await expect(page.getByText("10 쪽 기록했어요")).toBeVisible();
  await other.getByRole("button", { name: "기록 저장" }).click();
  await expect(other.getByText("30 쪽 기록했어요")).toBeVisible();
  await page.reload();
  await expect(page.getByText("30 쪽 기록했어요")).toBeVisible();
});

test("today resets after midnight while the app stays open", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-10T14:59:40Z") });
  await page.goto("/");
  await page
    .getByRole("button", { name: "기본 측정 세트 선택", exact: true })
    .click();
  await page.getByRole("button", { name: "나의 여정 시작하기" }).click();
  await page
    .getByRole("button", { name: "스트레칭 기록", exact: true })
    .click();
  await expect(page.getByText("오늘 완료했어요")).toBeVisible();
  await page.clock.fastForward(60000);
  await expect(page.getByText("오늘 완료했어요")).toHaveCount(0);
  await page.getByRole("button", { name: "체중 기록", exact: true }).click();
  await expect(page.getByLabel("날짜", { exact: true })).toHaveValue(
    "2026-10-11",
  );
});

test("daily history adds and edits past records and opens dates older than the calendar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await page.goto("/");
  await page.getByRole("button", { name: "나의 여정 시작하기" }).click();
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "나의 기록", exact: true })
    .click();
  await page.getByRole("button", { name: "날짜별 보기", exact: true }).click();
  await page.getByLabel("조회 날짜", { exact: true }).fill("2025-01-02");
  await expect(page.getByText("아직 남긴 기록이 없어요")).toBeVisible();
  await page.getByLabel("날짜별 기록 항목").selectOption({ label: "걷기" });
  await page.getByRole("button", { name: "선택한 날짜에 기록" }).click();
  await expect(page.getByLabel("날짜", { exact: true })).toHaveValue(
    "2025-01-02",
  );
  await page.getByLabel("기록값 · 분").fill("12");
  await page.getByRole("textbox", { name: /메모/ }).fill("점심 식사 후 산책");
  await page.getByRole("button", { name: "기록 저장" }).click();
  await expect(page.locator(".daily-entry")).toContainText("12 분");
  await expect(page.locator(".daily-entry")).toContainText("점심 식사 후 산책");
  await expect(page.locator(".daily-summary")).toContainText("10 XP");
  await page
    .getByRole("button", { name: "걷기 기록 수정", exact: true })
    .click();
  await page.getByLabel("기록값 · 분").fill("15");
  await page.getByRole("button", { name: "기록 저장" }).click();
  await expect(page.locator(".daily-entry")).toContainText("15 분");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "docs/preview-daily-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "이전 날짜", exact: true }).click();
  await expect(page.getByText("아직 남긴 기록이 없어요")).toBeVisible();
  await page.getByRole("button", { name: "다음 날짜", exact: true }).click();
  await expect(page.locator(".daily-entry")).toContainText("15 분");
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "나의 능력치", exact: true })
    .click();
  await page.getByLabel("캘린더 조회 날짜").fill("2025-01-02");
  await expect(page.locator(".day-records")).toContainText("15 분");
  await page.reload();
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "나의 기록", exact: true })
    .click();
  await page.getByRole("button", { name: "날짜별 보기", exact: true }).click();
  await page.getByLabel("조회 날짜", { exact: true }).fill("2025-01-02");
  await expect(page.locator(".daily-entry")).toContainText("15 분");
});
