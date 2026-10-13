import { test, expect } from "@playwright/test";
import type { Data } from "../../lib/model";
test("two devices sync, preserve offline edits and stop on conflicts", async ({
  browser,
}) => {
  const owner = "2dc45452-76f1-4828-ae30-09d4e4c41e11";
  let remote: { payload: Data; version: number; updated_at: string } | null =
    null;
  let writes = 0;
  let missingSchema = false;
  let holdSecondRead: Promise<void> | null = null;
  let notifyHeld: (() => void) | null = null;
  const jwt =
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ) +
    "." +
    Buffer.from(
      JSON.stringify({
        sub: owner,
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: "authenticated",
        role: "authenticated",
      }),
    ).toString("base64url") +
    ".test_signature";
  const auth = {
    access_token: jwt,
    refresh_token: "test-refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: owner,
      aud: "authenticated",
      role: "authenticated",
      email: "growth@example.test",
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
  const a = await browser.newContext(),
    b = await browser.newContext();
  for (const context of [a, b])
    await context.route("https://sync-test.supabase.co/**", async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      const headers = {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "content-type": "application/json",
      };
      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers });
        return;
      }
      if (url.pathname === "/auth/v1/token") {
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify(auth),
        });
        return;
      }
      if (url.pathname === "/auth/v1/user") {
        if (request.method() === "PUT") {
          expect(request.postDataJSON().current_password).toBe("test-password");
          expect(request.postDataJSON().password).toBe("new-test-password");
        }
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify(auth.user),
        });
        return;
      }
      if (url.pathname === "/rest/v1/growth_saves") {
        if (missingSchema) {
          await route.fulfill({
            status: 404,
            headers,
            body: JSON.stringify({
              code: "PGRST205",
              message: "Could not find growth_saves",
            }),
          });
          return;
        }
        if (context === b && holdSecondRead) {
          notifyHeld?.();
          await holdSecondRead;
        }
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify(remote ? [remote] : []),
        });
        return;
      }
      if (url.pathname === "/rest/v1/rpc/save_growth_data") {
        const payload = request.postDataJSON();
        if (payload.expected_version !== (remote?.version ?? 0)) {
          await route.fulfill({
            status: 400,
            headers,
            body: JSON.stringify({ code: "P0001", message: "sync_conflict" }),
          });
          return;
        }
        remote = {
          payload: payload.new_payload,
          version: (remote?.version ?? 0) + 1,
          updated_at: new Date().toISOString(),
        };
        writes++;
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify(remote.version),
        });
        return;
      }
      await route.fulfill({ status: 404, headers, body: "{}" });
    });
  const first = await a.newPage(),
    second = await b.newPage();
  async function login(page: typeof first) {
    await page.goto("http://127.0.0.1:3001");
    await page
      .getByRole("button", { name: "기본 측정 세트 선택", exact: true })
      .click();
    await page.getByRole("button", { name: "나의 여정 시작하기" }).click();
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "설정", exact: true })
      .click();
    await page.getByLabel("이메일").fill("growth@example.test");
    await page.getByLabel("비밀번호").fill("test-password");
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page.locator(".sync-panel .install-status")).toHaveText(
      "연결할 기록 선택",
    );
  }
  await login(first);
  await first.getByText("비밀번호 변경", { exact: true }).click();
  await first
    .getByLabel("현재 비밀번호", { exact: true })
    .fill("test-password");
  await first
    .getByLabel("새 비밀번호", { exact: true })
    .fill("new-test-password");
  await first
    .getByLabel("새 비밀번호 확인", { exact: true })
    .fill("different-password");
  await first
    .getByRole("button", { name: "비밀번호 변경 저장", exact: true })
    .click();
  await expect(
    first.getByText("새 비밀번호가 서로 달라요.", { exact: true }),
  ).toBeVisible();
  await first
    .getByLabel("새 비밀번호 확인", { exact: true })
    .fill("new-test-password");
  await first
    .getByRole("button", { name: "비밀번호 변경 저장", exact: true })
    .click();
  await expect(
    first.getByText("비밀번호를 변경했어요.", { exact: true }),
  ).toBeVisible();
  missingSchema = true;
  await first.getByRole("button", { name: "이 기기의 기록 사용" }).click();
  await expect(first.locator(".sync-panel .install-status")).toHaveText(
    "동기화 저장 공간 준비 필요",
  );
  expect(writes).toBe(0);
  missingSchema = false;
  await first.getByRole("button", { name: "지금 동기화", exact: true }).click();
  await expect(first.locator(".sync-panel .install-status")).toHaveText(
    "연결할 기록 선택",
  );
  await first.getByRole("button", { name: "이 기기의 기록 사용" }).click();
  await expect(first.locator(".sync-panel .install-status")).toHaveText(
    "동기화 완료",
  );
  expect(writes).toBe(1);
  await login(second);
  second.on("dialog", (dialog) => dialog.accept());
  let releaseRead!: () => void;
  const held = new Promise<void>((resolve) => {
    notifyHeld = resolve;
  });
  holdSecondRead = new Promise<void>((resolve) => {
    releaseRead = resolve;
  });
  await second.getByRole("button", { name: "클라우드 기록 사용" }).click();
  await held;
  await record(second, "7");
  holdSecondRead = null;
  releaseRead();
  await second
    .locator(".sidebar")
    .getByRole("button", { name: "설정", exact: true })
    .click();
  await expect(second.locator(".sync-panel .install-status")).toHaveText(
    "동기화 재시도 필요",
  );
  await second
    .locator(".sidebar")
    .getByRole("button", { name: "상태창", exact: true })
    .click();
  await expect(second.getByText("7 쪽 기록했어요")).toBeVisible();
  await second
    .locator(".sidebar")
    .getByRole("button", { name: "설정", exact: true })
    .click();
  await second.getByRole("button", { name: "클라우드 기록 사용" }).click();
  await expect(second.locator(".sync-panel .install-status")).toHaveText(
    "동기화 완료",
  );
  async function record(page: typeof first, value: string) {
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "상태창", exact: true })
      .click();
    await page.getByRole("button", { name: "독서 기록", exact: true }).click();
    await page.getByLabel("기록값 · 쪽").fill(value);
    await page.getByRole("button", { name: "기록 저장" }).click();
    await expect(page.getByText(value + " 쪽 기록했어요")).toBeVisible();
  }
  await a.setOffline(true);
  await record(first, "20");
  await first
    .locator(".sidebar")
    .getByRole("button", { name: "설정", exact: true })
    .click();
  await expect(first.locator(".sync-panel .install-status")).toContainText(
    "오프라인",
  );
  await record(second, "30");
  await expect.poll(() => writes).toBe(2);
  const cloudEntries = remote!.payload.entries;
  expect(cloudEntries.reduce((sum, e) => sum + e.value, 0)).toBe(30);
  await a.setOffline(false);
  await expect(first.locator(".sync-panel .install-status")).toHaveText(
    "두 기기의 변경 확인 필요",
  );
  expect(writes).toBe(2);
  await first
    .locator(".sidebar")
    .getByRole("button", { name: "상태창", exact: true })
    .click();
  await expect(first.getByText("20 쪽 기록했어요")).toBeVisible();
  await first
    .locator(".sidebar")
    .getByRole("button", { name: "설정", exact: true })
    .click();
  first.on("dialog", (dialog) => dialog.accept());
  await first.getByRole("button", { name: "클라우드 기록 사용" }).click();
  await expect(first.locator(".sync-panel .install-status")).toHaveText(
    "동기화 완료",
  );
  await first
    .locator(".sidebar")
    .getByRole("button", { name: "상태창", exact: true })
    .click();
  await expect(first.getByText("30 쪽 기록했어요")).toBeVisible();
  await first
    .getByRole("button", {
      name: "오늘을 한 문장으로 남겨볼까요?",
      exact: false,
    })
    .click();
  await first
    .getByLabel("오늘 잘한 일", { exact: true })
    .fill("두 기기에 이어지는 회고");
  await first.getByRole("button", { name: "회고 저장", exact: true }).click();
  await expect
    .poll(() => remote?.payload.journals?.[0]?.win)
    .toBe("두 기기에 이어지는 회고");
  await second
    .locator(".sidebar")
    .getByRole("button", { name: "설정", exact: true })
    .click();
  await second
    .getByRole("button", { name: "지금 동기화", exact: true })
    .click();
  await expect(second.locator(".sync-panel .install-status")).toHaveText(
    "동기화 완료",
  );
  await second
    .locator(".sidebar")
    .getByRole("button", { name: "상태창", exact: true })
    .click();
  await second
    .getByRole("button", { name: "오늘의 회고 돌아보기", exact: false })
    .click();
  await expect(second.getByLabel("오늘 잘한 일", { exact: true })).toHaveValue(
    "두 기기에 이어지는 회고",
  );
  await a.close();
  await b.close();
});
