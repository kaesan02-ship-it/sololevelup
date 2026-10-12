"use client";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Dumbbell,
  Flame,
  Hexagon,
  LayoutDashboard,
  LineChart as ChartIcon,
  ListPlus,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Upload,
  X,
  Pin,
  Archive,
  MoreHorizontal,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  type Data,
  type Metric,
  type Entry,
  type Kind,
  emptyData,
  presets,
  LEGACY_PRESET_COUNT,
  RECOMMENDED_PRESET_INDICES,
  XP_RULES,
  kinds,
  today,
  range,
  shift,
  aggregate,
  periodEntries,
  xp,
  achievements,
  validateEntry,
  validateBackup,
  fmt,
} from "@/lib/model";
import { useCloudSync, SyncPanel, SyncBadge } from "./sync";
import { InstallCard } from "./install";
import { load, save, StaleDataError } from "@/lib/storage";
import { ProfilePhoto, PhotoShowcase, PhotoEditor } from "./photo";
import { PracticePicker } from "./practices";
import { XpDetails } from "./xp";
import { practices, practiceMetric } from "@/lib/practices";
import { StatsPage } from "./stats";
import {
  MAX_PINNED,
  goalStatus,
  snapshotMetrics,
  summarize,
} from "@/lib/stats";
type Tab = "home" | "stats" | "records" | "growth" | "settings";
const tabs = [
  { id: "home" as Tab, name: "상태창", icon: LayoutDashboard },
  { id: "stats" as Tab, name: "나의 스탯", icon: Shield },
  { id: "records" as Tab, name: "나의 기록", icon: ListPlus },
  { id: "growth" as Tab, name: "성장 분석", icon: ChartIcon },
  { id: "settings" as Tab, name: "설정", icon: Settings },
];
function MetricIcon({ metric, size = 20 }: { metric: Metric; size?: number }) {
  const Icon =
    metric.kind === "best"
      ? Dumbbell
      : metric.kind === "amount"
        ? BookOpen
        : metric.kind === "check"
          ? Check
          : metric.kind === "time"
            ? Flame
            : Activity;
  return <Icon size={size} />;
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button,input,select,textarea,a[href],[tabindex="0"]',
        ) ?? [],
      ).filter((e) => !e.hasAttribute("disabled"));
    focusable()[0]?.focus();
    function key(e: KeyboardEvent) {
      if (
        ref.current !==
        Array.from(document.querySelectorAll('[role="dialog"]')).at(-1)
      )
        return;
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const els = focusable();
        if (e.shiftKey && document.activeElement === els[0]) {
          e.preventDefault();
          els.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === els.at(-1)) {
          e.preventDefault();
          els[0]?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" onClick={close} aria-label="닫기">
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export default function Dashboard() {
  const [data, setData] = useState<Data>(emptyData);
  const cloud = useCloudSync(setData);
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [, refreshDate] = useState(0);
  const [tab, setTab] = useState<Tab>("home");
  const [days, setDays] = useState(7);
  const [snapshotMode, setSnapshotMode] = useState<"pinned" | "recent" | "all">(
    "pinned",
  );
  const [snapshotCategory, setSnapshotCategory] = useState("all");
  const [snapshotExpanded, setSnapshotExpanded] = useState(false);
  const [snapshotEdit, setSnapshotEdit] = useState<string[] | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [editor, setEditor] = useState<Metric | "new" | null>(null);
  const [record, setRecord] = useState<{
    metric: Metric;
    entry?: Entry;
  } | null>(null);
  const [xpModal, setXpModal] = useState(false);
  const [practiceModal, setPracticeModal] = useState(false);
  const [photoModal, setPhotoModal] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);
  const [backup, setBackup] = useState<Data | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const [choices, setChoices] = useState(RECOMMENDED_PRESET_INDICES);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    load()
      .then((d) => {
        setData(d);
        setOnboarding(!d.initialized);
        setReady(true);
      })
      .catch(() => {
        setFatal(
          "브라우저 저장소를 열 수 없습니다. 저장소 접근이 허용된 일반 브라우저에서 다시 열어주세요.",
        );
        setReady(true);
      });
  }, []);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [tab, selected]);
  useEffect(() => {
    const refresh = () => refreshDate((value) => value + 1);
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const date = today(data.profile.timezone),
    active = data.metrics.filter((m) => !m.archived),
    total = xp(data),
    level = 1 + Math.floor(total / XP_RULES.perLevel),
    current = range(date, days),
    previous = range(shift(date, -days), days);
  const snapshots = snapshotMetrics(data, snapshotMode, snapshotCategory);
  const overview = summarize(data, date, days);
  const selectedMetric = data.metrics.find((m) => m.id === selected);
  async function commit(next: Data, message = "저장했어요") {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await save(next, data);
      setData(next);
      setNotice(message);
      return true;
    } catch (err) {
      if (err instanceof StaleDataError) {
        const latest = await load();
        setData(latest);
        setOnboarding(!latest.initialized);
        setConfirm(null);
        setError(
          "다른 탭이나 동기화에서 기록이 변경되어 덮어쓰지 않았어요. 최신 기록을 확인하고 다시 저장해주세요.",
        );
        return false;
      }
      setError(
        "저장하지 못했어요. 브라우저 저장 공간과 접근 권한을 확인하고 다시 시도해주세요.",
      );
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function start() {
    if (
      await commit(
        {
          ...data,
          initialized: true,
          metrics: choices.map((i) => ({
            ...presets[i],
            pinned: presets[i].pinned || RECOMMENDED_PRESET_INDICES.includes(i),
            id: crypto.randomUUID(),
          })),
        },
        "나의 성장 여정을 시작했어요",
      )
    )
      setOnboarding(false);
  }
  function reorder(m: Metric, step: number) {
    const list = [...data.metrics];
    const index = list.findIndex((x) => x.id === m.id);
    const target = index + step;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    void commit({ ...data, metrics: list }, "항목 순서를 변경했어요");
  }
  function changeMetric(m: Metric, patch: Partial<Metric>) {
    void commit({
      ...data,
      metrics: data.metrics.map((x) =>
        x.id === m.id ? { ...x, ...patch } : x,
      ),
    });
  }
  async function toggleCheck(m: Metric) {
    const existing = data.entries.find(
      (e) => e.metricId === m.id && e.date === date,
    );
    await commit(
      {
        ...data,
        entries: existing
          ? data.entries.filter((e) => e.id !== existing.id)
          : [
              ...data.entries,
              {
                id: crypto.randomUUID(),
                metricId: m.id,
                date,
                value: 1,
                note: "",
                createdAt: new Date().toISOString(),
              },
            ],
      },
      existing ? "완료를 취소했어요" : "오늘의 실천을 기록했어요",
    );
  }
  function download(content: string, name: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function exportBackup() {
    const next = { ...data, lastBackup: new Date().toISOString() };
    download(
      JSON.stringify(
        { ...next, exportedAt: new Date().toISOString() },
        null,
        2,
      ),
      `solo-levelup-${date}.json`,
      "application/json",
    );
    await commit(next, "백업 파일을 다운로드했어요");
  }
  function exportCsv() {
    const cell = (v: string) =>
      '"' + (/^[=+\-@\t\r]/.test(v) ? "'" + v : v).replaceAll('"', '""') + '"';
    const rows = [
      ["항목", "날짜", "값", "단위", "메모"],
      ...data.entries.map((e) => {
        const m = data.metrics.find((m) => m.id === e.metricId)!;
        return [m.name, e.date, String(e.value), m.unit, e.note];
      }),
    ];
    download(
      "\ufeff" + rows.map((row) => row.map(cell).join(",")).join("\r\n"),
      `solo-records-${date}.csv`,
      "text/csv;charset=utf-8",
    );
  }
  const color = (m: Metric) =>
    (
      ({
        "#9d8dff": "#9470c4",
        "#64dec6": "#3e9d86",
        "#efbe76": "#be8b3f",
        "#8db7fa": "#6593c4",
      }) as Record<string, string>
    )[data.categories.find((c) => c.id === m.categoryId)?.color ?? ""] ??
    data.categories.find((c) => c.id === m.categoryId)?.color ??
    "#9470c4";
  function quick(m: Metric) {
    setError("");
    if (m.kind === "check") void toggleCheck(m);
    else setRecord({ metric: m });
  }
  function metricCard(m: Metric) {
    const a = aggregate(m, periodEntries(data.entries, m.id, current));
    const b = aggregate(m, periodEntries(data.entries, m.id, previous));
    const delta = a !== null && b !== null ? a - b : null;
    const good =
      delta !== null &&
      m.direction !== "none" &&
      (m.direction === "down" ? delta < 0 : delta > 0);
    return (
      <button
        className="stat-card"
        key={m.id}
        onClick={() => {
          setSelected(m.id);
          setTab("growth");
        }}
      >
        <div className="stat-top">
          <span
            className="metric-symbol"
            style={{ color: color(m), background: color(m) + "15" }}
          >
            <MetricIcon metric={m} />
          </span>
          <span>{m.name}</span>
          <ArrowRight size={16} />
        </div>
        <div className="stat-value">
          {fmt(a)} <small>{m.unit}</small>
        </div>
        <div className={"stat-change " + (good ? "positive" : "")}>
          {delta === null ? (
            <span>기록을 쌓아 변화를 확인하세요</span>
          ) : (
            <>
              <span>
                {delta > 0 ? (
                  <ArrowUp size={14} />
                ) : delta < 0 ? (
                  <ArrowDown size={14} />
                ) : null}
                {delta > 0 ? "+" : ""}
                {fmt(delta)} {m.unit}
              </span>
              <span>이전 {days}일 대비</span>
            </>
          )}
        </div>
        <div className="stat-mini">
          {m.kind === "measure"
            ? "최근 측정값"
            : m.kind === "best"
              ? "기간 최고 기록"
              : m.kind === "check"
                ? "완료한 날짜 수"
                : "기록된 합계"}
        </div>
      </button>
    );
  }
  function goals() {
    const list = active.filter((m) => m.goal !== null);
    return (
      <div className="panel goals-panel">
        <div className="section-head">
          <h2>
            <Target size={18} /> 목표 진행 상황
          </h2>
          <span className="muted">이번 주 · 월–일</span>
        </div>
        {list.length ? (
          list.map((m) => {
            const {
              value: v,
              achieved,
              progress,
            } = goalStatus(m, data.entries, date);
            const measurement = m.kind === "measure";
            return (
              <div className="goal" key={m.id}>
                <div className="goal-title">
                  <span>
                    <span className="dot" style={{ background: color(m) }} />
                    {m.name}
                    {measurement || m.kind === "best" ? (
                      <small> 최종 목표</small>
                    ) : null}
                  </span>
                  <span>
                    {fmt(v)}{" "}
                    <small>
                      / {fmt(m.goal)} {m.unit}
                    </small>
                  </span>
                </div>
                <div className="progress">
                  <span
                    style={{ width: progress + "%", background: color(m) }}
                  />
                </div>
                {measurement && v !== null && (
                  <small className="muted">
                    {achieved
                      ? "목표 달성"
                      : `목표까지 ${fmt(Math.abs(v - m.goal!))} ${m.unit}`}
                  </small>
                )}
              </div>
            );
          })
        ) : (
          <div className="empty compact">
            <Target size={26} />
            <p>나에게 맞는 목표를 정해보세요.</p>
            <button className="text-button" onClick={() => setTab("records")}>
              항목에서 목표 설정 <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    );
  }
  if (!ready)
    return (
      <main className="loading">
        <Hexagon className="brand-icon" />
        <p>나의 상태창을 불러오고 있어요…</p>
      </main>
    );
  if (fatal)
    return (
      <main className="loading">
        <Shield />
        <p role="alert">{fatal}</p>
        <button onClick={() => location.reload()}>다시 시도</button>
      </main>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Hexagon />
            <span>S</span>
          </div>
          <div>
            SOLO<span>LEVELUP</span>
          </div>
        </div>
        <div className="sidebar-label">MY JOURNEY</div>
        <nav>
          {tabs.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "nav-item active" : "nav-item"}
              onClick={() => {
                setTab(t.id);
                setSelected(null);
              }}
            >
              <t.icon size={19} />
              {t.name}
              {tab === t.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="side-note">
          <Sparkles size={20} />
          <p>
            작은 기록이 쌓여
            <br />더 나은 내가 됩니다.
          </p>
          <span>ONE DAY, ONE LEVEL.</span>
        </div>
        <div className="side-profile">
          <div className="avatar photo-avatar">
            <ProfilePhoto
              small
              photo={data.profile.photo}
              name={data.profile.nickname}
            />
          </div>
          <div>
            <strong>{data.profile.nickname}</strong>
            <small>레벨 {level} · 성장 중</small>
          </div>
          <button
            className="icon-button"
            aria-label="프로필 설정"
            onClick={() => setTab("settings")}
          >
            <Settings size={17} />
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <span>
            <span className="live-dot" /> 나만의 성장 공간
          </span>
          <div>
            <SyncBadge state={cloud} />
            <span className="date">
              {date.replaceAll("-", ".")} ·{" "}
              {
                ["일", "월", "화", "수", "목", "금", "토"][
                  new Date(date + "T12:00:00Z").getUTCDay()
                ]
              }
              요일
            </span>
            <button
              className="small-avatar"
              onClick={() => setTab("settings")}
              aria-label="설정"
            >
              {data.profile.nickname.slice(0, 1)}
            </button>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {tab === "home"
                  ? "YOUR PERSONAL GROWTH"
                  : tab === "records"
                    ? "BUILD YOUR EVERYDAY"
                    : tab === "stats"
                      ? "YOUR DETAILED STATUS"
                      : tab === "growth"
                        ? "LOOK HOW FAR YOU’VE COME"
                        : "MAKE IT YOURS"}
              </div>
              <h1>
                {tab === "home"
                  ? "오늘도, 한 단계 더."
                  : tab === "records"
                    ? "나의 기록"
                    : tab === "stats"
                      ? "나의 스탯"
                      : tab === "growth"
                        ? "성장 분석"
                        : "나의 설정"}
                {tab === "home" && <span className="heading-spark">✦</span>}
              </h1>
              <p>
                {tab === "home"
                  ? "어제의 나를 넘어가는 작은 변화들을 만나보세요."
                  : tab === "records"
                    ? "당신의 성장은 어떤 모습인가요? 자유롭게 기록해보세요."
                    : tab === "stats"
                      ? "나의 활동과 성취를 한 장의 상태창으로 확인하세요."
                      : tab === "growth"
                        ? "숫자로 확인하는 나의 변화, 모든 기록이 여기에."
                        : "나의 공간과 소중한 기록을 관리하세요."}
              </p>
            </div>
            <button
              className="primary"
              onClick={() => {
                setError("");
                setEditor("new");
              }}
            >
              <Plus size={18} /> 성장 항목 추가
            </button>
          </div>
          {error && (
            <div
              role="alert"
              className={
                "error-banner " +
                (editor ||
                record ||
                confirm ||
                backup ||
                onboarding ||
                photoModal ||
                snapshotEdit ||
                xpModal ||
                practiceModal
                  ? "floating-error"
                  : "")
              }
            >
              {error}
              <button aria-label="오류 닫기" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {tab === "home" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <div className="pill">
                    <span /> GROWTH IN PROGRESS
                  </div>
                  <h2>{data.profile.nickname}님의 여정</h2>
                  <p>오늘의 작은 실천이 내일의 나를 만듭니다.</p>
                  <div className="hero-progress-head">
                    <span>
                      다음 레벨까지{" "}
                      <strong>
                        {XP_RULES.perLevel - (total % XP_RULES.perLevel)} XP
                      </strong>
                    </span>
                    <span>
                      {total % XP_RULES.perLevel}{" "}
                      <span className="muted">/ {XP_RULES.perLevel} XP</span>
                    </span>
                  </div>
                  <div className="progress hero-progress">
                    <span
                      style={{
                        width:
                          ((total % XP_RULES.perLevel) / XP_RULES.perLevel) *
                            100 +
                          "%",
                      }}
                    />
                  </div>
                  <small>레벨은 기록 습관의 누적입니다.</small>
                  <button
                    className="text-button xp-rule-link"
                    onClick={() => setXpModal(true)}
                  >
                    XP 계산 기준
                  </button>
                  <div className="hero-profile-info">
                    <span className="hero-level-pill">LV. {level}</span>
                    <span>나만의 성장 기록</span>
                  </div>
                </div>
                <PhotoShowcase
                  photo={data.profile.photo}
                  name={data.profile.nickname}
                  level={level}
                  onEdit={() => {
                    setError("");
                    setPhotoModal(true);
                  }}
                />
              </section>
              <div className="section-head growth-head">
                <div>
                  <h2>
                    나의 성장 스냅샷{" "}
                    <span className="count">{snapshots.length}</span>
                  </h2>
                  <p className="muted">
                    {current[0]} – {date} · 이전 같은 기간과 비교
                  </p>
                </div>
                <div className="segmented">
                  {[7, 30, 90].map((n) => (
                    <button
                      key={n}
                      className={days === n ? "selected" : ""}
                      onClick={() => setDays(n)}
                    >
                      {n}일
                    </button>
                  ))}
                </div>
              </div>
              <div className="snapshot-toolbar">
                <div className="snapshot-modes">
                  {(
                    [
                      { id: "pinned", name: "고정 항목" },
                      { id: "recent", name: "최근 기록" },
                      { id: "all", name: "전체 항목" },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      aria-pressed={snapshotMode === mode.id}
                      className={snapshotMode === mode.id ? "selected" : ""}
                      onClick={() => {
                        setSnapshotMode(mode.id);
                        setSnapshotExpanded(false);
                      }}
                    >
                      {mode.name}
                    </button>
                  ))}
                </div>
                <div>
                  <select
                    aria-label="스냅샷 분류"
                    value={snapshotCategory}
                    onChange={(e) => {
                      setSnapshotCategory(e.target.value);
                      setSnapshotExpanded(false);
                    }}
                  >
                    <option value="all">모든 분류</option>
                    {data.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="">미분류</option>
                  </select>
                  <button
                    className="text-button"
                    onClick={() =>
                      setSnapshotEdit(
                        active
                          .filter((m) => m.pinned)
                          .slice(0, MAX_PINNED)
                          .map((m) => m.id),
                      )
                    }
                  >
                    <Settings size={14} /> 스냅샷 편집
                  </button>
                </div>
              </div>
              <div className="stats-grid snapshot-grid">
                {snapshots
                  .slice(0, snapshotExpanded ? undefined : MAX_PINNED)
                  .map(metricCard)}
                {!snapshots.length && (
                  <div className="panel empty wide">
                    <ChartIcon />
                    <h3>
                      {active.length
                        ? "조건에 맞는 스냅샷이 없어요"
                        : "아직 비어 있는 나의 상태창"}
                    </h3>
                    <p>
                      {snapshotMode === "recent"
                        ? "첫 기록을 남기면 최근 기록 항목이 나타나요."
                        : active.length
                          ? "전체 항목을 선택하거나 고정 항목을 편집해보세요."
                          : "성장 항목을 추가하고 첫 기록을 남겨보세요."}
                    </p>
                    <button
                      className="secondary"
                      onClick={() =>
                        active.length
                          ? setSnapshotMode("all")
                          : setEditor("new")
                      }
                    >
                      {active.length ? "전체 항목 보기" : "첫 성장 항목 추가"}
                    </button>
                  </div>
                )}
              </div>
              {snapshots.length > MAX_PINNED && (
                <button
                  className="panel-link"
                  onClick={() => setSnapshotExpanded(!snapshotExpanded)}
                >
                  {snapshotExpanded
                    ? "접기"
                    : `나머지 ${snapshots.length - MAX_PINNED}개 더 보기`}
                </button>
              )}
              <div className="snapshot-summary">
                <button onClick={() => setTab("stats")}>
                  <Flame size={16} />
                  <span>최근 {days}일 활동</span>
                  <strong>
                    {overview.periodDays}
                    <small>일</small>
                  </strong>
                </button>
                <button onClick={() => setTab("stats")}>
                  <BookOpen size={16} />
                  <span>기간 내 기록</span>
                  <strong>
                    {overview.periodRecords}
                    <small>개</small>
                  </strong>
                </button>
                <button onClick={() => setTab("stats")}>
                  <Target size={16} />
                  <span>달성한 목표</span>
                  <strong>
                    {overview.achievedGoals}
                    <small>/{overview.goals}</small>
                  </strong>
                </button>
                <button onClick={() => setTab("stats")}>
                  <Trophy size={16} />
                  <span>획득 업적</span>
                  <strong>
                    {overview.badges}
                    <small>/3</small>
                  </strong>
                </button>
              </div>
              <button
                className="stats-entry-link"
                onClick={() => setTab("stats")}
              >
                <Shield size={18} />
                <span>
                  <strong>상세 스탯창 열기</strong>
                  <small>
                    활동의 균형, 연속 기록, 모든 성장 지표를 확인하세요.
                  </small>
                </span>
                <ArrowRight size={18} />
              </button>
              <div className="home-columns">
                <section className="panel today-panel">
                  <div className="section-head">
                    <h2>
                      <Flame size={18} /> 오늘의 작은 실천
                    </h2>
                    <span className="muted">
                      {
                        new Set(
                          data.entries
                            .filter((e) => e.date === date)
                            .map((e) => e.metricId),
                        ).size
                      }
                      개 기록
                    </span>
                  </div>
                  {active.length ? (
                    active.slice(0, 6).map((m) => {
                      const entries = periodEntries(data.entries, m.id, [date]);
                      const v = aggregate(m, entries);
                      return (
                        <div className="practice" key={m.id}>
                          <span
                            className="metric-symbol"
                            style={{
                              color: color(m),
                              background: color(m) + "12",
                            }}
                          >
                            <MetricIcon metric={m} />
                          </span>
                          <div>
                            <strong>{m.name}</strong>
                            <small>
                              {v === null
                                ? "아직 기록이 없어요"
                                : m.kind === "check"
                                  ? "오늘 완료했어요"
                                  : `${fmt(v)} ${m.unit} 기록했어요`}
                            </small>
                          </div>
                          <button
                            className={
                              m.kind === "check" && v !== null
                                ? "check-button done"
                                : "check-button"
                            }
                            aria-label={`${m.name} 기록`}
                            onClick={() => quick(m)}
                            disabled={busy}
                          >
                            {m.kind === "check" && v !== null ? (
                              <Check size={17} />
                            ) : (
                              <Plus size={17} />
                            )}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty compact">
                      <p>당신만의 첫 실천을 추가해보세요.</p>
                    </div>
                  )}
                  <button
                    className="panel-link"
                    onClick={() => setTab("records")}
                  >
                    전체 항목 보기 <ArrowRight size={15} />
                  </button>
                </section>
                {goals()}
              </div>
              <section className="panel achievement-panel">
                <div className="section-head">
                  <h2>
                    <Trophy size={18} /> 나의 업적
                  </h2>
                  <span className="muted">기록으로 여는 작은 성취</span>
                </div>
                <div className="badges">
                  {achievements(data).map((a, i) => (
                    <div
                      className={"badge " + (a.earned ? "earned" : "")}
                      key={a.name}
                    >
                      <div className="badge-medal">
                        {i === 0 ? (
                          <Sparkles />
                        ) : i === 1 ? (
                          <Flame />
                        ) : (
                          <Trophy />
                        )}
                      </div>
                      <div>
                        <strong>{a.name}</strong>
                        <small>{a.description}</small>
                      </div>
                      <span>{a.earned ? "획득" : "도전 중"}</span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
          {tab === "stats" && (
            <StatsPage
              data={data}
              date={date}
              days={days}
              setDays={setDays}
              color={color}
              onMetric={(id) => {
                setSelected(id);
                setTab("growth");
              }}
              onRecord={quick}
              onXp={() => setXpModal(true)}
            />
          )}
          {tab === "records" && (
            <>
              <button
                className="practice-banner"
                onClick={() => setPracticeModal(true)}
              >
                <BookOpen size={20} />
                <span>
                  <strong>추천 활동 라이브러리</strong>
                  <small>
                    걷기·회상 학습·회복·관계·실행 루틴 초안에서 골라보세요.
                  </small>
                </span>
                <ArrowRight size={17} />
              </button>
              <div className="toolbar">
                <div className="search-field">
                  <Search size={18} />
                  <input
                    aria-label="항목 검색"
                    placeholder="성장 항목 검색"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  aria-label="분류 필터"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">모든 분류</option>
                  <option value="archive">보관한 항목</option>
                  {data.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="">미분류</option>
                </select>
              </div>
              <div className="record-grid">
                {data.metrics
                  .filter(
                    (m) =>
                      (filter === "archive" ? m.archived : !m.archived) &&
                      (filter === "all" ||
                        filter === "archive" ||
                        m.categoryId === filter) &&
                      m.name.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((m) => (
                    <article className="panel record-card" key={m.id}>
                      <div className="record-card-head">
                        <span
                          className="metric-symbol"
                          style={{
                            color: color(m),
                            background: color(m) + "15",
                          }}
                        >
                          <MetricIcon metric={m} />
                        </span>
                        <div>
                          <h3>{m.name}</h3>
                          <small>
                            {data.categories.find((c) => c.id === m.categoryId)
                              ?.name ?? "미분류"}{" "}
                            · {kinds[m.kind]}
                          </small>
                        </div>
                        <button
                          className="icon-button"
                          aria-label={`${m.name} 설정`}
                          onClick={() => setEditor(m)}
                        >
                          <MoreHorizontal size={19} />
                        </button>
                      </div>
                      <div className="record-card-value">
                        {fmt(
                          aggregate(
                            m,
                            data.entries.filter((e) => e.metricId === m.id),
                          ),
                        )}{" "}
                        <small>{m.unit}</small>
                      </div>
                      <div className="record-actions">
                        <button
                          className="secondary"
                          onClick={() => quick(m)}
                          disabled={busy || m.archived}
                        >
                          <Plus size={16} /> 기록하기
                        </button>
                        <button
                          className={
                            "icon-button " + (m.pinned ? "pinned" : "")
                          }
                          aria-label={`${m.name} ${m.pinned ? "고정 해제" : "고정"}`}
                          onClick={() => {
                            if (
                              !m.pinned &&
                              active.filter((x) => x.pinned).length >=
                                MAX_PINNED
                            ) {
                              setError(
                                "첫 화면에는 최대 8개 항목을 고정할 수 있어요.",
                              );
                              return;
                            }
                            changeMetric(m, { pinned: !m.pinned });
                          }}
                        >
                          <Pin size={17} />
                        </button>
                        <button
                          className="text-button"
                          onClick={() => {
                            setSelected(m.id);
                            setTab("growth");
                          }}
                        >
                          상세 <ArrowRight size={14} />
                        </button>
                      </div>
                      <div className="reorder-actions">
                        <button
                          className="icon-button"
                          disabled={busy || data.metrics[0]?.id === m.id}
                          aria-label={`${m.name} 위로 이동`}
                          onClick={() => reorder(m, -1)}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          className="icon-button"
                          disabled={busy || data.metrics.at(-1)?.id === m.id}
                          aria-label={`${m.name} 아래로 이동`}
                          onClick={() => reorder(m, 1)}
                        >
                          <ArrowDown size={14} />
                        </button>
                        <span className="muted">항목 순서</span>
                      </div>
                    </article>
                  ))}
              </div>
              {!data.metrics.some(
                (m) =>
                  (filter === "archive" ? m.archived : !m.archived) &&
                  (filter === "all" ||
                    filter === "archive" ||
                    m.categoryId === filter) &&
                  m.name.toLowerCase().includes(search.toLowerCase()),
              ) && (
                <div className="panel empty">
                  <Search />
                  <h3>표시할 항목이 없어요</h3>
                  <p>다른 분류를 선택하거나 새 항목을 추가하세요.</p>
                </div>
              )}
            </>
          )}
          {tab === "growth" && (
            <>
              <div className="toolbar">
                <select
                  aria-label="분석 항목"
                  value={selected ?? ""}
                  onChange={(e) => setSelected(e.target.value || null)}
                >
                  <option value="">전체 성장 항목</option>
                  {data.metrics.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.archived ? " (보관)" : ""}
                    </option>
                  ))}
                </select>
                <div className="segmented">
                  {[7, 30, 90].map((n) => (
                    <button
                      className={days === n ? "selected" : ""}
                      key={n}
                      onClick={() => setDays(n)}
                    >
                      {n}일
                    </button>
                  ))}
                </div>
              </div>
              {selectedMetric ? (
                <MetricDetail
                  metric={selectedMetric}
                  data={data}
                  dates={current}
                  previous={previous}
                  color={color(selectedMetric)}
                  onEdit={(e) => {
                    setError("");
                    setRecord({ metric: selectedMetric, entry: e });
                  }}
                  onDelete={(e) =>
                    setConfirm({
                      title: "기록 삭제",
                      message:
                        "이 기록을 삭제하면 통계와 경험치도 다시 계산됩니다.",
                      action: async () => {
                        if (
                          await commit(
                            {
                              ...data,
                              entries: data.entries.filter(
                                (x) => x.id !== e.id,
                              ),
                            },
                            "기록을 삭제했어요",
                          )
                        )
                          setConfirm(null);
                      },
                    })
                  }
                />
              ) : (
                <>
                  {data.categories
                    .concat([{ id: "", name: "미분류", color: "#9d8dff" }])
                    .map(
                      (c) =>
                        active.some((m) => m.categoryId === c.id) && (
                          <section key={c.id} className="category-section">
                            <h2>
                              <span
                                className="dot"
                                style={{ background: c.color }}
                              />
                              {c.name}
                            </h2>
                            <div className="stats-grid">
                              {active
                                .filter((m) => m.categoryId === c.id)
                                .map(metricCard)}
                            </div>
                          </section>
                        ),
                    )}
                  {active.length === 0 && (
                    <div className="panel empty">
                      <ChartIcon />
                      <h3>첫 기록에서 성장이 시작돼요</h3>
                      <p>성장 항목을 추가해 나만의 변화를 확인하세요.</p>
                    </div>
                  )}
                </>
              )}
              <div className="comparison-note">
                비교 기간: {current[0]} – {date} / {previous[0]} –{" "}
                {previous.at(-1)}. 미기록은 0으로 처리하지 않습니다.
              </div>
            </>
          )}
          {tab === "settings" && (
            <div className="settings-grid">
              <SyncPanel state={cloud} />
              <InstallCard />
              <section className="panel photo-settings-panel">
                <div>
                  <span className="eyebrow">MY PROFILE</span>
                  <h2>내 프로필 사진</h2>
                  <p className="form-hint">
                    나를 보여주는 사진으로 상태창을 꾸며보세요.
                  </p>
                  <button
                    className="secondary"
                    onClick={() => {
                      setError("");
                      setPhotoModal(true);
                    }}
                  >
                    프로필 사진 설정
                  </button>
                </div>
                <ProfilePhoto
                  photo={data.profile.photo}
                  name={data.profile.nickname}
                />
              </section>
              <section className="panel">
                <h2>프로필</h2>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const nickname = String(f.get("nickname")).trim(),
                      timezone = String(f.get("timezone")).trim();
                    try {
                      today(timezone);
                    } catch {
                      setError(
                        "올바른 IANA 시간대를 입력해주세요. 예: Asia/Seoul",
                      );
                      return;
                    }
                    if (!nickname) {
                      setError("닉네임을 입력해주세요.");
                      return;
                    }
                    await commit({
                      ...data,
                      profile: { ...data.profile, nickname, timezone },
                    });
                  }}
                >
                  <label>
                    닉네임
                    <input
                      name="nickname"
                      defaultValue={data.profile.nickname}
                      maxLength={40}
                      required
                    />
                  </label>
                  <label>
                    시간대
                    <input
                      name="timezone"
                      defaultValue={data.profile.timezone}
                      required
                      placeholder="Asia/Seoul"
                    />
                  </label>
                  <p className="form-hint">
                    날짜와 주간 목표에 사용합니다. 기존 기록 날짜는 유지됩니다.
                  </p>
                  <button className="primary" disabled={busy}>
                    변경 저장
                  </button>
                </form>
              </section>
              <section className="panel">
                <h2>성장 규칙과 추천 활동</h2>
                <p className="form-hint">
                  경험치 기준을 확인하거나 새로운 활동을 추가하세요.
                </p>
                <button className="secondary" onClick={() => setXpModal(true)}>
                  XP 계산 기준
                </button>
                <button
                  className="text-button"
                  onClick={() => setPracticeModal(true)}
                >
                  추천 활동 살펴보기
                </button>
              </section>
              <section className="panel">
                <h2>데이터와 백업</h2>
                <div className="storage-note">
                  <Shield size={20} />
                  <p>
                    기록은 이 기기의 브라우저에 저장됩니다. 클라우드를 연결하면
                    기기 간 동기화할 수 있어요. 연결 전 브라우저 데이터를
                    삭제하면 기록이 사라질 수 있으니 정기적으로 백업해주세요.
                  </p>
                </div>
                <p className="muted">
                  마지막 백업:{" "}
                  {data.lastBackup
                    ? new Date(data.lastBackup).toLocaleDateString("ko-KR")
                    : "아직 없음"}
                </p>
                <div className="settings-buttons">
                  <button
                    className="secondary"
                    onClick={() => void exportBackup()}
                  >
                    <Download size={17} /> JSON 백업
                  </button>
                  <button
                    className="secondary"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload size={17} /> 백업 복원
                  </button>
                  <button className="secondary" onClick={exportCsv}>
                    <Download size={17} /> CSV 내보내기
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  hidden
                  accept=".json,application/json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    try {
                      if (file.size > 10 * 1024 * 1024)
                        throw Error("백업 파일은 10MB 이하로 선택해주세요.");
                      setBackup(validateBackup(JSON.parse(await file.text())));
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "파일을 읽지 못했습니다.",
                      );
                    }
                  }}
                />
              </section>
              <section className="panel">
                <h2>분류 관리</h2>
                {data.categories.map((c) => (
                  <CategoryRow
                    key={c.id}
                    category={c}
                    busy={busy}
                    rename={async (name) => {
                      await commit({
                        ...data,
                        categories: data.categories.map((x) =>
                          x.id === c.id ? { ...x, name } : x,
                        ),
                      });
                    }}
                    remove={() =>
                      setConfirm({
                        title: "분류 삭제",
                        message: `‘${c.name}’ 분류를 삭제하면 연결된 항목은 미분류로 이동합니다.`,
                        action: async () => {
                          if (
                            await commit({
                              ...data,
                              categories: data.categories.filter(
                                (x) => x.id !== c.id,
                              ),
                              metrics: data.metrics.map((m) =>
                                m.categoryId === c.id
                                  ? { ...m, categoryId: "" }
                                  : m,
                              ),
                            })
                          )
                            setConfirm(null);
                        },
                      })
                    }
                  />
                ))}
                <form
                  className="inline-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const name = String(new FormData(form).get("name")).trim();
                    if (
                      name &&
                      (await commit({
                        ...data,
                        categories: [
                          ...data.categories,
                          {
                            id: crypto.randomUUID(),
                            name,
                            color: ["#9d8dff", "#64dec6", "#efbe76", "#8db7fa"][
                              data.categories.length % 4
                            ],
                          },
                        ],
                      }))
                    )
                      form.reset();
                  }}
                >
                  <input
                    name="name"
                    aria-label="새 분류 이름"
                    placeholder="새 분류 이름"
                    maxLength={40}
                    required
                  />
                  <button className="secondary" disabled={busy}>
                    <Plus size={17} /> 추가
                  </button>
                </form>
              </section>
              <section className="panel">
                <h2>항목 보관과 초기화</h2>
                <p className="muted">
                  보관한 항목 {data.metrics.filter((m) => m.archived).length}개
                  · 전체 기록 {data.entries.length}개
                </p>
                <button
                  className="secondary"
                  onClick={() => {
                    setFilter("archive");
                    setTab("records");
                  }}
                >
                  <Archive size={17} /> 보관 항목 보기
                </button>
                <hr />
                <p className="form-hint">
                  전체 삭제 전 백업을 다운로드해주세요.
                </p>
                <button
                  className="danger-button"
                  onClick={() =>
                    setConfirm({
                      title: "전체 데이터 삭제",
                      message: `항목 ${data.metrics.length}개와 기록 ${data.entries.length}개가 영구 삭제됩니다. 백업 없이는 복구할 수 없습니다.`,
                      action: async () => {
                        if (
                          await commit(emptyData(), "데이터를 초기화했어요")
                        ) {
                          setConfirm(null);
                          setOnboarding(true);
                          setTab("home");
                        }
                      },
                    })
                  }
                >
                  <Trash2 size={16} /> 전체 데이터 삭제
                </button>
              </section>
            </div>
          )}
          <footer className="footer">
            <span>
              SOLO LEVELUP <span>·</span> 매일 조금씩, 나답게.
            </span>
            <span>
              <Shield size={13} /> 이 기기의 브라우저에 저장
            </span>
          </footer>
        </div>
      </main>
      <nav className="mobile-nav">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => {
              setTab(t.id);
              setSelected(null);
            }}
          >
            <t.icon size={21} />
            <span>{t.name}</span>
          </button>
        ))}
      </nav>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
        </div>
      )}
      {onboarding && (
        <Modal title="나만의 레벨업을 시작해볼까요?" close={() => void start()}>
          <p className="modal-description">
            기록하고 싶은 항목을 골라주세요. 언제든 바꾸거나 나만의 항목을
            추가할 수 있어요.
          </p>
          <div className="onboarding-sets">
            <button
              className="secondary"
              onClick={() => setChoices(RECOMMENDED_PRESET_INDICES)}
            >
              추천 활동 세트 선택
            </button>
            <button
              className="text-button"
              onClick={() =>
                setChoices(
                  Array.from({ length: LEGACY_PRESET_COUNT }, (_, i) => i),
                )
              }
            >
              기본 측정 세트 선택
            </button>
          </div>
          <p className="form-hint">
            추천은 걷기·회상 학습·다음 행동 계획 3개로 작게 시작합니다. 측정
            항목과 활동은 자유롭게 선택하세요.
          </p>
          <div className="preset-list">
            {presets.map((p, i) => (
              <label
                className={"preset " + (choices.includes(i) ? "chosen" : "")}
                key={p.name}
              >
                <input
                  type="checkbox"
                  checked={choices.includes(i)}
                  onChange={() =>
                    setChoices(
                      choices.includes(i)
                        ? choices.filter((x) => x !== i)
                        : [...choices, i],
                    )
                  }
                />
                <span className="metric-symbol">
                  <MetricIcon metric={{ ...p, id: "" }} />
                </span>
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {kinds[p.kind]} · {p.unit}
                  </small>
                </span>
                <Check size={18} />
              </label>
            ))}
          </div>
          <p className="form-hint">
            목표와 실제 수치는 직접 설정해요. 아무 항목 없이 시작해도 괜찮아요.
          </p>
          <button
            className="primary full"
            onClick={() => void start()}
            disabled={busy}
          >
            나의 여정 시작하기 <ArrowRight size={17} />
          </button>
        </Modal>
      )}
      {xpModal && (
        <Modal title="경험치 계산 기준" close={() => setXpModal(false)}>
          <XpDetails data={data} date={date} />
        </Modal>
      )}
      {practiceModal && (
        <Modal
          title="추천 활동 라이브러리"
          close={() => setPracticeModal(false)}
        >
          <PracticePicker
            data={data}
            busy={busy}
            onAdd={async (ids) => {
              const selected = practices.filter(
                (p) =>
                  ids.includes(p.id) &&
                  !data.metrics.some((m) => m.practiceId === p.id),
              );
              const required = new Set(selected.map((p) => p.categoryId));
              const missing = emptyData().categories.filter(
                (c) =>
                  required.has(c.id) &&
                  !data.categories.some((e) => e.id === c.id),
              );
              if (
                await commit(
                  {
                    ...data,
                    categories: [...data.categories, ...missing],
                    metrics: [
                      ...data.metrics,
                      ...selected.map((p) => ({
                        ...practiceMetric(p),
                        id: crypto.randomUUID(),
                      })),
                    ],
                  },
                  "선택한 활동을 추가했어요",
                )
              )
                setPracticeModal(false);
            }}
          />
        </Modal>
      )}
      {snapshotEdit && (
        <Modal title="성장 스냅샷 편집" close={() => setSnapshotEdit(null)}>
          <p className="modal-description">
            첫 화면에 고정할 항목을 최대 {MAX_PINNED}개 골라주세요. 순서는 기록
            화면에서 변경할 수 있어요.
          </p>
          <div className="snapshot-checklist">
            {active.map((m) => (
              <label key={m.id}>
                <input
                  type="checkbox"
                  checked={snapshotEdit.includes(m.id)}
                  disabled={
                    !snapshotEdit.includes(m.id) &&
                    snapshotEdit.length >= MAX_PINNED
                  }
                  onChange={() =>
                    setSnapshotEdit(
                      snapshotEdit.includes(m.id)
                        ? snapshotEdit.filter((id) => id !== m.id)
                        : [...snapshotEdit, m.id],
                    )
                  }
                />
                <span className="dot" style={{ background: color(m) }} />
                <span>
                  {m.name}
                  <small>
                    {data.categories.find((c) => c.id === m.categoryId)?.name ??
                      "미분류"}
                  </small>
                </span>
              </label>
            ))}
          </div>
          <p className="form-hint">
            {snapshotEdit.length} / {MAX_PINNED}개 선택
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setSnapshotEdit(null)}>
              취소
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                if (
                  await commit(
                    {
                      ...data,
                      metrics: data.metrics.map((m) => ({
                        ...m,
                        pinned: !m.archived && snapshotEdit.includes(m.id),
                      })),
                    },
                    "스냅샷을 변경했어요",
                  )
                )
                  setSnapshotEdit(null);
              }}
            >
              스냅샷 저장
            </button>
          </div>
        </Modal>
      )}
      {photoModal && (
        <Modal title="프로필 사진" close={() => setPhotoModal(false)}>
          <PhotoEditor
            photo={data.profile.photo}
            name={data.profile.nickname}
            busy={busy}
            close={() => setPhotoModal(false)}
            onSave={async (photo) => {
              if (
                await commit(
                  { ...data, profile: { ...data.profile, photo } },
                  "프로필 사진을 저장했어요",
                )
              )
                setPhotoModal(false);
            }}
          />
        </Modal>
      )}
      {editor && (
        <MetricForm
          metric={editor === "new" ? null : editor}
          data={data}
          busy={busy}
          close={() => setEditor(null)}
          onSave={async (m) => {
            if (
              await commit({
                ...data,
                metrics:
                  editor === "new"
                    ? [...data.metrics, m]
                    : data.metrics.map((x) => (x.id === m.id ? m : x)),
              })
            )
              setEditor(null);
          }}
          onArchive={async (m) => {
            if (
              await commit({
                ...data,
                metrics: data.metrics.map((x) =>
                  x.id === m.id
                    ? {
                        ...x,
                        archived: !m.archived,
                        pinned: !m.archived
                          ? m.pinned
                          : active.filter((a) => a.pinned).length <
                              MAX_PINNED && m.pinned,
                      }
                    : x,
                ),
              })
            )
              setEditor(null);
          }}
          onDelete={(m) => {
            setConfirm({
              title: "성장 항목 삭제",
              message: `‘${m.name}’ 항목과 기록 ${data.entries.filter((e) => e.metricId === m.id).length}개가 삭제됩니다.`,
              action: async () => {
                if (
                  await commit({
                    ...data,
                    metrics: data.metrics.filter((x) => x.id !== m.id),
                    entries: data.entries.filter((x) => x.metricId !== m.id),
                  })
                ) {
                  setConfirm(null);
                  setEditor(null);
                }
              },
            });
          }}
        />
      )}
      {record && (
        <RecordForm
          metric={record.metric}
          entry={record.entry}
          data={data}
          date={date}
          busy={busy}
          close={() => setRecord(null)}
          onSave={async (entry, replaceId) => {
            const entries = data.entries.filter(
              (e) => e.id !== entry.id && e.id !== replaceId,
            );
            if (
              await commit(
                { ...data, entries: [...entries, entry] },
                "기록했어요. 오늘도 한 단계 더!",
              )
            )
              setRecord(null);
          }}
        />
      )}
      {confirm && (
        <Modal title={confirm.title} close={() => setConfirm(null)}>
          <p className="modal-description">{confirm.message}</p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setConfirm(null)}>
              취소
            </button>
            <button
              className="danger-button"
              disabled={busy}
              onClick={() => void confirm.action()}
            >
              삭제하기
            </button>
          </div>
        </Modal>
      )}
      {backup && (
        <Modal title="백업 복원" close={() => setBackup(null)}>
          <p className="modal-description">
            현재 데이터 전체를 항목 {backup.metrics.length}개, 기록{" "}
            {backup.entries.length}개로 교체합니다. 먼저 현재 데이터를
            백업해주세요.
          </p>
          <button className="secondary" onClick={() => void exportBackup()}>
            <Download size={17} /> 현재 데이터 백업
          </button>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setBackup(null)}>
              취소
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                if (await commit(backup, "백업을 복원했어요")) {
                  setBackup(null);
                  setOnboarding(!backup.initialized);
                  setSelected(null);
                }
              }}
            >
              전체 교체하여 복원
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function CategoryRow({
  category,
  busy,
  rename,
  remove,
}: {
  category: Data["categories"][number];
  busy: boolean;
  rename: (name: string) => Promise<void>;
  remove: () => void;
}) {
  const [name, setName] = useState(category.name);
  return (
    <form
      className="category-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) void rename(name.trim());
      }}
    >
      <span className="dot" style={{ background: category.color }} />
      <input
        aria-label={`${category.name} 분류 이름`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        required
      />
      <button
        className="icon-button"
        aria-label="분류 이름 저장"
        disabled={busy}
      >
        <Check size={16} />
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label={`${category.name} 분류 삭제`}
        onClick={remove}
      >
        <Trash2 size={16} />
      </button>
    </form>
  );
}
function MetricForm({
  metric,
  data,
  busy,
  close,
  onSave,
  onArchive,
  onDelete,
}: {
  metric: Metric | null;
  data: Data;
  busy: boolean;
  close: () => void;
  onSave: (m: Metric) => Promise<void>;
  onArchive: (m: Metric) => void;
  onDelete: (m: Metric) => void;
}) {
  const [kind, setKind] = useState<Kind>(metric?.kind ?? "amount");
  const [unit, setUnit] = useState(metric?.unit ?? "회");
  const [direction, setDirection] = useState(metric?.direction ?? "up");
  const [localError, setLocalError] = useState("");
  const locked = !!metric && data.entries.some((e) => e.metricId === metric.id);
  return (
    <Modal title={metric ? "성장 항목 설정" : "새 성장 항목"} close={close}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setLocalError("");
          const f = new FormData(e.currentTarget);
          const goalText = String(f.get("goal") ?? "").trim();
          const goal = goalText ? Number(goalText) : null;
          if (
            goal !== null &&
            (!Number.isFinite(goal) ||
              goal <= 0 ||
              (kind === "check" && (!Number.isInteger(goal) || goal > 7)))
          ) {
            setLocalError(
              kind === "check"
                ? "주간 완료 목표는 1~7일로 입력해주세요."
                : "목표는 0보다 큰 숫자를 입력해주세요.",
            );
            return;
          }
          const name = String(f.get("name")).trim();
          if (!name || !unit.trim()) {
            setLocalError("이름과 단위를 입력해주세요.");
            return;
          }
          await onSave({
            ...(metric?.practiceId &&
            name === metric.name &&
            kind === metric.kind
              ? { practiceId: metric.practiceId }
              : {}),
            id: metric?.id ?? crypto.randomUUID(),
            name,
            kind,
            unit:
              kind === "check" ? "일" : kind === "time" ? "분" : unit.trim(),
            direction,
            categoryId: String(f.get("category")),
            goal,
            pinned: metric?.pinned ?? false,
            archived: metric?.archived ?? false,
          });
        }}
      >
        <label>
          항목 이름
          <input
            name="name"
            defaultValue={metric?.name}
            placeholder="예: 기타 연습"
            required
            maxLength={40}
          />
        </label>
        <div className="form-grid">
          <label>
            기록 방식
            <select
              value={kind}
              disabled={locked}
              onChange={(e) => {
                const k = e.target.value as Kind;
                setKind(k);
                setUnit(
                  k === "time"
                    ? "분"
                    : k === "check"
                      ? "일"
                      : k === "measure"
                        ? "kg"
                        : "회",
                );
                setDirection(k === "measure" || k === "check" ? "none" : "up");
              }}
            >
              {Object.entries(kinds).map(([k, n]) => (
                <option key={k} value={k}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            단위
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              disabled={locked || kind === "time" || kind === "check"}
              required
              maxLength={12}
            />
          </label>
        </div>
        {locked && (
          <p className="form-hint">
            기록이 있는 항목의 방식과 단위는 유지됩니다. 다른 방식은 새 항목을
            만들어주세요.
          </p>
        )}
        <label>
          분류
          <select name="category" defaultValue={metric?.categoryId ?? ""}>
            <option value="">미분류</option>
            {data.categories.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {(kind === "measure" || kind === "best") && (
          <label>
            성장 방향
            <select
              value={direction}
              onChange={(e) =>
                setDirection(e.target.value as Metric["direction"])
              }
            >
              <option value="none">판정 없이 기록만</option>
              <option value="up">증가할수록 목표에 가까워짐</option>
              <option value="down">감소할수록 목표에 가까워짐</option>
            </select>
          </label>
        )}
        <label>
          {kind === "measure" || kind === "best" ? "최종 목표" : "이번 주 목표"}{" "}
          <span className="muted">선택</span>
          <input
            name="goal"
            type="number"
            step={kind === "check" ? "1" : "any"}
            defaultValue={metric?.goal ?? ""}
            placeholder="목표 없이 기록할 수도 있어요"
          />
        </label>
        {localError && (
          <p className="form-error" role="alert">
            {localError}
          </p>
        )}
        <button className="primary full" disabled={busy}>
          {metric ? "변경 저장" : "성장 항목 추가"}
        </button>
      </form>
      {metric && (
        <div className="modal-bottom">
          <button
            className="text-button"
            disabled={busy}
            onClick={() => onArchive(metric)}
          >
            <Archive size={16} />
            {metric.archived ? "보관 해제" : "항목 보관"}
          </button>
          <button
            className="text-button danger"
            disabled={busy}
            onClick={() => onDelete(metric)}
          >
            <Trash2 size={16} /> 영구 삭제
          </button>
        </div>
      )}
    </Modal>
  );
}
function RecordForm({
  metric,
  entry,
  data,
  date,
  busy,
  close,
  onSave,
}: {
  metric: Metric;
  entry?: Entry;
  data: Data;
  date: string;
  busy: boolean;
  close: () => void;
  onSave: (e: Entry, replaceId?: string) => Promise<void>;
}) {
  const [recordDate, setDate] = useState(entry?.date ?? date);
  const [value, setValue] = useState(entry ? String(entry.value) : "");
  const [localError, setLocalError] = useState("");
  const [replace, setReplace] = useState(false);
  const existing = data.entries.find(
    (e) =>
      e.metricId === metric.id && e.date === recordDate && e.id !== entry?.id,
  );
  const needsReplace =
    !!existing && (metric.kind === "measure" || metric.kind === "check");
  const latest = [...data.entries]
    .filter((e) => e.metricId === metric.id)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return (
    <Modal title={`${metric.name} ${entry ? "수정" : "기록"}`} close={close}>
      {metric.practiceId && (
        <p className="practice-record-hint">
          {practices.find((p) => p.id === metric.practiceId)?.instruction}
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setLocalError("");
          if (needsReplace && !replace) {
            setLocalError("같은 날의 기존 기록을 변경하려면 확인해주세요.");
            return;
          }
          try {
            if (value.trim() === "" && metric.kind !== "check")
              throw Error("기록할 숫자를 입력해주세요.");
            const v = metric.kind === "check" ? 1 : Number(value);
            validateEntry(metric, v, recordDate, date);
            await onSave(
              {
                id: entry?.id ?? crypto.randomUUID(),
                metricId: metric.id,
                date: recordDate,
                value: v,
                note: String(
                  new FormData(e.currentTarget).get("note") ?? "",
                ).trim(),
                createdAt: entry?.createdAt ?? new Date().toISOString(),
              },
              needsReplace ? existing?.id : undefined,
            );
          } catch (err) {
            setLocalError(
              err instanceof Error ? err.message : "입력을 확인해주세요.",
            );
          }
        }}
      >
        {metric.kind !== "check" && (
          <label>
            기록값 · {metric.unit}
            <input
              className="big-input"
              autoFocus
              type="number"
              inputMode="decimal"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              placeholder="0"
            />
            {latest && (
              <span className="form-hint">
                최근 기록: {fmt(latest.value)} {metric.unit} · {latest.date}
              </span>
            )}
          </label>
        )}
        <label>
          날짜
          <input
            type="date"
            value={recordDate}
            max={date}
            required
            onChange={(e) => {
              setDate(e.target.value);
              setReplace(false);
            }}
          />
        </label>
        <label>
          메모 <span className="muted">선택</span>
          <textarea
            name="note"
            defaultValue={entry?.note}
            maxLength={500}
            placeholder="오늘의 느낌이나 기록 조건을 남겨보세요"
            rows={3}
          />
        </label>
        {needsReplace && (
          <label className="replace-check">
            <input
              type="checkbox"
              checked={replace}
              onChange={(e) => setReplace(e.target.checked)}
            />{" "}
            같은 날의 기존 기록 {fmt(existing!.value)} {metric.unit}를
            변경합니다.
          </label>
        )}
        {localError && (
          <p role="alert" className="form-error">
            {localError}
          </p>
        )}
        <button className="primary full" disabled={busy}>
          기록 저장 <Check size={17} />
        </button>
      </form>
    </Modal>
  );
}
function MetricDetail({
  metric,
  data,
  dates,
  previous,
  color,
  onEdit,
  onDelete,
}: {
  metric: Metric;
  data: Data;
  dates: string[];
  previous: string[];
  color: string;
  onEdit: (e: Entry) => void;
  onDelete: (e: Entry) => void;
}) {
  const entries = periodEntries(data.entries, metric.id, dates);
  const value = aggregate(metric, entries),
    old = aggregate(metric, periodEntries(data.entries, metric.id, previous));
  const chart = dates.map((date) => ({
    date: date.slice(5).replace("-", "/"),
    value: aggregate(
      metric,
      entries.filter((e) => e.date === date),
    ),
  }));
  const list = data.entries
    .filter((e) => e.metricId === metric.id)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
  return (
    <>
      <section className="panel chart-panel">
        <div className="section-head">
          <h2>
            <span className="metric-symbol" style={{ color }}>
              <MetricIcon metric={metric} />
            </span>
            {metric.name}
          </h2>
          <span className="muted">{kinds[metric.kind]}</span>
        </div>
        <div className="detail-value">
          {fmt(value)} <small>{metric.unit}</small>
        </div>
        <p className="muted">
          {value !== null && old !== null
            ? `이전 기간 대비 ${fmt(value - old)} ${metric.unit}`
            : "비교할 기록이 아직 부족해요"}
          {metric.kind === "best"
            ? ` · 개인 최고 ${fmt(aggregate(metric, list))} ${metric.unit}`
            : ""}
        </p>
        {entries.length ? (
          <>
            <div
              className="chart"
              role="img"
              aria-label={`${metric.name} ${dates.length}일 그래프. ${entries.length}개 기록, 기간 값 ${fmt(value)} ${metric.unit}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                {metric.kind === "measure" || metric.kind === "best" ? (
                  <AreaChart data={chart}>
                    <defs>
                      <linearGradient
                        id="area-fill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e9ecf2" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#778195"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={25}
                    />
                    <YAxis
                      stroke="#778195"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#ffffff",
                        color: "#30364a",
                        border: "1px solid #e5e7ee",
                        borderRadius: 10,
                      }}
                    />
                    <Area
                      dataKey="value"
                      name={metric.unit}
                      type="linear"
                      stroke={color}
                      fill="url(#area-fill)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={chart}>
                    <CartesianGrid stroke="#e9ecf2" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#778195"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={25}
                    />
                    <YAxis
                      stroke="#778195"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#ffffff",
                        color: "#30364a",
                        border: "1px solid #e5e7ee",
                        borderRadius: 10,
                      }}
                    />
                    <Bar
                      dataKey="value"
                      name={metric.unit}
                      fill={color}
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
            {metric.kind === "check" && (
              <div className="check-calendar">
                {dates.map((d) => (
                  <span
                    className={
                      entries.some((e) => e.date === d) ? "completed" : ""
                    }
                    key={d}
                  >
                    {d.slice(5)}
                    {entries.some((e) => e.date === d) ? (
                      <Check size={14} />
                    ) : (
                      <span>—</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="empty compact">
            <ChartIcon />
            <p>선택한 기간에 기록이 없어요.</p>
          </div>
        )}
      </section>
      <section className="panel history">
        <div className="section-head">
          <h2>기록 내역</h2>
          <span className="muted">전체 {list.length}개</span>
        </div>
        {list.length ? (
          list.map((e) => (
            <div className="history-row" key={e.id}>
              <div>
                <strong>{e.date}</strong>
                {e.note && <p>{e.note}</p>}
              </div>
              <span>
                {metric.kind === "check"
                  ? "완료"
                  : `${fmt(e.value)} ${metric.unit}`}
              </span>
              <button
                className="text-button"
                aria-label={`${e.date} 기록 수정`}
                onClick={() => onEdit(e)}
              >
                수정
              </button>
              <button
                className="icon-button"
                aria-label={`${e.date} 기록 삭제`}
                onClick={() => onDelete(e)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        ) : (
          <p className="muted">아직 기록이 없어요.</p>
        )}
      </section>
    </>
  );
}
