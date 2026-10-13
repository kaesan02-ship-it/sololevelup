"use client";
import { ArrowRight, Check, Feather, Flag } from "lucide-react";
import { type Data, type Metric, xp, XP_RULES } from "@/lib/model";
import { dailyQuests, journeyStage, stages } from "@/lib/journey";
export function Journey({
  data,
  date,
  onRecord,
  onJournal,
  onAdd,
}: {
  data: Data;
  date: string;
  onRecord: (metric: Metric) => void;
  onJournal: () => void;
  onAdd: () => void;
}) {
  const stage = journeyStage(xp(data));
  const quests = dailyQuests(data, date);
  const done = quests.filter((q) => q.done).length;
  const journal = data.journals?.find((j) => j.date === date);
  return (
    <section className="panel journey-panel" aria-label="나의 성장 여정">
      <div className="journey-heading">
        <svg
          className="journey-crest"
          viewBox="0 0 80 88"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M40 3 74 17v28c0 19-19 31-34 39C25 76 6 64 6 45V17Z"
            fill="#f1eaf9"
            stroke="#b49ad1"
            strokeWidth="1.5"
          />
          <path
            d="m40 17 5 15 16 1-12 10 4 16-13-9-13 9 4-16-12-10 16-1Z"
            fill="#9975bf"
          />
          <path
            d="m21 66 19 10 19-10"
            fill="none"
            stroke="#b49ad1"
            strokeWidth="2"
          />
        </svg>
        <div>
          <span className="eyebrow">MY JOURNEY · LV. {stage.level}</span>
          <h2>{stage.current.name}</h2>
          <p>{stage.current.caption}</p>
        </div>
      </div>
      <ol className="journey-stages" aria-label="성장 단계">
        {stages.map((s, i) => (
          <li
            key={s.level}
            className={i <= stage.index ? "reached" : ""}
            aria-current={i === stage.index ? "step" : undefined}
          >
            <span>
              {i < stage.index ? <Check size={14} /> : <Flag size={14} />}
            </span>
            <strong>{s.name}</strong>
            <small>LV. {s.level}</small>
          </li>
        ))}
      </ol>
      <p className="form-hint">
        {stage.next
          ? `다음 칭호 ‘${stage.next.name}’까지 ${Math.max(0, (stage.next.level - 1) * XP_RULES.perLevel - xp(data))} XP`
          : "모든 칭호에 도달했어요. 레벨과 기록은 계속 쌓여요."}{" "}
        · 칭호는 기록 경험치 기준이에요.
      </p>
      <div className="section-head">
        <h3>오늘의 작은 퀘스트</h3>
        <span className="count">
          {done} / {quests.length}
        </span>
      </div>
      <p className="form-hint">
        고정한 활동부터 최대 3개를 보여줘요. 가능한 것만 골라 실천하세요. 쉬는
        날에도 쌓은 XP는 줄지 않아요.
      </p>
      <div className="quest-list">
        {quests.map(({ metric, done }) => (
          <button
            key={metric.id}
            className={"quest " + (done ? "done" : "")}
            onClick={() => onRecord(metric)}
            aria-label={`${metric.name} 퀘스트 ${done ? "기록 보기" : "기록하기"}`}
          >
            <span className="quest-check">
              {done ? <Check size={17} /> : <Flag size={17} />}
            </span>
            <span>
              <strong>{metric.name}</strong>
              <small>{done ? "오늘 기록 완료" : "오늘의 실천 남기기"}</small>
            </span>
            <ArrowRight size={17} />
          </button>
        ))}
        {!quests.length && (
          <button className="secondary" onClick={onAdd}>
            나에게 맞는 활동 고르기
          </button>
        )}
      </div>
      <button className="journal-invite" onClick={onJournal}>
        <Feather size={22} />
        <span>
          <strong>
            {journal
              ? "오늘의 회고 돌아보기"
              : "오늘을 한 문장으로 남겨볼까요?"}
          </strong>
          <small>선택 기록 · 잘한 일과 다음의 작은 행동</small>
        </span>
        <ArrowRight size={18} />
      </button>
    </section>
  );
}
