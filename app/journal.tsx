"use client";
import { useEffect, useState } from "react";
import type { Journal } from "@/lib/model";
export function JournalEditor({
  date,
  initial,
  current,
  busy,
  onSave,
}: {
  date: string;
  initial?: Journal;
  current?: Journal;
  busy: boolean;
  onSave: (journal: Journal | undefined) => Promise<boolean>;
}) {
  const [baseline, setBaseline] = useState(initial);
  const [win, setWin] = useState(initial?.win ?? "");
  const [story, setStory] = useState(initial?.story ?? "");
  const [next, setNext] = useState(initial?.next ?? "");
  const [message, setMessage] = useState("");
  const dirty =
    win !== (baseline?.win ?? "") ||
    story !== (baseline?.story ?? "") ||
    next !== (baseline?.next ?? "");
  useEffect(() => {
    // A download may finish after opening. Refresh an untouched form, but never
    // replace a draft the user has started editing.
    if (!dirty && JSON.stringify(baseline) !== JSON.stringify(current)) {
      setBaseline(current);
      setWin(current?.win ?? "");
      setStory(current?.story ?? "");
      setNext(current?.next ?? "");
    }
  }, [baseline, current, dirty]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const changedElsewhere = JSON.stringify(baseline) !== JSON.stringify(current);
  return (
    <form
      className="journal-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        if (changedElsewhere) {
          setMessage(
            "다른 탭이나 기기에서 이 날짜의 회고가 바뀌었어요. 입력한 내용을 복사해둔 뒤 닫고 다시 열어 최신 내용을 확인해주세요.",
          );
          return;
        }
        if (!(win.trim() || story.trim() || next.trim())) {
          setMessage("한 문장 이상 남겨주세요. 삭제는 아래 버튼을 이용하세요.");
          return;
        }
        const saved = await onSave({
          date,
          win: win.trim(),
          story: story.trim(),
          next: next.trim(),
          updatedAt: new Date().toISOString(),
        });
        if (!saved)
          setMessage(
            "저장하지 못했어요. 입력 내용은 유지했으니 변경 안내와 저장 공간을 확인하고 다시 시도해주세요.",
          );
      }}
    >
      <p className="modal-description">
        {date} · 길게 쓰지 않아도 괜찮아요. 세 문항 중 하나만 써도 됩니다. 저장
        버튼을 누르기 전에는 저장되지 않아요.
      </p>
      <label>
        오늘 잘한 일
        <textarea
          aria-label="오늘 잘한 일"
          value={win}
          onChange={(e) => setWin(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder="작은 실천 하나도 충분해요."
        />
      </label>
      <label>
        남기고 싶은 이야기
        <textarea
          aria-label="남기고 싶은 이야기"
          value={story}
          onChange={(e) => setStory(e.target.value)}
          maxLength={2000}
          rows={5}
          placeholder="오늘의 기분, 배운 것, 기억하고 싶은 순간…"
        />
      </label>
      <small className="muted">{story.length} / 2,000자</small>
      <label>
        다음의 작은 행동
        <textarea
          aria-label="다음의 작은 행동"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder="언제, 어디서, 무엇을 할까요?"
        />
      </label>
      <p className="form-hint">
        회고는 XP를 지급하지 않아요. JSON 백업과 연결한 계정의 동기화에
        포함됩니다. 백업 파일에도 내용이 담겨요.
      </p>
      {message && (
        <p role="alert" className="form-error">
          {message}
        </p>
      )}
      <div className="settings-buttons">
        <button className="primary" disabled={busy}>
          회고 저장
        </button>
        {initial && (
          <button
            type="button"
            className="danger-button"
            disabled={busy}
            onClick={async () => {
              if (changedElsewhere) {
                setMessage(
                  "회고가 다른 곳에서 변경되었어요. 닫고 다시 열어주세요.",
                );
                return;
              }
              if (
                window.confirm(
                  "이 날짜의 회고를 삭제할까요? 연결된 계정에도 반영됩니다.",
                )
              )
                await onSave(undefined);
            }}
          >
            회고 삭제
          </button>
        )}
      </div>
    </form>
  );
}
