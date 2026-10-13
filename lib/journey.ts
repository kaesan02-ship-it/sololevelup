import { type Data, xpBreakdown, XP_RULES } from "./model";
export const stages = [
  {
    level: 1,
    name: "첫걸음 탐험가",
    caption: "작은 기록으로 여정을 시작해요.",
  },
  {
    level: 5,
    name: "습관의 개척자",
    caption: "반복한 실천이 나만의 길이 되었어요.",
  },
  {
    level: 10,
    name: "꾸준한 도전자",
    caption: "쌓아온 기록이 나의 성장을 보여줘요.",
  },
  {
    level: 20,
    name: "성장의 길잡이",
    caption: "나에게 맞는 속도로 계속 나아가요.",
  },
];
export function journeyStage(total: number) {
  const level = 1 + Math.floor(Math.max(0, total) / XP_RULES.perLevel);
  const index = stages.findLastIndex((s) => level >= s.level);
  return {
    level,
    index,
    current: stages[index],
    next: stages[index + 1] ?? null,
  };
}
export function dailyQuests(data: Data, date: string) {
  const eligible = new Set(
    xpBreakdown(data, date)
      .rows.filter((r) => r.eligible)
      .map((r) => r.id),
  );
  return data.metrics
    .filter((m) => !m.archived && m.kind !== "measure")
    .sort((a, b) => Number(b.pinned) - Number(a.pinned))
    .slice(0, 3)
    .map((metric) => ({ metric, done: eligible.has(metric.id) }));
}
