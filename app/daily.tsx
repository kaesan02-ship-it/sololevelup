"use client";
import { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
} from "lucide-react";
import {
  type Data,
  type Metric,
  type Entry,
  fmt,
  shift,
  xpBreakdown,
} from "@/lib/model";
export function DailyRecords({
  data,
  today,
  onRecord,
  onEdit,
  onJournal,
}: {
  data: Data;
  today: string;
  onRecord: (metric: Metric, date: string) => void;
  onEdit: (metric: Metric, entry: Entry) => void;
  onJournal: (date: string) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(today);
  const active = data.metrics.filter((m) => !m.archived);
  const [metricId, setMetricId] = useState(active[0]?.id ?? "");
  const selectedMetric = active.find((m) => m.id === metricId) ?? active[0];
  const journal = data.journals?.find((j) => j.date === selectedDate);
  const entries = data.entries
    .filter((e) => e.date === selectedDate)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return (
    <section className="panel daily-log">
      <div className="section-head">
        <div>
          <h2>
            <CalendarDays size={19} /> 날짜별 기록
          </h2>
          <p className="muted">날짜를 골라 그날의 기록과 메모를 확인하세요.</p>
        </div>
      </div>
      <div className="date-navigation">
        <button
          className="icon-button"
          aria-label="이전 날짜"
          disabled={selectedDate === "0001-01-01"}
          onClick={() => setSelectedDate(shift(selectedDate, -1))}
        >
          <ChevronLeft size={19} />
        </button>
        <label>
          조회 날짜
          <input
            type="date"
            aria-label="조회 날짜"
            min="0001-01-01"
            max={today}
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value && e.target.validity.valid)
                setSelectedDate(e.target.value);
            }}
          />
        </label>
        <button
          className="icon-button"
          aria-label="다음 날짜"
          disabled={selectedDate >= today}
          onClick={() => setSelectedDate(shift(selectedDate, 1))}
        >
          <ChevronRight size={19} />
        </button>
        <button className="secondary" onClick={() => setSelectedDate(today)}>
          오늘
        </button>
      </div>
      <div className="daily-summary">
        <span>
          기록 <strong>{entries.length}개</strong>
        </span>
        <span>
          활동 항목{" "}
          <strong>{new Set(entries.map((e) => e.metricId)).size}개</strong>
        </span>
        <span>
          경험치 <strong>{xpBreakdown(data, selectedDate).total} XP</strong>
        </span>
      </div>
      <article className="daily-journal">
        <div className="section-head">
          <h3>이날의 회고</h3>
          <button className="secondary" onClick={() => onJournal(selectedDate)}>
            {journal ? "회고 수정" : "회고 남기기"}
          </button>
        </div>
        {journal ? (
          <dl>
            {journal.win && (
              <>
                <dt>오늘 잘한 일</dt>
                <dd>{journal.win}</dd>
              </>
            )}
            {journal.story && (
              <>
                <dt>남기고 싶은 이야기</dt>
                <dd>{journal.story}</dd>
              </>
            )}
            {journal.next && (
              <>
                <dt>다음의 작은 행동</dt>
                <dd>{journal.next}</dd>
              </>
            )}
          </dl>
        ) : (
          <p className="muted">수치로 담지 못한 하루를 짧게 남겨보세요.</p>
        )}
      </article>
      <div className="daily-entries">
        {entries.length ? (
          entries.map((entry) => {
            const metric = data.metrics.find((m) => m.id === entry.metricId);
            if (!metric) return null;
            return (
              <article className="daily-entry" key={entry.id}>
                <div>
                  <small>
                    {data.categories.find((c) => c.id === metric.categoryId)
                      ?.name ?? "미분류"}
                    {metric.archived ? " · 보관한 항목" : ""}
                  </small>
                  <h3>{metric.name}</h3>
                  {entry.note && <p>{entry.note}</p>}
                </div>
                <strong>
                  {metric.kind === "check"
                    ? "완료"
                    : `${fmt(entry.value)} ${metric.unit}`}
                </strong>
                <button
                  className="icon-button"
                  aria-label={`${metric.name} 기록 수정`}
                  onClick={() => onEdit(metric, entry)}
                >
                  <Pencil size={17} />
                </button>
              </article>
            );
          })
        ) : (
          <div className="empty compact">
            <CalendarDays />
            <h3>아직 남긴 기록이 없어요</h3>
            <p>아래에서 항목을 골라 이날의 기록을 추가할 수 있어요.</p>
          </div>
        )}
      </div>
      {selectedMetric && (
        <div className="daily-add">
          <label>
            기록할 항목
            <select
              aria-label="날짜별 기록 항목"
              value={selectedMetric.id}
              onChange={(e) => setMetricId(e.target.value)}
            >
              {active.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="primary"
            onClick={() => onRecord(selectedMetric, selectedDate)}
          >
            <Plus size={17} /> 선택한 날짜에 기록
          </button>
        </div>
      )}
    </section>
  );
}
