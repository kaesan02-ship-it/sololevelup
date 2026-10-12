export type SyncMeta = {
  ownerId: string;
  version: number;
  dirty: boolean;
  revision: number;
  lastSyncedAt: string | null;
};
export function syncDecision(
  meta: SyncMeta,
  remoteVersion: number | null,
): "upload" | "download" | "same" | "conflict" {
  if (remoteVersion === null) return meta.version === 0 ? "upload" : "conflict";
  if (meta.dirty) return meta.version === remoteVersion ? "upload" : "conflict";
  if (remoteVersion < meta.version) return "conflict";
  return remoteVersion > meta.version ? "download" : "same";
}
export function acknowledge(
  meta: SyncMeta,
  version: number,
  sentRevision: number,
): SyncMeta {
  return {
    ...meta,
    version,
    dirty: meta.revision !== sentRevision,
    lastSyncedAt: new Date().toISOString(),
  };
}
