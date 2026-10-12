"use client";
import { useRef, useState } from "react";
import { Camera, UserRound, Upload, Trash2 } from "lucide-react";
import { preparePhoto } from "@/lib/photo-upload";
export function ProfilePhoto({
  photo,
  name,
  small = false,
}: {
  photo?: string;
  name: string;
  small?: boolean;
}) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  return (
    <div className={"profile-photo " + (small ? "small" : "")}>
      {photo && photo !== failedPhoto ? (
        <img
          key={photo}
          src={photo}
          alt={`${name}의 프로필 사진`}
          onError={() => setFailedPhoto(photo)}
          decoding="async"
        />
      ) : (
        <UserRound aria-label="사진 미등록" strokeWidth={1.2} />
      )}
    </div>
  );
}
export function PhotoShowcase({
  photo,
  name,
  level,
  onEdit,
}: {
  photo?: string;
  name: string;
  level: number;
  onEdit: () => void;
}) {
  return (
    <div className="photo-showcase">
      <div className="photo-frame">
        <ProfilePhoto photo={photo} name={name} />
        <span className="photo-level">
          LV. <strong>{level}</strong>
        </span>
      </div>
      <button className="secondary" onClick={onEdit}>
        <Camera size={15} />
        {photo ? "사진 변경" : "내 사진 등록"}
      </button>
    </div>
  );
}
export function PhotoEditor({
  photo,
  name,
  busy,
  onSave,
  close,
}: {
  photo?: string;
  name: string;
  busy: boolean;
  onSave: (photo: string | undefined) => Promise<void>;
  close: () => void;
}) {
  const [draft, setDraft] = useState(photo);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="photo-editor">
      <ProfilePhoto photo={draft} name={name} />
      <p className="modal-description">
        본인 사진이나 직접 만든 프로필 이미지를 등록하세요. 사진 기반 캐릭터
        이미지도 등록할 수 있어요.
      </p>
      <input
        ref={ref}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp"
        aria-label="프로필 사진 파일"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setError("");
          setReading(true);
          try {
            const validated = await preparePhoto(file);
            setDraft(validated);
          } catch (e) {
            setError(e instanceof Error ? e.message : "사진을 읽지 못했어요.");
          } finally {
            setReading(false);
          }
        }}
      />
      <div className="photo-editor-buttons">
        <button
          className="secondary"
          onClick={() => ref.current?.click()}
          disabled={reading}
        >
          <Upload size={16} /> 사진 선택
        </button>
        {draft && (
          <button className="text-button" onClick={() => setDraft(undefined)}>
            <Trash2 size={15} /> 사진 제거
          </button>
        )}
      </div>
      <p className="form-hint">
        JPG · PNG · WebP, 최대 12MB. 큰 사진은 긴 변 1024px로 최적화하고
        화면에서는 원형으로 표시합니다. 기기의 원본 파일은 바꾸지 않습니다.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="customizer-actions">
        <button className="secondary" onClick={close}>
          취소
        </button>
        <button
          className="primary"
          disabled={busy || reading}
          onClick={() => void onSave(draft)}
        >
          프로필 사진 저장
        </button>
      </div>
    </div>
  );
}
