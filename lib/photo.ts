export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export function parsePhoto(input: unknown): string | undefined {
  if (input === undefined || input === null || input === "") return undefined;
  if (typeof input !== "string" || input.length > MAX_PHOTO_BYTES * 1.4 + 100)
    throw Error("사진은 2MB 이하로 선택해주세요.");
  const match =
    /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(input);
  if (!match || match[2].length % 4 !== 0)
    throw Error("JPG, PNG, WebP 사진을 선택해주세요.");
  const head = atob(match[2].slice(0, 48));
  const valid =
    match[1] === "png"
      ? head.startsWith("\x89PNG\r\n\x1a\n")
      : match[1] === "jpeg"
        ? head.startsWith("\xff\xd8\xff")
        : head.startsWith("RIFF") && head.slice(8, 12) === "WEBP";
  if (!valid) throw Error("올바른 사진 파일을 선택해주세요.");
  const bytes =
    (match[2].length * 3) / 4 -
    (match[2].endsWith("==") ? 2 : match[2].endsWith("=") ? 1 : 0);
  if (bytes > MAX_PHOTO_BYTES) throw Error("사진은 2MB 이하로 선택해주세요.");
  return input;
}
