import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { type Data, validateBackup } from "./model";
let client: SupabaseClient | null = null;
export function cloudClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    if (new URL(url).protocol !== "https:") return null;
  } catch {
    return null;
  }
  return client ?? (client = createClient(url, key));
}
export async function readCloud(ownerId: string, token: string) {
  const c = cloudClient();
  if (!c) throw Error("동기화 연결 설정이 필요합니다.");
  const { data, error } = await c
    .from("growth_saves")
    .select("payload,version,updated_at")
    .eq("id", ownerId)
    .maybeSingle()
    .setHeader("Authorization", `Bearer ${token}`);
  if (error) throw error;
  if (!data) return null;
  if (!Number.isSafeInteger(data.version) || data.version < 1)
    throw Error("동기화 버전을 확인하지 못했습니다.");
  return {
    data: validateBackup(data.payload),
    version: data.version,
    updatedAt: String(data.updated_at),
  };
}
export async function writeCloud(data: Data, version: number, token: string) {
  const c = cloudClient();
  if (!c) throw Error("동기화 연결 설정이 필요합니다.");
  const result = await c
    .rpc("save_growth_data", {
      expected_version: version,
      new_payload: data,
    })
    .setHeader("Authorization", `Bearer ${token}`);
  if (result.error) throw result.error;
  const next = Number(result.data);
  if (!Number.isSafeInteger(next) || next < 1)
    throw Error("동기화 저장 결과를 확인하지 못했습니다.");
  return next;
}
