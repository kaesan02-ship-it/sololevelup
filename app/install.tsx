"use client";
import { appPath } from "@/lib/paths";
import { useEffect, useState } from "react";
import { Download, Wifi, WifiOff } from "lucide-react";
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
export function InstallCard() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [online, setOnline] = useState(true);
  const [offlineReady, setOfflineReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setOnline(navigator.onLine);
    setInstalled(matchMedia("(display-mode: standalone)").matches);
    function install(e: Event) {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    }
    function done() {
      setInstalled(true);
      setPrompt(null);
    }
    function connectivity() {
      setOnline(navigator.onLine);
    }
    window.addEventListener("beforeinstallprompt", install);
    window.addEventListener("appinstalled", done);
    window.addEventListener("online", connectivity);
    window.addEventListener("offline", connectivity);
    let alive = true;
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      navigator.serviceWorker
        .register(appPath("/sw.js"))
        .then(() => navigator.serviceWorker.ready)
        .then(() => {
          if (alive) setOfflineReady(true);
        })
        .catch(() => {
          if (alive) setFailed(true);
        });
    return () => {
      alive = false;
      window.removeEventListener("beforeinstallprompt", install);
      window.removeEventListener("appinstalled", done);
      window.removeEventListener("online", connectivity);
      window.removeEventListener("offline", connectivity);
    };
  }, []);
  return (
    <section className="panel install-panel">
      <div className="section-head">
        <h2>앱으로 사용하기</h2>
        {online ? <Wifi size={17} /> : <WifiOff size={17} />}
      </div>
      <p className="muted install-description">
        휴대폰 홈 화면에 추가하면 나의 상태창을 더 빠르게 열 수 있어요.
      </p>
      <div className="install-status">
        {installed
          ? "홈 화면 앱으로 사용 중"
          : offlineReady
            ? "오프라인 준비 완료"
            : failed
              ? "오프라인 준비에 실패했어요. 연결을 확인하고 새로고침해주세요."
              : "첫 방문 시 인터넷 연결로 앱을 준비합니다."}
        {!online && " · 현재 오프라인"}
      </div>
      {prompt ? (
        <button
          className="primary"
          onClick={async () => {
            try {
              await prompt.prompt();
              await prompt.userChoice;
              setPrompt(null);
            } catch {
              setFailed(true);
            }
          }}
        >
          <Download size={16} /> 앱 설치
        </button>
      ) : (
        !installed && (
          <p className="form-hint">
            아이폰: Safari 공유 → 홈 화면에 추가
            <br />
            안드로이드·PC: 브라우저 메뉴 → 앱 설치 또는 홈 화면에 추가
          </p>
        )
      )}
      <p className="form-hint">
        기록은 이 브라우저에 보관됩니다. 설치 후에도 정기적으로 백업해주세요.
      </p>
    </section>
  );
}
export function OfflineRegistration() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register(appPath("/sw.js")).catch(() => {});
      } else {
        // Production caches must not intercept development bundles or HMR.
        navigator.serviceWorker
          .getRegistrations()
          .then(async (registrations) => {
            for (const registration of registrations) {
              const worker =
                registration.active ??
                registration.waiting ??
                registration.installing;
              if (
                worker &&
                new URL(worker.scriptURL).pathname === appPath("/sw.js")
              )
                await registration.unregister();
            }
            for (const key of await caches.keys())
              if (key.startsWith("solo-levelup-")) await caches.delete(key);
          })
          .catch(() => {});
      }
    }
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  return offline ? (
    <div className="offline-indicator" role="status">
      <WifiOff size={14} /> 오프라인 · 기록은 이 기기에 저장돼요
    </div>
  ) : null;
}
