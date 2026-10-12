"use client";
import { useState } from "react";
import { BookOpen, Check, ExternalLink } from "lucide-react";
import { practices, evidenceSources, recommendedStart } from "@/lib/practices";
import type { Data } from "@/lib/model";
const sourceKinds = {
  guideline: "일반 지침",
  review: "연구 종합",
  "meta-analysis": "메타분석",
  observational: "관찰 연구 종합",
  book: "실용서",
};
export function PracticePicker({
  data,
  busy,
  onAdd,
}: {
  data: Data;
  busy: boolean;
  onAdd: (ids: string[]) => Promise<void>;
}) {
  const existing = new Set(data.metrics.map((m) => m.practiceId));
  const [chosen, setChosen] = useState(
    recommendedStart.filter((id) => !existing.has(id)),
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="practice-library">
      <p className="modal-description">
        처음에는 2–3개만 골라보세요. 시간과 주간 목표는 시작용 예시이며 나중에
        바꿀 수 있어요.
      </p>
      <p className="evidence-status">
        활동별 근거와 확인 범위를 안내합니다. 시작 목표는 실천용 예시이며
        연구에서 검증된 최적량이나 효과 보장을 뜻하지 않습니다.
      </p>
      <div className="practice-list">
        {practices.map((p) => {
          const source = evidenceSources.find((s) => s.id === p.sourceId)!;
          return (
            <article className="practice-item" key={p.id}>
              <label>
                <input
                  type="checkbox"
                  checked={chosen.includes(p.id)}
                  disabled={existing.has(p.id)}
                  onChange={() =>
                    setChosen(
                      chosen.includes(p.id)
                        ? chosen.filter((id) => id !== p.id)
                        : [...chosen, p.id],
                    )
                  }
                />
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {existing.has(p.id) ? "이미 추가한 활동" : p.starter}
                  </small>
                </span>
                <span className="source-tag">{sourceKinds[source.kind]}</span>
              </label>
              <p>{p.instruction}</p>
              <button
                className="text-button"
                aria-expanded={expanded === p.id}
                onClick={() => setExpanded(expanded === p.id ? null : p.id)}
              >
                <BookOpen size={14} /> 근거와 적용 범위
              </button>
              {expanded === p.id && (
                <div className="practice-evidence">
                  <p>{source.summary}</p>
                  <p className="form-hint">{source.verification}</p>
                  <p>{source.limits}</p>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {source.authors} · {source.year} <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <p className="form-hint">
        추천 세트는 선택 사항입니다. 자신의 스펙업 항목은 언제든 직접 추가할 수
        있어요.
      </p>
      <button
        className="primary full"
        disabled={busy || !chosen.length}
        onClick={() => void onAdd(chosen)}
      >
        <Check size={15} /> 선택한 {chosen.length}개 활동 추가
      </button>
    </div>
  );
}
