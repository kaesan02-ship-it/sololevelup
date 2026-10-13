import { type Entry, type Metric, fmt } from "@/lib/model";
import { performance } from "@/lib/history";
export function Performance({
  metric,
  entries,
}: {
  metric: Metric;
  entries: Entry[];
}) {
  if (metric.kind !== "best") return null;
  const p = performance(metric, entries);
  if (!p.latest) return null;
  return (
    <div className="performance-summary">
      <div>
        <small>가장 최근 기록 · {p.latest.date}</small>
        <strong>
          {fmt(p.latest.value)} <small>{metric.unit}</small>
        </strong>
      </div>
      <div>
        <small>역대 최고 기록</small>
        <strong>
          {fmt(p.best)} <small>{metric.unit}</small>
        </strong>
      </div>
      <p>
        {p.delta !== null
          ? `직전 기록보다 ${p.delta > 0 ? "+" : ""}${fmt(p.delta)} ${metric.unit}. `
          : ""}
        {p.belowBest
          ? "최근 기록은 역대 최고에 미치지 못했어요."
          : "최근 기록이 역대 최고와 같아요."}{" "}
        같은 자세·운동 조건에서 비교해보세요. 기록하지 않은 기간의 능력은
        추정하지 않아요.
      </p>
    </div>
  );
}
