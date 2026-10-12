import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyData, presets, type Entry, type Metric } from "../lib/model";
import {
  streaks,
  goalStatus,
  categoryActivity,
  snapshotMetrics,
  summarize,
} from "../lib/stats";
const metric = (i: number): Metric => ({ ...presets[i], id: "metric" + i });
const entry = (
  id: string,
  date: string,
  value: number,
  metricId = "metric0",
): Entry => ({
  id,
  date,
  value,
  metricId,
  note: "",
  createdAt: date + "T12:00:00Z",
});
test("streak preserves yesterday before today is recorded and spans leap days", () => {
  assert.deepEqual(
    streaks(["2024-02-28", "2024-02-29", "2024-02-29"], "2024-03-01"),
    { current: 2, longest: 2 },
  );
  assert.deepEqual(
    streaks(
      ["2024-02-28", "2024-02-29", "2024-03-01", "2024-03-04"],
      "2024-03-04",
    ),
    { current: 1, longest: 3 },
  );
  assert.equal(streaks(["2024-03-01"], "2024-03-03").current, 0);
});
test("neutral measurement goal infers direction from baseline, not higher is better", () => {
  const m = { ...metric(0), goal: 70 };
  const list = [entry("a", "2026-01-01", 75), entry("b", "2026-01-02", 74)];
  const goal = goalStatus(m, list, "2026-01-02");
  assert.equal(goal.achieved, false);
  assert.equal(goal.progress, 20);
  assert.equal(goal.remaining, 4);
  assert.equal(
    goalStatus(m, [...list, entry("c", "2026-01-03", 69)], "2026-01-03")
      .achieved,
    true,
  );
  assert.equal(
    goalStatus({ ...m, goal: 75 }, [...list], "2026-01-02").achieved,
    false,
  );
});
test("weekly goals exclude previous week and downward best is not achieved prematurely", () => {
  const m = { ...metric(3), goal: 100 };
  const list = [
    entry("a", "2026-01-04", 100, m.id),
    entry("b", "2026-01-05", 20, m.id),
  ];
  assert.equal(goalStatus(m, list, "2026-01-06").progress, 20);
  const best = { ...metric(2), direction: "down" as const, goal: 10 };
  assert.equal(
    goalStatus(best, [entry("c", "2026-01-06", 20, best.id)], "2026-01-06")
      .progress,
    50,
  );
});
test("category stats count unique active days and exclude zero activity", () => {
  const d = emptyData();
  d.metrics = [metric(3), metric(4), metric(0)];
  d.entries = [
    entry("a", "2026-01-05", 10, "metric3"),
    entry("b", "2026-01-05", 20, "metric4"),
    entry("c", "2026-01-06", 0, "metric3"),
    entry("d", "2026-01-06", 0, "metric0"),
  ];
  const categories = categoryActivity(d, "2026-01-06", 7);
  assert.equal(categories.find((c) => c.id === "learn")!.activeDays, 1);
  assert.equal(categories.find((c) => c.id === "body")!.activeDays, 1);
  assert.equal(summarize(d, "2026-01-06", 7).periodDays, 2);
  assert.equal(summarize(d, "2026-01-06", 7).periodRecords, 4);
});
test("snapshot modes support all/custom metrics, recency, categories and archive exclusions", () => {
  const d = emptyData();
  d.metrics = [metric(0), metric(3), { ...metric(4), archived: true }];
  d.entries = [
    entry("a", "2026-01-01", 70),
    entry("b", "2026-01-02", 20, "metric3"),
  ];
  assert.deepEqual(
    snapshotMetrics(d, "recent", "all").map((m) => m.id),
    ["metric3", "metric0"],
  );
  assert.equal(snapshotMetrics(d, "all", "learn").length, 1);
  assert.equal(snapshotMetrics(d, "pinned", "all").length, 2);
  d.metrics[0].pinned = false;
  assert.equal(snapshotMetrics(d, "pinned", "all").length, 1);
});
