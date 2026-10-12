import {
  type Data,
  type Metric,
  type Entry,
  aggregate,
  periodEntries,
  range,
  shift,
  xp,
  goalValue,
  achievements,
  XP_RULES,
} from "./model";
export const MAX_PINNED = 8;
export function validActivity(metric: Metric, entry: Entry) {
  return metric.kind === "measure" || entry.value > 0;
}
export function activityEntries(data: Data) {
  const metrics = new Map(data.metrics.map((m) => [m.id, m]));
  return data.entries.filter((e) => {
    const m = metrics.get(e.metricId);
    return !!m && validActivity(m, e);
  });
}
export function streaks(dates: string[], date: string) {
  const unique = [...new Set(dates.filter((d) => d <= date))].sort();
  let longest = 0,
    run = 0,
    previous = "";
  for (const d of unique) {
    run = previous && shift(previous, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = d;
  }
  const days = new Set(unique);
  let cursor = days.has(date) ? date : shift(date, -1),
    current = 0;
  while (days.has(cursor)) {
    current++;
    cursor = shift(cursor, -1);
  }
  return { current, longest };
}
export function goalStatus(metric: Metric, entries: Entry[], date: string) {
  const value = goalValue(metric, entries, date),
    target = metric.goal;
  if (value === null || target === null)
    return { value, target, achieved: false, progress: 0, remaining: target };
  const all = entries
    .filter((e) => e.metricId === metric.id)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
    );
  const baseline = all[0]?.value ?? value;
  const direction =
    metric.direction === "none" && metric.kind === "measure"
      ? target > baseline
        ? "up"
        : target < baseline
          ? "down"
          : "equal"
      : metric.direction;
  const achieved =
    direction === "equal"
      ? value === target
      : direction === "down"
        ? value <= target
        : value >= target;
  let progress = 0;
  if (achieved) progress = 100;
  else if (metric.kind === "measure")
    progress =
      target === baseline
        ? 0
        : ((value - baseline) / (target - baseline)) * 100;
  else if (metric.kind === "best" && direction === "down")
    progress = value === 0 ? 100 : (target / value) * 100;
  else progress = (value / target) * 100;
  return {
    value,
    target,
    achieved,
    progress: Math.max(0, Math.min(100, progress)),
    remaining: achieved ? 0 : Math.abs(target - value),
  };
}
export function summarize(data: Data, date: string, days: number) {
  const dates = range(date, days),
    entries = activityEntries(data),
    period = entries.filter((e) => dates.includes(e.date)),
    history = entries.filter((e) => e.date <= date);
  const { current, longest } = streaks(
    history.map((e) => e.date),
    date,
  );
  const totalXp = xp(data);
  const goals = data.metrics.filter((m) => !m.archived && m.goal !== null);
  const todayData = {
    ...data,
    entries: data.entries.filter((e) => e.date === date),
  };
  return {
    totalXp,
    level: 1 + Math.floor(totalXp / XP_RULES.perLevel),
    todayXp: xp(todayData),
    currentStreak: current,
    longestStreak: longest,
    activeDays: new Set(history.map((e) => e.date)).size,
    periodDays: new Set(period.map((e) => e.date)).size,
    periodRecords: data.entries.filter((e) => dates.includes(e.date)).length,
    totalRecords: data.entries.length,
    startDate: history.map((e) => e.date).sort()[0] ?? null,
    goals: goals.length,
    achievedGoals: goals.filter(
      (m) => goalStatus(m, data.entries, date).achieved,
    ).length,
    badges: achievements(data).filter((a) => a.earned).length,
  };
}
export function categoryActivity(data: Data, date: string, days: number) {
  const dates = range(date, days),
    period = activityEntries(data).filter((e) => dates.includes(e.date));
  const categories = [
    ...data.categories,
    { id: "", name: "미분류", color: "#9470c4" },
  ];
  return categories
    .map((c) => {
      const metrics = data.metrics.filter((m) => m.categoryId === c.id),
        ids = new Set(metrics.map((m) => m.id)),
        entries = period.filter((e) => ids.has(e.metricId)),
        activeDays = new Set(entries.map((e) => e.date)).size;
      return {
        ...c,
        activeDays,
        records: entries.length,
        metrics: metrics.filter((m) => !m.archived).length,
        percent: Math.round((activeDays / days) * 100),
      };
    })
    .filter((c) => c.metrics > 0 || c.records > 0);
}
export function metricSnapshot(
  metric: Metric,
  data: Data,
  date: string,
  days: number,
) {
  const current = range(date, days),
    previous = range(shift(date, -days), days);
  const entries = data.entries.filter((e) => e.metricId === metric.id);
  const now = aggregate(metric, periodEntries(entries, metric.id, current)),
    before = aggregate(metric, periodEntries(entries, metric.id, previous));
  const latest = [...entries].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  )[0];
  return {
    now,
    before,
    delta: now !== null && before !== null ? now - before : null,
    latest,
    best: metric.kind === "best" ? aggregate(metric, entries) : null,
    count: entries.length,
  };
}
export function snapshotMetrics(
  data: Data,
  mode: "pinned" | "recent" | "all",
  category: string,
) {
  let list = data.metrics.filter(
    (m) => !m.archived && (category === "all" || m.categoryId === category),
  );
  if (mode === "pinned") list = list.filter((m) => m.pinned);
  if (mode === "recent") {
    const latest = new Map<string, string>();
    for (const e of data.entries) {
      const key = e.date + " " + e.createdAt;
      if (key > (latest.get(e.metricId) ?? "")) latest.set(e.metricId, key);
    }
    list = list
      .filter((m) => latest.has(m.id))
      .sort((a, b) =>
        (latest.get(b.id) ?? "").localeCompare(latest.get(a.id) ?? ""),
      );
  }
  return list;
}
