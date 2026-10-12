import Dexie, { type Table } from "dexie";
import {
  type Data,
  emptyData,
  validateBackup,
  normalizeProfile,
} from "./model";
import { type SyncMeta, acknowledge } from "./sync-policy";
class Database extends Dexie {
  state!: Table<{ id: string; data: Data }, string>;
  sync!: Table<{ id: string; meta: SyncMeta }, string>;
  constructor() {
    super("solo-levelup");
    this.version(1).stores({ state: "id" });
    this.version(2).stores({ state: "id", sync: "id" });
  }
}
const db = new Database();
export async function load() {
  return normalizeProfile((await db.state.get("main"))?.data ?? emptyData());
}
export async function loadSyncMeta() {
  return (await db.sync.get("main"))?.meta ?? null;
}
export class StaleDataError extends Error {}
function sameData(a: Data, b: Data) {
  return (
    JSON.stringify(normalizeProfile(a)) === JSON.stringify(normalizeProfile(b))
  );
}
export async function save(data: Data, expected: Data) {
  await db.transaction("rw", db.state, db.sync, async () => {
    const current = (await db.state.get("main"))?.data ?? emptyData();
    if (!sameData(current, expected))
      throw new StaleDataError("새 기록이 있습니다.");
    await db.state.put({ id: "main", data: validateBackup(data) });
    const existing = await db.sync.get("main");
    if (existing)
      await db.sync.put({
        id: "main",
        meta: {
          ...existing.meta,
          dirty: true,
          revision: existing.meta.revision + 1,
        },
      });
  });
  window.dispatchEvent(new Event("solo-local-change"));
}
export async function linkSync(ownerId: string, version: number) {
  await db.transaction("rw", db.sync, async () => {
    const meta = (await db.sync.get("main"))?.meta;
    await db.sync.put({
      id: "main",
      meta: {
        ownerId,
        version,
        dirty: true,
        revision: (meta?.revision ?? 0) + 1,
        lastSyncedAt: null,
      },
    });
  });
}
export async function acknowledgeUpload(
  ownerId: string,
  version: number,
  sentRevision: number,
) {
  await db.transaction("rw", db.sync, async () => {
    const row = await db.sync.get("main");
    if (row?.meta.ownerId === ownerId && version >= row.meta.version)
      await db.sync.put({
        id: "main",
        meta: acknowledge(row.meta, version, sentRevision),
      });
  });
}
export async function applyRemote(
  data: Data,
  ownerId: string,
  version: number,
  expectedRevision: number | null,
  expectedData: Data,
) {
  return db.transaction("rw", db.state, db.sync, async () => {
    const meta = (await db.sync.get("main"))?.meta ?? null;
    if ((meta?.revision ?? null) !== expectedRevision) return false;
    const current = (await db.state.get("main"))?.data ?? emptyData();
    if (!sameData(current, expectedData)) return false;
    await db.state.put({ id: "main", data: validateBackup(data) });
    await db.sync.put({
      id: "main",
      meta: {
        ownerId,
        version,
        dirty: false,
        revision: (meta?.revision ?? 0) + 1,
        lastSyncedAt: new Date().toISOString(),
      },
    });
    return true;
  });
}

export async function loadSyncSnapshot() {
  return db.transaction("r", db.state, db.sync, async () => ({
    data: normalizeProfile((await db.state.get("main"))?.data ?? emptyData()),
    meta: (await db.sync.get("main"))?.meta ?? null,
  }));
}
