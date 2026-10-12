import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyData,
  today,
  presets,
  aggregate,
  xp,
  range,
  shift,
  weekDates,
  validateEntry,
  validateBackup,
  achievements,
  goalValue,
  type Entry,
  type Metric,
} from "../lib/model";
const metric = (index = 0): Metric => ({
  ...presets[index],
  id: "metric" + index,
});
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
test("measurement uses latest date, cumulative adds sessions, missing stays null", () => {
  const entries = [entry("a", "2026-01-02", 72), entry("b", "2026-01-01", 73)];
  assert.equal(aggregate(metric(), entries), 72);
  assert.equal(aggregate(metric(3), entries), 145);
  assert.equal(aggregate(metric(), []), null);
});
test("personal best obeys decrease direction and check counts distinct dates", () => {
  const list = [
    entry("a", "2026-01-01", 20),
    entry("b", "2026-01-01", 30),
    entry("c", "2026-01-02", 25),
  ];
  assert.equal(aggregate(metric(2), list), 30);
  assert.equal(aggregate({ ...metric(2), direction: "down" }, list), 20);
  assert.equal(aggregate(metric(5), list), 2);
});
test("XP deduplicates daily metric, caps at 50, recomputes after deletion and preserves archived", () => {
  const d = emptyData();
  d.metrics = presets.map((_, i) => ({ ...metric(i), archived: true }));
  d.entries = d.metrics.map((m, i) => entry("e" + i, "2026-01-01", 1, m.id));
  d.entries.push(entry("repeat", "2026-01-01", 2, "metric0"));
  assert.equal(xp(d), 50);
  d.entries = d.entries.filter((e) => e.metricId === "metric0");
  assert.equal(xp(d), 10);
  d.entries = [];
  assert.equal(xp(d), 0);
});
test("zero measurement rewards presence while zero activity does not", () => {
  const d = emptyData();
  d.metrics = [metric(0), metric(3)];
  d.entries = [
    entry("a", "2026-01-01", 0),
    entry("b", "2026-01-01", 0, "metric3"),
  ];
  assert.equal(xp(d), 10);
});
test("date intervals cross month and leap year; week uses Monday", () => {
  assert.deepEqual(range("2024-03-01", 3), [
    "2024-02-28",
    "2024-02-29",
    "2024-03-01",
  ]);
  assert.equal(shift("2026-01-01", -1), "2025-12-31");
  assert.equal(weekDates("2026-01-04")[0], "2025-12-29");
  assert.equal(weekDates("2026-01-05")[0], "2026-01-05");
});
test("numeric and date validation rejects invalid precision, fractions, future and impossible dates", () => {
  assert.throws(() => validateEntry(metric(3), -1, "2026-01-01", "2026-01-02"));
  assert.throws(() =>
    validateEntry(metric(4), 2.5, "2026-01-01", "2026-01-02"),
  );
  assert.throws(() => validateEntry(metric(), NaN, "2026-01-01", "2026-01-02"));
  assert.throws(() =>
    validateEntry(metric(), 1.0001, "2026-01-01", "2026-01-02"),
  );
  assert.throws(() => validateEntry(metric(), 1, "2026-02-30", "2026-03-01"));
  assert.throws(() => validateEntry(metric(), 1, "2026-01-03", "2026-01-02"));
  assert.doesNotThrow(() =>
    validateEntry(metric(), -1.25, "2026-01-01", "2026-01-02"),
  );
});
test("backup round trip validates; rejects duplicate IDs, dangling references and duplicate daily measurement", () => {
  const d = emptyData();
  d.metrics = [metric()];
  d.entries = [entry("a", "2026-01-01", 70)];
  assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(d))), d);
  assert.throws(() => validateBackup({ ...d, schemaVersion: 2 }));
  assert.throws(() =>
    validateBackup({
      ...d,
      entries: [...d.entries, entry("a", "2026-01-02", 70)],
    }),
  );
  assert.throws(() =>
    validateBackup({
      ...d,
      entries: [entry("b", "2026-01-01", 70, "missing")],
    }),
  );
  assert.throws(() =>
    validateBackup({
      ...d,
      entries: [...d.entries, entry("b", "2026-01-01", 71)],
    }),
  );
  assert.throws(() =>
    validateBackup({ ...d, metrics: [{ ...metric(), kind: "invalid" }] }),
  );
});
test("weekly goal and final target use separate periods", () => {
  const m = metric(3);
  const entries = [
    entry("a", "2026-01-04", 50, m.id),
    entry("b", "2026-01-05", 20, m.id),
  ];
  assert.equal(goalValue(m, entries, "2026-01-06"), 20);
  assert.equal(goalValue({ ...m, kind: "best" }, entries, "2026-01-06"), 50);
});
test("first record is not a personal-best achievement; strict improvement is", () => {
  const d = emptyData();
  d.metrics = [metric(2)];
  d.entries = [entry("a", "2026-01-01", 10, "metric2")];
  assert.equal(achievements(d)[2].earned, false);
  d.entries.push(entry("b", "2026-01-02", 10, "metric2"));
  assert.equal(achievements(d)[2].earned, false);
  d.entries.push(entry("c", "2026-01-03", 11, "metric2"));
  assert.equal(achievements(d)[2].earned, true);
  d.entries.pop();
  assert.equal(achievements(d)[2].earned, false);
});

test("backup survives timezone changes but rejects dates beyond today anywhere", () => {
  const data = emptyData();
  data.profile.timezone = "Etc/GMT+12";
  data.metrics = [{ ...presets[0], id: "timezone-metric" }];
  const latestDate = today("Pacific/Kiritimati");
  data.entries = [
    {
      id: "timezone-entry",
      metricId: "timezone-metric",
      date: latestDate,
      value: 70,
      note: "",
      createdAt: new Date().toISOString(),
    },
  ];
  assert.equal(validateBackup(data).entries[0].date, latestDate);
  data.entries[0].date = shift(latestDate, 1);
  assert.throws(() => validateBackup(data));
});
