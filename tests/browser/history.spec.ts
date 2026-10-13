import { test, expect } from "@playwright/test";
test("multi-year records remain browsable, and latest strength is separate from personal best", async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "기본 측정 세트 선택", exact: true })
    .click();
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
            (m: { kind: string }) => m.kind === "best",
          );
          row.data.entries = [
            {
              id: "old",
              metricId: m.id,
              date: "2020-02-29",
              value: 30,
              note: "예전 최고",
              createdAt: "2020-02-29T12:00:00Z",
            },
            {
              id: "recent",
              metricId: m.id,
              date: "2026-01-02",
              value: 20,
              note: "다시 시작",
              createdAt: "2026-01-02T12:00:00Z",
            },
          ];
          row.data.journals = [
            {
              date: "2018-01-01",
              win: "첫 일기",
              story: "오래된 이야기",
              next: "",
              updatedAt: "2018-01-01T12:00:00Z",
            },
          ];
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
  await expect(page.locator(".recent-performance")).toContainText(
    "최근 20 회 · 역대 최고 30 회",
  );
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "나의 능력치", exact: true })
    .click();
  await page.getByLabel("기록 연도", { exact: true }).selectOption("2020");
  await expect(page.getByLabel("달력 월", { exact: true })).toHaveValue(
    "2020-02",
  );
  await expect(page.locator(".month-calendar .calendar-day")).toHaveCount(29);
  await page
    .getByRole("button", { name: "2020-02-29 기록 1개", exact: true })
    .click();
  await expect(page.locator(".day-records")).toContainText("30 회");
  await page.getByRole("button", { name: "이전 달", exact: true }).click();
  await expect(page.getByLabel("달력 월", { exact: true })).toHaveValue(
    "2020-01",
  );
  await page
    .getByRole("button", { name: "첫 기록으로 이동", exact: true })
    .click();
  await expect(page.locator(".day-records")).toContainText("오래된 이야기");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".activity-calendar").screenshot({
    path: "docs/preview-history-mobile.png",
    style: ".mobile-nav,.toast {visibility:hidden;}",
  });
  await page.getByLabel("캘린더 조회 날짜").fill("2026-01-02");
  await page.locator(".day-record-row").click();
  await expect(page.locator(".performance-summary")).toContainText("20");
  await expect(page.locator(".performance-summary")).toContainText("30");
  await expect(page.locator(".performance-summary")).toContainText("-10 회");
});
