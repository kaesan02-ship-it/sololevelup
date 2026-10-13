import { test } from "node:test";
import assert from "node:assert/strict";
import {
  monthDates,
  moveMonth,
  historyIndex,
  performance,
} from "../lib/history";
import {
  emptyData,
  presets,
  normalizeProfile,
  validateBackup,
  type Entry,
} from "../lib/model";
test("calendar supports leap years, year transitions and full historical documents", () => {
  assert.equal(monthDates("2024-02").length, 29);
  assert.equal(monthDates("2025-02").length, 28);
  assert.equal(moveMonth("2025-01", -1), "2024-12");
  assert.equal(moveMonth("2024-12", 1), "2025-01");
  const d = emptyData();
  d.journals = [
    {
      date: "2010-02-01",
      win: "오래된 기록",
      story: "",
      next: "",
      updatedAt: "2010-02-01T00:00:00Z",
    },
  ];
  assert.deepEqual(historyIndex(validateBackup(d)).years, ["2010"]);
  assert.equal(historyIndex(d).journals.size, 1);
});
test("recent performance can fall while lifetime best stays; lower-is-better is respected", () => {
  const m = { ...presets[2], id: "push" };
  const entries: Entry[] = [30, 20].map((value, i) => ({
    id: String(i),
    metricId: m.id,
    value,
    date: `2026-01-0${i + 1}`,
    note: "",
    createdAt: `2026-01-0${i + 1}T00:00:00Z`,
  }));
  const p = performance(m, entries);
  assert.equal(p.best, 30);
  assert.equal(p.latest.value, 20);
  assert.equal(p.delta, -10);
  assert.equal(p.belowBest, true);
  const lower = performance({ ...m, direction: "down" }, entries);
  assert.equal(lower.best, 20);
  assert.equal(lower.belowBest, false);
});
test("friendly default names migrate without renaming custom metrics or changing records", () => {
  const d = emptyData();
  d.metrics = [
    { ...presets[4], id: "a", practiceId: "retrieval", name: "회상 학습" },
    { ...presets[4], id: "b", practiceId: "retrieval", name: "내 영어 공부" },
  ];
  const updated = normalizeProfile(d);
  assert.equal(updated.metrics[0].name, "배운 내용 떠올리기");
  assert.equal(updated.metrics[1].name, "내 영어 공부");
  assert.deepEqual(updated.entries, d.entries);
});
