import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyData,
  presets,
  validateBackup,
  xp,
  type Journal,
} from "../lib/model";
import { journeyStage, dailyQuests } from "../lib/journey";
const journal: Journal = {
  date: "2026-01-01",
  win: "산책",
  story: "기분이 좋았다",
  next: "점심 후 5분 걷기",
  updatedAt: "2026-01-01T12:00:00Z",
};
test("old backups remain compatible; reflection roundtrips without earning XP", () => {
  const d = emptyData();
  assert.equal(validateBackup(d).journals, undefined);
  d.journals = [journal];
  assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(d))).journals, [
    journal,
  ]);
  assert.equal(xp(d), 0);
});
test("reject duplicate, malformed, future, empty and oversized reflections", () => {
  for (const journals of [
    [journal, journal],
    [{ ...journal, date: "2026-02-30" }],
    [{ ...journal, date: "9999-01-01" }],
    [{ ...journal, story: "x".repeat(2001) }],
    [{ ...journal, win: "", story: " ", next: "" }],
    [null],
  ])
    assert.throws(() => validateBackup({ ...emptyData(), journals }));
});
test("quest completion follows eligible XP records and omits archived/measurement metrics", () => {
  const d = emptyData();
  d.metrics = presets.slice(0, 6).map((m, i) => ({ ...m, id: `m${i}` }));
  d.entries = [
    {
      id: "e",
      metricId: "m3",
      date: "2026-01-01",
      value: 0,
      note: "",
      createdAt: "2026-01-01T12:00:00Z",
    },
  ];
  assert.equal(
    dailyQuests(d, "2026-01-01").some((q) => q.metric.kind === "measure"),
    false,
  );
  assert.equal(
    dailyQuests(d, "2026-01-01").find((q) => q.metric.id === "m3")?.done,
    false,
  );
  d.entries[0].value = 1;
  assert.equal(
    dailyQuests(d, "2026-01-01").find((q) => q.metric.id === "m3")?.done,
    true,
  );
  d.metrics[3].archived = true;
  assert.equal(
    dailyQuests(d, "2026-01-01").some((q) => q.metric.id === "m3"),
    false,
  );
});
test("stage boundaries follow existing XP rules, including beyond final title", () => {
  assert.equal(journeyStage(399).current.level, 1);
  assert.equal(journeyStage(400).current.level, 5);
  assert.equal(journeyStage(900).current.level, 10);
  assert.equal(journeyStage(2500).next, null);
  assert.equal(journeyStage(2500).level, 26);
});
