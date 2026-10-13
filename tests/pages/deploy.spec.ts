import { test, expect } from "@playwright/test";
test("exported subpath loads all assets, records and reloads offline", async ({
  page,
  context,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (e) => failures.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
  });
  await page.goto("./");
  await page.getByRole("button", { name: "나의 여정 시작하기" }).click();
  await page.getByRole("button", { name: "걷기 기록", exact: true }).click();
  await page.getByLabel("기록값 · 분").fill("10");
  await page.getByRole("button", { name: "기록 저장" }).click();
  await expect(page.getByText("10 분 기록했어요")).toBeVisible();
  await expect(page.locator(".journey-panel")).toBeVisible();
  await page.locator(".journal-invite").click();
  await page
    .getByLabel("오늘 잘한 일", { exact: true })
    .fill("배포된 회고 검증");
  await page.getByRole("button", { name: "회고 저장", exact: true }).click();
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>(
      'link[rel="manifest"]',
    )!;
    const result = await fetch(link.href);
    const data = await result.json();
    return {
      start: new URL(data.start_url, link.href).pathname,
      icon: new URL(data.icons[0].src, link.href).pathname,
    };
  });
  expect(manifest).toEqual({
    start: "/sololevelup/",
    icon: "/sololevelup/icon.svg",
  });
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "설정", exact: true })
    .click();
  await expect(
    page.getByText("오프라인 준비 완료", { exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("10 분 기록했어요")).toBeVisible();
  await page.getByRole("button", { name: "걷기 기록", exact: true }).click();
  await page.getByLabel("기록값 · 분").fill("5");
  await page.getByRole("button", { name: "기록 저장" }).click();
  await expect(page.getByText("15 분 기록했어요")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() =>
      Array.from(document.fonts).some(
        (f) => /Pretendard/i.test(f.family) && f.status === "loaded",
      ),
    ),
  ).toBeTruthy();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.locator(".journal-invite").click();
  await expect(page.getByLabel("오늘 잘한 일", { exact: true })).toHaveValue(
    "배포된 회고 검증",
  );
  expect(failures).toEqual([]);
});
