import { spawnSync } from "node:child_process";
function run(args, env = process.env) {
  const result = spawnSync("npm", args, { stdio: "inherit", env });
  if (result.status !== 0)
    throw Error(`Command failed (${result.status}): npm ${args.join(" ")}`);
}
let failed = false;
try {
  run(["run", "build"], {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: "https://sync-test.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_fixture",
  });
  run([
    "exec",
    "--",
    "playwright",
    "test",
    "--config",
    "playwright.cloud.config.ts",
  ]);
} catch (error) {
  failed = true;
  console.error(error.message);
} finally {
  try {
    run(["run", "build"]);
  } catch {
    failed = true;
  }
}
process.exitCode = failed ? 1 : 0;
