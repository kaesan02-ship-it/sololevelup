import { type Data, type Entry, type Metric, aggregate, shift } from "./model";
export function monthDates(month: string) {
  const first = month + "-01";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return [];
  const result: string[] = [];
  let cursor = first;
  while (cursor.startsWith(month)) {
    result.push(cursor);
    if (result.length === 31) break;
    cursor = shift(cursor, 1);
  }
  return result;
}
export function moveMonth(month: string, amount: number) {
  const [year, m] = month.split("-").map(Number);
  const index = year * 12 + m - 1 + amount;
  return `${String(Math.floor(index / 12)).padStart(4, "0")}-${String((index % 12) + 1).padStart(2, "0")}`;
}
export function historyIndex(data: Data) {
  const counts = new Map<string, number>();
  for (const entry of data.entries)
    counts.set(entry.date, (counts.get(entry.date) ?? 0) + 1);
  const journals = new Map((data.journals ?? []).map((j) => [j.date, j]));
  const dates = [...new Set([...counts.keys(), ...journals.keys()])].sort();
  return {
    counts,
    journals,
    dates,
    years: [...new Set(dates.map((d) => d.slice(0, 4)))],
  };
}
export function performance(metric: Metric, entries: Entry[]) {
  const list = entries
    .filter((e) => e.metricId === metric.id)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.createdAt.localeCompare(a.createdAt) ||
        b.id.localeCompare(a.id),
    );
  const latest = list[0],
    previous = list[1];
  const best = aggregate(metric, list);
  return {
    latest,
    previous,
    best,
    delta: latest && previous ? latest.value - previous.value : null,
    belowBest:
      !!latest &&
      best !== null &&
      (metric.direction === "down" ? latest.value > best : latest.value < best),
  };
}
