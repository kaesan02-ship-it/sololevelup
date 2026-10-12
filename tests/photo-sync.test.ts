import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parsePhoto } from "../lib/photo";
import { emptyData, validateBackup, xp } from "../lib/model";
import { syncDecision, acknowledge, type SyncMeta } from "../lib/sync-policy";
const meta: SyncMeta = {
  ownerId: "user",
  version: 4,
  dirty: false,
  revision: 7,
  lastSyncedAt: null,
};
test("legacy character fields are ignored and original records remain", () => {
  const original = emptyData();
  const restored = validateBackup({
    ...original,
    profile: { ...original.profile, character: { old: "style" } },
  });
  assert.deepEqual(restored, original);
  assert.equal(xp(restored), xp(original));
});
test("photo backup preserves image and rejects invalid or oversized data", () => {
  const photo =
    "data:image/png;base64," +
    readFileSync("public/icon-192.png").toString("base64");
  const data = emptyData();
  data.profile.photo = photo;
  assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(data))), data);
  assert.equal(parsePhoto(undefined), undefined);
  assert.throws(() => parsePhoto("data:image/svg+xml;base64,PHN2Zz4="));
  assert.throws(() => parsePhoto("data:image/png;base64,bm90IGltYWdl"));
  assert.throws(() => parsePhoto("data:image/png;base64," + "a".repeat(3e6)));
});
test("sync decisions never overwrite divergent versions", () => {
  assert.equal(syncDecision(meta, 4), "same");
  assert.equal(syncDecision(meta, 5), "download");
  assert.equal(syncDecision({ ...meta, dirty: true }, 4), "upload");
  assert.equal(syncDecision({ ...meta, dirty: true }, 5), "conflict");
  assert.equal(syncDecision(meta, 3), "conflict");
  assert.equal(syncDecision(meta, null), "conflict");
  assert.equal(
    syncDecision({ ...meta, version: 0, dirty: true }, null),
    "upload",
  );
});
test("changes during upload remain dirty for next upload", () => {
  const ack = acknowledge({ ...meta, dirty: true }, 5, 7);
  assert.equal(ack.dirty, false);
  assert.equal(ack.version, 5);
  const changed = acknowledge({ ...meta, dirty: true, revision: 8 }, 5, 7);
  assert.equal(changed.dirty, true);
  assert.equal(changed.revision, 8);
});
