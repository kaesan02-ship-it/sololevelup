"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Cloud, CloudOff, RefreshCw, LogOut } from "lucide-react";
import { cloudClient, readCloud, writeCloud } from "@/lib/cloud";
import {
  load,
  loadSyncMeta,
  loadSyncSnapshot,
  linkSync,
  acknowledgeUpload,
  applyRemote,
} from "@/lib/storage";
import { syncDecision, type SyncMeta } from "@/lib/sync-policy";
import type { Data } from "@/lib/model";
type Status =
  | "unconfigured"
  | "signed-out"
  | "unlinked"
  | "syncing"
  | "synced"
  | "offline"
  | "conflict"
  | "error";
export function useCloudSync(onRemote: (data: Data) => void) {
  const [session, setSession] = useState<Session | null>(null),
    [status, setStatus] = useState<Status>(
      cloudClient() ? "signed-out" : "unconfigured",
    ),
    [message, setMessage] = useState(""),
    [meta, setMeta] = useState<SyncMeta | null>(null);
  const sessionRef = useRef<Session | null>(null),
    remoteRef = useRef(onRemote),
    running = useRef(false),
    pending = useRef(false);
  remoteRef.current = onRemote;
  const sync = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    if (running.current) {
      pending.current = true;
      return;
    }
    running.current = true;
    try {
      const { data: localData, meta: localMeta } = await loadSyncSnapshot();
      setMeta(localMeta);
      if (!localMeta || localMeta.ownerId !== s.user.id) {
        setStatus("unlinked");
        return;
      }
      if (!navigator.onLine) {
        setStatus("offline");
        return;
      }
      setStatus("syncing");
      const remote = await readCloud(s.user.id, s.access_token);
      if (sessionRef.current?.user.id !== s.user.id) return;
      const decision = syncDecision(localMeta, remote?.version ?? null);
      if (decision === "conflict") {
        setStatus("conflict");
        setMessage(
          "다른 기기와 이 기기에 모두 변경 사항이 있어요. 보관할 기록을 선택해주세요.",
        );
        return;
      }
      if (decision === "upload") {
        const { data: snapshot, meta: snapshotMeta } = await loadSyncSnapshot();
        if (
          !snapshotMeta ||
          snapshotMeta.ownerId !== s.user.id ||
          sessionRef.current?.user.id !== s.user.id
        )
          return;
        const version = await writeCloud(
          snapshot,
          snapshotMeta.version,
          s.access_token,
        );
        await acknowledgeUpload(s.user.id, version, snapshotMeta.revision);
      } else if (decision === "download" && remote) {
        const applied = await applyRemote(
          remote.data,
          s.user.id,
          remote.version,
          localMeta.revision,
          localData,
        );
        if (!applied) {
          setStatus("conflict");
          setMessage("동기화 중 새 기록이 추가되어 덮어쓰지 않았어요.");
          return;
        }
        remoteRef.current(remote.data);
      }
      const latest = await loadSyncMeta();
      setMeta(latest);
      setStatus(latest?.dirty ? "syncing" : "synced");
      if (latest?.dirty) pending.current = true;
      setMessage("");
    } catch (e) {
      const text =
        e instanceof Error
          ? e.message
          : String((e as { message?: string }).message ?? "");
      if (text.includes("sync_conflict")) {
        setStatus("conflict");
        setMessage("다른 기기에 새 기록이 있어요. 보관할 기록을 선택해주세요.");
      } else {
        setStatus(navigator.onLine ? "error" : "offline");
        setMessage(
          "동기화하지 못했어요. 이 기기의 기록은 보존됩니다. 연결과 계정 설정을 확인해주세요.",
        );
      }
    } finally {
      running.current = false;
      if (pending.current) {
        pending.current = false;
        setTimeout(() => void sync(), 500);
      }
    }
  }, []);
  useEffect(() => {
    const c = cloudClient();
    if (!c) return;
    let alive = true;
    function update(s: Session | null) {
      if (!alive) return;
      sessionRef.current = s;
      setSession(s);
      if (s) void sync();
      else setStatus("signed-out");
    }
    c.auth.getSession().then((result) => update(result.data.session));
    const { data } = c.auth.onAuthStateChange((_event, s) => {
      setTimeout(() => update(s), 0);
    });
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void sync(), 800);
    };
    const interval = setInterval(() => void sync(), 30000);
    window.addEventListener("solo-local-change", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      alive = false;
      data.subscription.unsubscribe();
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("solo-local-change", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [sync]);
  async function connect(mode: "local" | "cloud") {
    const s = sessionRef.current;
    if (!s || running.current) return;
    running.current = true;
    setStatus("syncing");
    try {
      const { data: currentData, meta: currentMeta } = await loadSyncSnapshot();
      const remote = await readCloud(s.user.id, s.access_token);
      if (sessionRef.current?.user.id !== s.user.id) return;
      if (mode === "cloud") {
        if (!remote) throw Error("클라우드에 기록이 없습니다.");
        if (
          !confirm(
            "이 기기의 기록을 클라우드 기록으로 교체합니다. 먼저 JSON 백업을 다운로드해주세요. 계속할까요?",
          )
        ) {
          setStatus("unlinked");
          return;
        }
        const ok = await applyRemote(
          remote.data,
          s.user.id,
          remote.version,
          currentMeta?.revision ?? null,
          currentData,
        );
        if (!ok) throw Error("새 기록이 추가되어 다시 확인해주세요.");
        remoteRef.current(remote.data);
        setMeta(await loadSyncMeta());
        setStatus("synced");
      } else {
        if (
          remote &&
          !confirm(
            "이 기기의 기록으로 클라우드 기록 전체를 교체합니다. 다른 기기의 변경 사항은 덮어쓸 수 있습니다. 계속할까요?",
          )
        ) {
          setStatus("unlinked");
          return;
        }
        await linkSync(s.user.id, remote?.version ?? 0);
        const { data: snapshot, meta: linked } = await loadSyncSnapshot();
        const version = await writeCloud(
          snapshot,
          remote?.version ?? 0,
          s.access_token,
        );
        await acknowledgeUpload(s.user.id, version, linked!.revision);
        const latest = await loadSyncMeta();
        setMeta(latest);
        setStatus(latest?.dirty ? "syncing" : "synced");
        if (latest?.dirty) pending.current = true;
      }
      setMessage("");
    } catch {
      setStatus("error");
      setMessage(
        "연결하지 못했어요. 기록은 이 기기에 보존됩니다. 다시 시도해주세요.",
      );
    } finally {
      running.current = false;
      if (pending.current) {
        pending.current = false;
        void sync();
      }
    }
  }
  return { session, status, message, meta, sync, connect };
}
const labels: Record<Status, string> = {
  unconfigured: "동기화 연결 준비 필요",
  "signed-out": "로그인하면 기기 간 동기화",
  unlinked: "연결할 기록 선택",
  syncing: "동기화 중",
  synced: "동기화 완료",
  offline: "오프라인 · 연결되면 동기화",
  conflict: "두 기기의 변경 확인 필요",
  error: "동기화 재시도 필요",
};
export function SyncBadge({
  state,
}: {
  state: ReturnType<typeof useCloudSync>;
}) {
  if (!state.session) return null;
  return (
    <button className="sync-badge" onClick={() => void state.sync()}>
      <Cloud size={13} />
      {labels[state.status]}
    </button>
  );
}
export function SyncPanel({
  state,
}: {
  state: ReturnType<typeof useCloudSync>;
}) {
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  return (
    <section className="panel sync-panel">
      <div className="section-head">
        <h2>
          <Cloud size={18} /> 기기 간 동기화
        </h2>
        {state.session && (
          <button
            className="icon-button"
            aria-label="로그아웃"
            onClick={async () => {
              await cloudClient()?.auth.signOut();
            }}
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
      <p className="install-description muted">
        같은 계정으로 로그인하면 휴대폰과 PC에서 기록을 이어서 사용할 수 있어요.
      </p>
      <div className="install-status">{labels[state.status]}</div>
      {state.status === "unconfigured" ? (
        <p className="form-hint">
          클라우드 연결이 아직 준비되지 않았어요. 지금 남긴 기록은 이 기기에
          보관됩니다.
        </p>
      ) : state.session ? (
        <>
          <p className="form-hint">
            {state.session.user.email} · 마지막 동기화{" "}
            {state.meta?.lastSyncedAt
              ? new Date(state.meta.lastSyncedAt).toLocaleString("ko-KR")
              : "아직 없음"}
          </p>
          {(state.status === "unlinked" ||
            state.status === "conflict" ||
            state.status === "error") && (
            <div className="sync-actions">
              <button
                className="secondary"
                onClick={() => void state.connect("local")}
              >
                이 기기의 기록 사용
              </button>
              <button
                className="secondary"
                onClick={() => void state.connect("cloud")}
              >
                클라우드 기록 사용
              </button>
            </div>
          )}
          <button
            className="text-button"
            disabled={state.status === "syncing"}
            onClick={() => void state.sync()}
          >
            <RefreshCw size={14} /> 지금 동기화
          </button>
        </>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            setBusy(true);
            setNotice("");
            const f = new FormData(e.currentTarget);
            const email = String(f.get("email")).trim(),
              password = String(f.get("password"));
            const action = (
              e.nativeEvent as SubmitEvent
            ).submitter?.getAttribute("value");
            try {
              const c = cloudClient()!;
              const result =
                action === "signup"
                  ? await c.auth.signUp({ email, password })
                  : await c.auth.signInWithPassword({ email, password });
              if (result.error) {
                setNotice(
                  action === "signup"
                    ? "계정을 만들지 못했어요. 이메일과 비밀번호를 확인해주세요."
                    : "로그인하지 못했어요. 이메일·비밀번호와 이메일 인증 여부를 확인해주세요.",
                );
              } else {
                form.reset();
                setNotice(
                  action === "signup" && !result.data.session
                    ? "가입 메일을 확인한 뒤 로그인해주세요."
                    : "로그인했어요. 연결할 기록을 선택해주세요.",
                );
              }
            } catch {
              setNotice("계정 서비스에 연결하지 못했어요. 다시 시도해주세요.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            이메일
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            비밀번호
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={8}
              required
            />
          </label>
          <div className="sync-actions">
            <button className="primary" value="login" disabled={busy}>
              로그인
            </button>
            <button className="secondary" value="signup" disabled={busy}>
              계정 만들기
            </button>
          </div>
        </form>
      )}
      {(notice || state.message) && (
        <p className="form-hint" role="status">
          {notice || state.message}
        </p>
      )}
      <p className="form-hint">
        오프라인 기록도 보관합니다. 두 기기를 동시에 수정하면 어느 기록을
        유지할지 확인해요.
      </p>
    </section>
  );
}
