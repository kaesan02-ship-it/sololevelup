import { MAX_PHOTO_BYTES, parsePhoto } from "./photo";
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
export async function preparePhoto(file: File) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw Error("JPG, PNG, WebP 사진을 선택해주세요.");
  if (file.size > MAX_UPLOAD_BYTES)
    throw Error("사진은 12MB 이하로 선택해주세요.");
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(Error("사진을 읽지 못했어요."));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(Error("사진을 표시할 수 없습니다. 다른 파일을 선택해주세요."));
    image.src = source;
  });
  if (
    image.naturalWidth <= 1024 &&
    image.naturalHeight <= 1024 &&
    file.size <= MAX_PHOTO_BYTES
  )
    return parsePhoto(source)!;
  const scale = Math.min(
    1,
    1024 / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context)
    throw Error(
      "사진 최적화를 지원하지 않는 브라우저입니다. 2MB 이하 사진을 선택해주세요.",
    );
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return parsePhoto(canvas.toDataURL("image/webp", 0.88))!;
}
