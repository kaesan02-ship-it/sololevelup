"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { type Data, fmt } from "@/lib/model";
import { historyIndex, monthDates, moveMonth } from "@/lib/history";
export function HistoryCalendar({
  data,
  today,
  onMetric,
}: {
  data: Data;
  today: string;
  onMetric: (id: string) => void;
}) {
  const [selected, setSelected] = useState(today);
  const month = selected.slice(0, 7),
    year = month.slice(0, 4);
  const index = useMemo(
    () => historyIndex(data),
    [data.entries, data.journals],
  );
  const dates = monthDates(month);
  const offset = (new Date(dates[0] + "T12:00:00Z").getUTCDay() + 6) % 7;
  const entries = data.entries.filter((e) => e.date === selected),
    journal = index.journals.get(selected);
  const jump = (m: string) =>
    setSelected(m === today.slice(0, 7) ? today : m + "-01");
  const monthTotals = new Map<string, number>();
  for (const d of index.dates)
    monthTotals.set(d.slice(0, 7), (monthTotals.get(d.slice(0, 7)) ?? 0) + 1);
  return (
    <section className="panel activity-calendar">
      <div className="section-head">
        <h2>나의 기록 캘린더</h2>
        <span className="muted">월·연도를 바꿔 지난 기록을 찾아보세요</span>
      </div>
      <p className="history-lifetime">
        {index.dates.length
          ? `${index.dates[0]}부터 ${index.dates.length}일의 기록을 쌓았어요.`
          : "오늘부터 나만의 기록을 쌓아보세요."}
      </p>
      <p className="form-hint">
        이전 달·이전 연도의 기록도 계속 보관해요. 오래됐다고 자동으로 지워지지
        않아요. 장기 보관을 위해 설정에서 JSON 백업도 받아두세요.
      </p>
      <div className="history-controls">
        <button
          className="icon-button"
          aria-label="이전 달"
          disabled={month <= "0001-01"}
          onClick={() => jump(moveMonth(month, -1))}
        >
          <ChevronLeft />
        </button>
        <label>
          달력 월
          <input
            type="month"
            aria-label="달력 월"
            value={month}
            min="0001-01"
            max={today.slice(0, 7)}
            onChange={(e) => {
              if (e.target.value && e.target.validity.valid)
                jump(e.target.value);
            }}
          />
        </label>
        <button
          className="icon-button"
          aria-label="다음 달"
          disabled={month >= today.slice(0, 7)}
          onClick={() => jump(moveMonth(month, 1))}
        >
          <ChevronRight />
        </button>
        <button className="secondary" onClick={() => setSelected(today)}>
          오늘 기록
        </button>
      </div>
      <div className="history-year">
        <label>
          기록이 있는 연도
          <select
            aria-label="기록 연도"
            value={index.years.includes(year) ? year : ""}
            onChange={(e) => {
              const d = index.dates.find((d) => d.startsWith(e.target.value));
              if (d) setSelected(d);
            }}
          >
            <option value="" disabled>
              연도 선택
            </option>
            {index.years.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
        </label>
        {index.dates.length > 0 && (
          <button
            className="text-button"
            onClick={() => setSelected(index.dates[0])}
          >
            첫 기록으로 이동
          </button>
        )}
      </div>
      <div className="year-months" aria-label={`${year}년 기록 요약`}>
        {Array.from({ length: 12 }, (_, i) => {
          const m = `${year}-${String(i + 1).padStart(2, "0")}`;
          return (
            <button
              key={m}
              className={m === month ? "selected" : ""}
              disabled={m > today.slice(0, 7)}
              onClick={() => jump(m)}
              aria-label={`${m} 기록 ${monthTotals.get(m) ?? 0}일`}
            >
              <strong>{i + 1}월</strong>
              <span>{monthTotals.get(m) ?? 0}일</span>
            </button>
          );
        })}
      </div>
      <div className="month-calendar">
        {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
          <span className="weekday" key={d}>
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank${i}`} aria-hidden="true" />
        ))}
        {dates.map((d) => {
          const count = index.counts.get(d) ?? 0;
          const hasJournal = index.journals.has(d);
          return (
            <button
              key={d}
              disabled={d > today}
              className={`calendar-day intensity-${Math.min(3, count + (hasJournal ? 1 : 0))} ${selected === d ? "selected" : ""}`}
              aria-pressed={selected === d}
              aria-label={`${d} 기록 ${count}개${hasJournal ? " · 하루 일기 있음" : ""}`}
              onClick={() => setSelected(d)}
            >
              <strong>{Number(d.slice(-2))}</strong>
              <small>{count ? `${count}개` : hasJournal ? "일기" : ""}</small>
            </button>
          );
        })}
      </div>
      <div className="date-navigation stats-date-navigation">
        <label>
          조회 날짜
          <input
            type="date"
            aria-label="캘린더 조회 날짜"
            min="0001-01-01"
            max={today}
            value={selected}
            onChange={(e) => {
              if (e.target.value && e.target.validity.valid)
                setSelected(e.target.value);
            }}
          />
        </label>
      </div>
      <div className="day-records">
        <h3>
          {selected} <span>{entries.length}개 기록</span>
        </h3>
        {entries.length ? (
          entries.map((e) => {
            const m = data.metrics.find((m) => m.id === e.metricId);
            return (
              m && (
                <button
                  className="day-record-row"
                  key={e.id}
                  onClick={() => onMetric(m.id)}
                >
                  <span>{m.name}</span>
                  <strong>
                    {m.kind === "check" ? "완료" : `${fmt(e.value)} ${m.unit}`}
                  </strong>
                  {e.note && <small>{e.note}</small>}
                  <ArrowRight size={14} />
                </button>
              )
            );
          })
        ) : (
          <p className="form-hint">선택한 날짜에 활동 기록이 없어요.</p>
        )}
        {journal && (
          <div className="daily-journal">
            <h3>이날의 일기</h3>
            {journal.win && <p>잘한 일 · {journal.win}</p>}
            {journal.story && <p>{journal.story}</p>}
            {journal.next && <p>다음 행동 · {journal.next}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
