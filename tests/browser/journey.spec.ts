import { test, expect } from "@playwright/test";
test("reflection persists by date, is escaped, survives backup and can be deleted without XP", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "나의 여정 시작하기" }).click();
  await page
    .getByRole("button", {
      name: "오늘을 한 문장으로 남겨볼까요?",
      exact: false,
    })
    .click();
  await page.getByLabel("오늘 잘한 일", { exact: true }).fill("작은 산책");
  await page
    .getByLabel("남기고 싶은 이야기", { exact: true })
    .fill('<script>alert("hello")</script>\n나의 하루');
  await page
    .getByLabel("다음의 작은 행동", { exact: true })
    .fill("점심 후 한 바퀴");
  await page.getByRole("button", { name: "일기 저장", exact: true }).click();
  await expect(
    page.getByText("일기를 저장했어요", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".hero-level-pill")).toContainText("1");
  await page.reload();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "나의 기록", exact: true })
    .click();
  await page.getByRole("button", { name: "날짜별 보기", exact: true }).click();
  await expect(page.locator(".daily-journal")).toContainText(
    '<script>alert("hello")</script>',
  );
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "설정", exact: true })
    .click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "JSON 백업", exact: true }).click(),
  ]);
  const stream = await download.createReadStream();
  let raw = "";
  for await (const chunk of stream!) raw += chunk.toString();
  expect(JSON.parse(raw).journals[0].win).toBe("작은 산책");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "나의 기록", exact: true })
    .click();
  await page.getByRole("button", { name: "날짜별 보기", exact: true }).click();
  await page.getByLabel("조회 날짜", { exact: true }).fill("2026-01-01");
  await expect(page.locator(".daily-journal")).not.toContainText("작은 산책");
  await page.getByRole("button", { name: "일기 남기기", exact: true }).click();
  await page.getByLabel("오늘 잘한 일", { exact: true }).fill("지난날");
  await page.getByRole("button", { name: "일기 저장", exact: true }).click();
  await expect(page.locator(".daily-journal")).toContainText("지난날");
  await page.getByRole("button", { name: "일기 수정", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "일기 삭제", exact: true }).click();
  await expect(page.locator(".daily-journal")).not.toContainText("지난날");
});

test("a new record crossing 100 XP celebrates once and duplicate same-day activity does not", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "나의 여정 시작하기" }).click();
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("solo-levelup");
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("state", "readwrite");
        const store = tx.objectStore("state");
        const get = store.get("main");
        get.onsuccess = () => {
          const row = get.result;
          const m = row.data.metrics.find(
            (m: { kind: string }) => m.kind === "time",
          );
          row.data.entries = Array.from({ length: 9 }, (_, i) => ({
            id: `seed-${i}`,
            metricId: m.id,
            date: `2026-01-${String(i + 1).padStart(2, "0")}`,
            value: 5,
            note: "",
            createdAt: "2026-01-01T12:00:00Z",
          }));
          store.put(row);
        };
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  await page.reload();
  await page
    .getByRole("button", { name: "걷기 퀘스트 기록하기", exact: true })
    .click();
  await page.getByLabel("기록값 · 분").fill("10");
  await page.getByRole("button", { name: "기록 저장", exact: true }).click();
  await expect(page.locator(".levelup-card")).toContainText("LV. 2");
  await page.getByRole("button", { name: "레벨업 알림 닫기" }).click();
  await page
    .getByRole("button", { name: "걷기 퀘스트 기록 보기", exact: true })
    .click();
  await page.getByLabel("기록값 · 분").fill("5");
  await page.getByRole("button", { name: "기록 저장", exact: true }).click();
  await expect(page.locator(".levelup-card")).toHaveCount(0);
  await expect(page.locator(".quest.done")).toHaveCount(1);
});

test("an open reflection draft cannot overwrite a newer save in another tab", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "나의 여정 시작하기" }).click();
  await page
    .getByRole("button", {
      name: "오늘을 한 문장으로 남겨볼까요?",
      exact: false,
    })
    .click();
  await page.getByLabel("오늘 잘한 일", { exact: true }).fill("첫 탭의 초안");
  const second = await context.newPage();
  await second.goto("/");
  await second
    .getByRole("button", {
      name: "오늘을 한 문장으로 남겨볼까요?",
      exact: false,
    })
    .click();
  await second
    .getByLabel("오늘 잘한 일", { exact: true })
    .fill("다른 탭의 최신 일기");
  await second.getByRole("button", { name: "일기 저장", exact: true }).click();
  await page.getByRole("button", { name: "일기 저장", exact: true }).click();
  await expect(page.getByLabel("오늘 잘한 일", { exact: true })).toHaveValue(
    "첫 탭의 초안",
  );
  await expect(page.locator('.journal-editor [role="alert"]')).toContainText(
    "저장하지 못했어요",
  );
  await page.getByRole("button", { name: "일기 저장", exact: true }).click();
  await expect(page.locator('.journal-editor [role="alert"]')).toContainText(
    "다른 탭이나 기기",
  );
  await second.reload();
  await second
    .getByRole("button", { name: "오늘의 일기 돌아보기", exact: false })
    .click();
  await expect(second.getByLabel("오늘 잘한 일", { exact: true })).toHaveValue(
    "다른 탭의 최신 일기",
  );
});

test("journey and reflection stay usable on narrow touch screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "나의 여정 시작하기" }).click();
  await expect(page.locator(".journey-panel")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".journey-panel").screenshot({
    path: "docs/preview-journey-mobile.png",
    style: ".mobile-nav, .toast { visibility: hidden; }",
  });
  await page
    .getByRole("button", {
      name: "오늘을 한 문장으로 남겨볼까요?",
      exact: false,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "일기 저장", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .getByLabel("남기고 싶은 이야기", { exact: true })
      .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  await page
    .getByLabel("오늘 잘한 일", { exact: true })
    .fill("잠깐이라도 나를 돌봤다");
  await page
    .locator(".modal")
    .screenshot({ path: "docs/preview-journal-mobile.png" });
  await page.getByRole("button", { name: "일기 저장", exact: true }).click();
  await expect(
    page.getByText("일기를 저장했어요", { exact: true }),
  ).toBeVisible();
});
