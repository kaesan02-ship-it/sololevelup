"use client";
import { XpRing } from "./growth-art";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  Flame,
  Medal,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
} from "recharts";
import {
  type Data,
  type Metric,
  fmt,
  range,
  achievements,
  XP_RULES,
} from "@/lib/model";
import {
  summarize,
  categoryActivity,
  metricSnapshot,
  goalStatus,
} from "@/lib/stats";
import { ProfilePhoto } from "./photo";
export function StatsPage({
  data,
  date,
  days,
  setDays,
  onMetric,
  onRecord,
  color,
  onXp,
}: {
  data: Data;
  date: string;
  days: number;
  setDays: (days: number) => void;
  onMetric: (id: string) => void;
  onRecord: (metric: Metric) => void;
  color: (metric: Metric) => string;
  onXp: () => void;
}) {
  const calendarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (calendarRef.current)
      calendarRef.current.scrollLeft = calendarRef.current.scrollWidth;
  }, []);
  const [category, setCategory] = useState("all"),
    [selectedDate, setSelectedDate] = useState(date);
  const summary = summarize(data, date, days),
    categories = categoryActivity(data, date, days),
    active = data.metrics.filter((m) => !m.archived),
    goals = active.filter((m) => m.goal !== null);
  const [axisIds, setAxisIds] = useState<string[] | null>(null),
    [axisEditor, setAxisEditor] = useState(false);
  const displayedAxes = categories
    .filter((c) =>
      (axisIds ?? categories.slice(0, 8).map((c) => c.id)).includes(c.id),
    )
    .slice(0, 8);
  const selectedAxes = displayedAxes.map((c) => c.id);
  const historyDates = range(date, 84),
    period = range(date, days);
  const records = data.entries.filter((e) => e.date === selectedDate);
  const visible = active.filter(
    (m) => category === "all" || m.categoryId === category,
  );
  return (
    <div className="detailed-stats">
      <section className="panel stat-profile">
        <ProfilePhoto photo={data.profile.photo} name={data.profile.nickname} />
        <div className="stat-profile-copy">
          <span className="eyebrow">PERSONAL STATUS</span>
          <h2>{data.profile.nickname}</h2>
          <p>나의 기록으로 완성하는 성장 상태창</p>
          <button className="text-button" onClick={onXp}>
            오늘 {summary.todayXp} / {XP_RULES.dailyCap} XP · XP 계산 기준
          </button>
          <div className="stat-profile-tags">
            <span>LV. {summary.level}</span>
            <span>
              {summary.startDate
                ? `${summary.startDate}부터 기록 중`
                : "첫 기록을 기다리는 중"}
            </span>
          </div>
          <div className="hero-progress-head">
            <span>
              누적 경험치 <strong>{fmt(summary.totalXp)} XP</strong>
            </span>
            <span>
              다음 레벨까지{" "}
              {XP_RULES.perLevel - (summary.totalXp % XP_RULES.perLevel)} XP
            </span>
          </div>
          <div className="progress">
            <span
              style={{
                width:
                  ((summary.totalXp % XP_RULES.perLevel) / XP_RULES.perLevel) *
                    100 +
                  "%",
                background: "#9470c4",
              }}
            />
          </div>
        </div>
        <div className="stat-today-xp">
          <XpRing value={summary.todayXp} max={XP_RULES.dailyCap} />
          <Sparkles size={22} />
          <strong>
            {summary.todayXp}
            <small> / {XP_RULES.dailyCap} XP</small>
          </strong>
          <span>오늘의 경험치</span>
        </div>
      </section>
      <div className="stats-overview">
        {[
          {
            label: "전체 기록",
            value: summary.totalRecords,
            unit: "개",
            icon: BookOpen,
          },
          {
            label: "기록한 날",
            value: summary.activeDays,
            unit: "일",
            icon: Activity,
          },
          {
            label: "현재 연속 기록",
            value: summary.currentStreak,
            unit: "일",
            icon: Flame,
          },
          {
            label: "최장 연속 기록",
            value: summary.longestStreak,
            unit: "일",
            icon: Trophy,
          },
        ].map((item) => (
          <div className="panel overview-card" key={item.label}>
            <item.icon size={18} />
            <span>{item.label}</span>
            <strong>
              {fmt(item.value)}
              <small>{item.unit}</small>
            </strong>
          </div>
        ))}
      </div>
      <div className="section-head stats-period-head">
        <div>
          <h2>분류별 활동 스탯</h2>
          <p className="muted">
            {period[0]} – {date} · 기록한 날 비율
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
      <div className="stats-detail-columns">
        <section className="panel activity-radar">
          <div className="section-head">
            <h3>내 활동의 균형</h3>
            <button
              className="text-button"
              aria-expanded={axisEditor}
              onClick={() => setAxisEditor(!axisEditor)}
            >
              차트 축 선택
            </button>
          </div>
          <p className="balance-explanation">
            모양은 비교 분류 수에 따라 달라져요. 4개면 마름모, 6개면
            육각형입니다.
          </p>
          {axisEditor && (
            <fieldset className="axis-editor">
              <legend>비교할 분류 · 최대 8개</legend>
              {categories.map((c) => (
                <label key={c.id}>
                  <input
                    type="checkbox"
                    checked={selectedAxes.includes(c.id)}
                    disabled={
                      !selectedAxes.includes(c.id) && selectedAxes.length >= 8
                    }
                    onChange={() =>
                      setAxisIds(
                        selectedAxes.includes(c.id)
                          ? selectedAxes.filter((id) => id !== c.id)
                          : [...selectedAxes, c.id],
                      )
                    }
                  />
                  {c.name}
                </label>
              ))}
              <button className="text-button" onClick={() => setAxisIds(null)}>
                자동 선택으로 되돌리기
              </button>
            </fieldset>
          )}
          {displayedAxes.length >= 3 &&
          displayedAxes.some((c) => c.activeDays > 0) ? (
            <div
              className="radar-container"
              role="img"
              aria-label={`분류별 활동 빈도: ${displayedAxes.map((c) => `${c.name} ${c.percent}%`).join(", ")}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  data={displayedAxes}
                  outerRadius="65%"
                  margin={{ top: 20, right: 28, bottom: 20, left: 28 }}
                >
                  <PolarGrid stroke="#e5dfed" />
                  <PolarAngleAxis
                    dataKey="name"
                    tickFormatter={(value) =>
                      String(value).length > 4
                        ? String(value).slice(0, 4) + "…"
                        : String(value)
                    }
                    tick={{ fill: "#746981", fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    dataKey="percent"
                    name="기록한 날 비율 (%)"
                    stroke="#a18ac5"
                    fill="#b69cd8"
                    fillOpacity={0.23}
                    isAnimationActive={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e5dfed",
                      borderRadius: 10,
                      color: "#5f566e",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty compact">
              <Activity />
              <p>
                {displayedAxes.length < 3
                  ? "3개 이상 분류를 선택하면 차트가 나타나요. 상세 수치는 아래에서 확인하세요."
                  : "첫 기록을 남기면 활동 차트가 나타나요."}
              </p>
            </div>
          )}
          <p className="form-hint">
            선택한 기간 중 각 분류를 기록한 날의 비율입니다. 실제 신체 능력이나
            지능을 평가하는 수치는 아닙니다.
          </p>
        </section>
        <section className="panel category-stats">
          <h3>활동 수치 상세</h3>
          {categories.length ? (
            categories.map((c) => (
              <button
                className="category-stat-row"
                key={c.id}
                onClick={() => {
                  setCategory(c.id);
                  requestAnimationFrame(() =>
                    document.getElementById("all-stats")?.scrollIntoView({
                      behavior: matchMedia("(prefers-reduced-motion: reduce)")
                        .matches
                        ? "auto"
                        : "smooth",
                      block: "start",
                    }),
                  );
                }}
              >
                <div>
                  <span className="dot" style={{ background: c.color }} />
                  <strong>{c.name}</strong>
                  <span>
                    {c.activeDays} / {days}일
                  </span>
                  <b>{c.percent}%</b>
                </div>
                <div className="progress">
                  <span
                    style={{ width: c.percent + "%", background: c.color }}
                  />
                </div>
                <small>
                  활성 항목 {c.metrics}개 · 유효 활동 기록 {c.records}개
                </small>
              </button>
            ))
          ) : (
            <div className="empty compact">
              <p>성장 항목을 추가하면 분류별 활동을 확인할 수 있어요.</p>
            </div>
          )}
          <p className="form-hint">
            측정값은 입력한 날, 활동은 0보다 큰 값을 기록한 날을 셉니다. 보관
            항목의 과거 기록도 포함합니다.
          </p>
        </section>
      </div>
      <section className="panel stats-goals">
        <div className="section-head">
          <h2>
            <Target size={18} /> 목표 상태
          </h2>
          <span className="muted">
            {summary.achievedGoals} / {summary.goals}개 달성
          </span>
        </div>
        <div className="stats-goal-grid">
          {goals.map((m) => {
            const goal = goalStatus(m, data.entries, date);
            return (
              <button
                className="stats-goal-card"
                key={m.id}
                onClick={() => onMetric(m.id)}
              >
                <div>
                  <strong>{m.name}</strong>
                  <span
                    className={
                      goal.achieved ? "goal-chip achieved" : "goal-chip"
                    }
                  >
                    {goal.achieved ? (
                      <>
                        <Check size={11} /> 달성
                      </>
                    ) : (
                      "진행 중"
                    )}
                  </span>
                </div>
                <p>
                  {fmt(goal.value)}{" "}
                  <small>
                    / {fmt(goal.target)} {m.unit}
                  </small>
                </p>
                <div className="progress">
                  <span
                    style={{ width: goal.progress + "%", background: color(m) }}
                  />
                </div>
                <small>
                  {m.kind === "measure" || m.kind === "best"
                    ? "최종 목표"
                    : "이번 주 목표"}{" "}
                  ·{" "}
                  {goal.value === null
                    ? "기록 대기"
                    : goal.achieved
                      ? "목표를 달성했어요"
                      : `${fmt(goal.remaining)} ${m.unit} 남았어요`}
                </small>
              </button>
            );
          })}
        </div>
        {!goals.length && (
          <div className="empty compact">
            <Target />
            <p>기록 항목의 설정에서 목표를 추가해보세요.</p>
          </div>
        )}
      </section>
      <section className="panel activity-calendar">
        <div className="section-head">
          <h2>나의 기록 캘린더</h2>
          <span className="muted">최근 84일 · 날짜를 누르면 기록 확인</span>
        </div>
        <div className="date-navigation stats-date-navigation">
          <label>
            조회 날짜
            <input
              type="date"
              aria-label="캘린더 조회 날짜"
              min="0001-01-01"
              max={date}
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value && e.target.validity.valid)
                  setSelectedDate(e.target.value);
              }}
            />
          </label>
          <button className="secondary" onClick={() => setSelectedDate(date)}>
            오늘 기록
          </button>
        </div>
        <p className="form-hint">
          84일 이전 기록도 날짜를 직접 선택하면 볼 수 있어요.
        </p>
        <div className="calendar-scroll" ref={calendarRef}>
          <div className="calendar-grid">
            {historyDates.map((d) => {
              const count = data.entries.filter((e) => e.date === d).length;
              return (
                <button
                  key={d}
                  className={
                    "calendar-day intensity-" +
                    Math.min(3, count) +
                    " " +
                    (selectedDate === d ? "selected" : "")
                  }
                  aria-label={`${d} 기록 ${count}개`}
                  title={`${d} · 기록 ${count}개`}
                  onClick={() => setSelectedDate(d)}
                />
              );
            })}
          </div>
        </div>
        <div className="calendar-caption">
          <span>
            {historyDates[0]} – {date}
          </span>
          <span>
            기록 적음 <i className="intensity-0" />
            <i className="intensity-1" />
            <i className="intensity-2" />
            <i className="intensity-3" /> 많음
          </span>
        </div>
        <div className="day-records">
          <h3>
            {selectedDate} <span>{records.length}개 기록</span>
          </h3>
          {records.length ? (
            records.map((e) => {
              const metric = data.metrics.find((m) => m.id === e.metricId);
              return (
                metric && (
                  <button
                    key={e.id}
                    className="day-record-row"
                    onClick={() => onMetric(metric.id)}
                  >
                    <span>{metric.name}</span>
                    <strong>
                      {metric.kind === "check"
                        ? "완료"
                        : `${fmt(e.value)} ${metric.unit}`}
                    </strong>
                    {e.note && <small>{e.note}</small>}
                    <ArrowRight size={14} />
                  </button>
                )
              );
            })
          ) : (
            <p className="form-hint">선택한 날짜에 기록이 없어요.</p>
          )}
        </div>
      </section>
      <section id="all-stats" className="panel all-stats">
        <div className="section-head">
          <h2>전체 상세 지표</h2>
          <select
            aria-label="스탯 분류 필터"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">모든 분류</option>
            {data.categories.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
            <option value="">미분류</option>
          </select>
        </div>
        <div className="metric-table-header">
          <span>성장 항목</span>
          <span>최근 {days}일</span>
          <span>이전 기간 대비</span>
          <span>최근 기록</span>
          <span>기록하기</span>
        </div>
        {visible.map((m) => {
          const stat = metricSnapshot(m, data, date, days);
          const done =
            m.kind === "check" &&
            data.entries.some((e) => e.metricId === m.id && e.date === date);
          return (
            <div className="metric-table-row" key={m.id}>
              <button
                className="metric-table-name"
                onClick={() => onMetric(m.id)}
              >
                <span className="dot" style={{ background: color(m) }} />
                <strong>{m.name}</strong>
                <small>
                  {data.categories.find((c) => c.id === m.categoryId)?.name ??
                    "미분류"}
                  {stat.best !== null
                    ? ` · 개인 최고 ${fmt(stat.best)} ${m.unit}`
                    : ""}
                </small>
              </button>
              <span className="metric-table-value">
                {fmt(stat.now)} <small>{m.unit}</small>
              </span>
              <span className="metric-table-delta">
                {stat.delta === null
                  ? "비교 데이터 부족"
                  : `${stat.delta > 0 ? "+" : ""}${fmt(stat.delta)} ${m.unit}`}
              </span>
              <span className="metric-table-date">
                {stat.latest?.date ?? "아직 없음"}
              </span>
              <button
                className="secondary"
                onClick={() => onRecord(m)}
                aria-pressed={m.kind === "check" ? done : undefined}
                aria-label={`${m.name} 스탯에서 기록`}
              >
                {m.kind === "check"
                  ? done
                    ? "체크 취소"
                    : "완료 체크"
                  : "기록"}
              </button>
            </div>
          );
        })}
        {!visible.length && (
          <div className="empty compact">
            <p>이 분류에는 활성 항목이 없어요.</p>
          </div>
        )}
      </section>
      <section className="panel stats-achievements">
        <div className="section-head">
          <h2>
            <Medal size={18} /> 성취 기록
          </h2>
          <span className="muted">{summary.badges} / 3개 획득</span>
        </div>
        <div className="badges">
          {achievements(data).map((a) => (
            <div className={"badge " + (a.earned ? "earned" : "")} key={a.name}>
              <div className="badge-medal">
                <Trophy size={20} />
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
    </div>
  );
}
