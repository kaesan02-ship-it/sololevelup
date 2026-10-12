import {
  practices,
  practiceMetric,
  practiceCategories,
  recommendedStart,
} from "./practices";
import { parsePhoto } from "./photo";
export type Kind = "measure" | "best" | "amount" | "time" | "check";
export type Metric = {
  id: string;
  name: string;
  kind: Kind;
  unit: string;
  direction: "up" | "down" | "none";
  categoryId: string;
  goal: number | null;
  pinned: boolean;
  archived: boolean;
  practiceId?: string;
};
export type Entry = {
  id: string;
  metricId: string;
  date: string;
  value: number;
  note: string;
  createdAt: string;
};
export type Category = { id: string; name: string; color: string };
export type Data = {
  schemaVersion: 1;
  profile: { nickname: string; timezone: string; photo?: string };
  categories: Category[];
  metrics: Metric[];
  entries: Entry[];
  initialized: boolean;
  lastBackup: string | null;
};
export const kinds: Record<Kind, string> = {
  measure: "수치 측정",
  best: "최고 기록",
  amount: "수량 누적",
  time: "시간 누적",
  check: "완료 체크",
};
export function emptyData(): Data {
  return {
    schemaVersion: 1,
    profile: {
      nickname: "플레이어",
      timezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul",
    },
    categories: [
      { id: "body", name: "신체", color: "#9d8dff" },
      { id: "exercise", name: "운동", color: "#64dec6" },
      { id: "learn", name: "학습", color: "#efbe76" },
      { id: "life", name: "생활", color: "#8db7fa" },
      ...practiceCategories,
    ],
    metrics: [],
    entries: [],
    initialized: false,
    lastBackup: null,
  };
}
export const presets: Omit<Metric, "id">[] = [
  {
    name: "체중",
    kind: "measure",
    unit: "kg",
    direction: "none",
    categoryId: "body",
    goal: null,
    pinned: true,
    archived: false,
  },
  {
    name: "골격근량",
    kind: "measure",
    unit: "kg",
    direction: "none",
    categoryId: "body",
    goal: null,
    pinned: false,
    archived: false,
  },
  {
    name: "푸시업 최대 기록",
    kind: "best",
    unit: "회",
    direction: "up",
    categoryId: "exercise",
    goal: null,
    pinned: true,
    archived: false,
  },
  {
    name: "독서",
    kind: "amount",
    unit: "쪽",
    direction: "up",
    categoryId: "learn",
    goal: null,
    pinned: true,
    archived: false,
  },
  {
    name: "집중 공부",
    kind: "time",
    unit: "분",
    direction: "up",
    categoryId: "learn",
    goal: null,
    pinned: false,
    archived: false,
  },
  {
    name: "스트레칭",
    kind: "check",
    unit: "일",
    direction: "none",
    categoryId: "life",
    goal: null,
    pinned: true,
    archived: false,
  },
];
export const LEGACY_PRESET_COUNT = presets.length;
presets.push(...practices.map(practiceMetric));
export const RECOMMENDED_PRESET_INDICES = practices
  .map((p, i) =>
    recommendedStart.includes(p.id) ? i + LEGACY_PRESET_COUNT : -1,
  )
  .filter((i) => i >= 0);
export const XP_RULES = {
  version: "기록 루틴 v1",
  perMetric: 10,
  dailyCap: 50,
  perLevel: 100,
} as const;
export function xpBreakdown(data: Data, date: string) {
  const rows = data.metrics
    .map((metric) => {
      const entries = data.entries.filter(
        (e) => e.metricId === metric.id && e.date === date,
      );
      const eligible = entries.some(
        (e) => metric.kind === "measure" || e.value > 0,
      );
      return {
        id: metric.id,
        name: metric.name,
        count: entries.length,
        eligible,
        points: eligible ? XP_RULES.perMetric : 0,
      };
    })
    .filter((row) => row.count > 0);
  const subtotal = rows.reduce((sum, row) => sum + row.points, 0);
  return {
    rows,
    subtotal,
    capReduction: Math.max(0, subtotal - XP_RULES.dailyCap),
    total: Math.min(XP_RULES.dailyCap, subtotal),
  };
}
export function today(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function shift(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function range(date: string, days: number) {
  return Array.from({ length: days }, (_, i) => shift(date, i - days + 1));
}
export function periodEntries(entries: Entry[], id: string, dates: string[]) {
  return entries.filter((e) => e.metricId === id && dates.includes(e.date));
}
export function aggregate(metric: Metric, entries: Entry[]): number | null {
  if (!entries.length) return null;
  if (metric.kind === "measure")
    return [...entries].sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    )[0].value;
  if (metric.kind === "best")
    return (metric.direction === "down" ? Math.min : Math.max)(
      ...entries.map((e) => e.value),
    );
  if (metric.kind === "check") return new Set(entries.map((e) => e.date)).size;
  return entries.reduce((sum, e) => sum + e.value, 0);
}
export function xp(data: Data) {
  const dates = new Map<string, Set<string>>();
  for (const e of data.entries) {
    const m = data.metrics.find((m) => m.id === e.metricId);
    if (!m || (m.kind !== "measure" && e.value <= 0)) continue;
    if (!dates.has(e.date)) dates.set(e.date, new Set());
    dates.get(e.date)!.add(m.id);
  }
  return [...dates.values()].reduce(
    (sum, ids) =>
      sum + Math.min(XP_RULES.dailyCap, ids.size * XP_RULES.perMetric),
    0,
  );
}
export function weekDates(date: string) {
  const day = new Date(date + "T12:00:00Z").getUTCDay();
  const monday = shift(date, -((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => shift(monday, i));
}
export function goalValue(metric: Metric, entries: Entry[], date: string) {
  return aggregate(
    metric,
    metric.kind === "measure" || metric.kind === "best"
      ? entries.filter((e) => e.metricId === metric.id)
      : periodEntries(entries, metric.id, weekDates(date)),
  );
}
export function achievements(data: Data) {
  const improved = data.metrics
    .filter((m) => m.kind === "best")
    .some((m) => {
      const list = data.entries
        .filter((e) => e.metricId === m.id)
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            a.createdAt.localeCompare(b.createdAt),
        );
      return list.some(
        (e, i) =>
          i > 0 &&
          (m.direction === "down"
            ? e.value < Math.min(...list.slice(0, i).map((x) => x.value))
            : e.value > Math.max(...list.slice(0, i).map((x) => x.value))),
      );
    });
  return [
    {
      name: "첫 발걸음",
      description: "첫 기록 남기기",
      earned: data.entries.length > 0,
    },
    {
      name: "꾸준한 발걸음",
      description: "서로 다른 7일 기록",
      earned: new Set(data.entries.map((e) => e.date)).size >= 7,
    },
    {
      name: "한계를 넘어서",
      description: "개인 최고 기록 갱신",
      earned: improved,
    },
  ];
}
export function validateEntry(
  metric: Metric,
  value: number,
  date: string,
  currentDate: string,
) {
  if (!Number.isFinite(value) || Math.abs(value) > 1e12)
    throw Error("유효한 숫자를 입력해주세요.");
  if (metric.kind !== "measure" && value < 0)
    throw Error("0 이상의 값을 입력해주세요.");
  if (metric.kind === "time" && !Number.isInteger(value))
    throw Error("시간은 정수 분으로 입력해주세요.");
  if (Math.abs(value * 1000 - Math.round(value * 1000)) > 0.001)
    throw Error("소수는 세 자리까지 입력할 수 있어요.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date + "T12:00:00Z").toISOString().slice(0, 10) !== date ||
    date > currentDate
  )
    throw Error("오늘까지의 올바른 날짜를 선택해주세요.");
  if (metric.kind === "check" && value !== 1)
    throw Error("완료 체크 값이 올바르지 않습니다.");
}
export function normalizeProfile(data: Data): Data {
  const photo = parsePhoto(data.profile.photo);
  return {
    ...data,
    profile: {
      nickname: data.profile.nickname,
      timezone: data.profile.timezone,
      ...(photo ? { photo } : {}),
    },
  };
}
export function validateBackup(input: unknown): Data {
  if (!input || typeof input !== "object")
    throw Error("백업 파일 형식이 올바르지 않습니다.");
  const d = input as Data;
  if (
    d.schemaVersion !== 1 ||
    !d.profile ||
    typeof d.profile.nickname !== "string" ||
    !d.profile.nickname.trim() ||
    d.profile.nickname.length > 40 ||
    typeof d.profile.timezone !== "string" ||
    !Array.isArray(d.categories) ||
    !Array.isArray(d.metrics) ||
    !Array.isArray(d.entries) ||
    typeof d.initialized !== "boolean" ||
    !(d.lastBackup === null || typeof d.lastBackup === "string")
  )
    throw Error("지원하지 않는 백업 형식입니다.");
  // A timezone change must not make a previously valid local date unimportable.
  today(d.profile.timezone); // Validate the configured timezone.
  const now = today("Pacific/Kiritimati");
  const ids = new Set<string>();
  for (const list of [d.categories, d.metrics, d.entries])
    for (const item of list) {
      if (typeof item.id !== "string" || !item.id || ids.has(item.id))
        throw Error("중복되거나 잘못된 ID가 있습니다.");
      ids.add(item.id);
    }
  for (const c of d.categories)
    if (
      typeof c.name !== "string" ||
      !c.name.trim() ||
      c.name.length > 40 ||
      !/^#[0-9a-f]{6}$/i.test(c.color)
    )
      throw Error("분류가 올바르지 않습니다.");
  for (const m of d.metrics) {
    if (
      typeof m.name !== "string" ||
      !m.name.trim() ||
      m.name.length > 40 ||
      !Object.hasOwn(kinds, m.kind) ||
      typeof m.unit !== "string" ||
      !m.unit.trim() ||
      m.unit.length > 12 ||
      !["up", "down", "none"].includes(m.direction) ||
      typeof m.pinned !== "boolean" ||
      typeof m.archived !== "boolean" ||
      (m.practiceId !== undefined &&
        (typeof m.practiceId !== "string" || m.practiceId.length > 60)) ||
      !(m.goal === null || (Number.isFinite(m.goal) && m.goal! > 0)) ||
      (m.kind === "check" &&
        m.goal !== null &&
        (!Number.isInteger(m.goal) || m.goal > 7)) ||
      (m.categoryId !== "" && !d.categories.some((c) => c.id === m.categoryId))
    )
      throw Error("항목 설정이 올바르지 않습니다.");
  }
  const unique = new Set<string>();
  for (const e of d.entries) {
    const m = d.metrics.find((m) => m.id === e.metricId);
    if (
      !m ||
      typeof e.value !== "number" ||
      typeof e.note !== "string" ||
      e.note.length > 500 ||
      typeof e.createdAt !== "string" ||
      !Number.isFinite(Date.parse(e.createdAt))
    )
      throw Error("기록이 올바르지 않습니다.");
    validateEntry(m, e.value, e.date, now);
    if (m.kind === "measure" || m.kind === "check") {
      const key = m.id + e.date;
      if (unique.has(key)) throw Error("같은 날짜의 기록이 중복되었습니다.");
      unique.add(key);
    }
  }
  return normalizeProfile(d);
}
export function fmt(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 3 }).format(
        value,
      );
}
