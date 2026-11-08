const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createLocalDriver } = require("../BACKEND/services/storage");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rs-"));
const st = createLocalDriver(dir);
const read = async (s) => { const c = []; for await (const x of s) c.push(x); return Buffer.concat(c); };

test("put / get / remove", async () => {
  await st.put("photos/u1/p1/thumb.jpg", Buffer.from("hola"), "image/jpeg");
  const f = await st.get("photos/u1/p1/thumb.jpg");
  assert.strictEqual(f.contentType, "image/jpeg");
  assert.strictEqual((await read(f.stream)).toString(), "hola");
  await st.remove(["photos/u1/p1/thumb.jpg"]);
  await assert.rejects(() => st.get("photos/u1/p1/thumb.jpg"), { code: "ENOENT" });
});

test("bloquea path traversal", async () => {
  await assert.rejects(() => st.put("../fuera.txt", Buffer.from("x")), /inválida/);
  await assert.rejects(() => st.get("photos/../../etc/passwd"), /inválida/);
});
