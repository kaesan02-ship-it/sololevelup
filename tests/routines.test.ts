import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyData,
  presets,
  LEGACY_PRESET_COUNT,
  RECOMMENDED_PRESET_INDICES,
  xpBreakdown,
  xp,
  validateBackup,
} from "../lib/model";
import { practices, evidenceSources, practiceMetric } from "../lib/practices";
test("every recommended routine has source, category and valid backup metadata", () => {
  const data = emptyData();
  for (const p of practices) {
    assert.ok(evidenceSources.some((s) => s.id === p.sourceId));
    assert.ok(data.categories.some((c) => c.id === p.categoryId));
    data.metrics.push({ ...practiceMetric(p), id: p.id });
  }
  assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(data))), data);
  assert.equal(LEGACY_PRESET_COUNT, 6);
  assert.equal(RECOMMENDED_PRESET_INDICES.length, 3);
  assert.ok(RECOMMENDED_PRESET_INDICES.every((i) => !!presets[i].practiceId));
});
test("XP breakdown explains duplicate sessions, zero values, measurements and daily cap", () => {
  const data = emptyData();
  data.metrics = presets.slice(0, 6).map((m, i) => ({ ...m, id: "m" + i }));
  data.entries = data.metrics.map((m, i) => ({
    id: "e" + i,
    metricId: m.id,
    date: "2026-01-01",
    value: 1,
    note: "",
    createdAt: "2026-01-01T12:00:00Z",
  }));
  data.entries.push({ ...data.entries[3], id: "duplicate", value: 20 });
  const result = xpBreakdown(data, "2026-01-01");
  assert.equal(result.subtotal, 60);
  assert.equal(result.capReduction, 10);
  assert.equal(result.total, 50);
  assert.equal(xp(data), result.total);
  assert.equal(result.rows.find((r) => r.id === "m3")!.points, 10);
  data.entries = data.entries
    .filter((e) => e.metricId === "m0" || e.metricId === "m3")
    .map((e) => ({ ...e, value: 0 }));
  const zero = xpBreakdown(data, "2026-01-01");
  assert.equal(zero.rows.find((r) => r.id === "m0")!.eligible, true);
  assert.equal(zero.rows.find((r) => r.id === "m3")!.eligible, false);
  assert.equal(zero.total, 10);
});
