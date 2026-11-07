const test = require("node:test");
const assert = require("node:assert");
const bcrypt = require("bcryptjs");
const pw = require("../BACKEND/services/password");

test("hash con sal única; verifica correcta e incorrecta", async () => {
  const s1 = pw.newSalt(), s2 = pw.newSalt();
  assert.notStrictEqual(s1, s2);
  const h = await pw.hash("MiClaveSegura123", s1);
  assert.ok((await pw.verify("MiClaveSegura123", { passwordHash: h, salt: s1 })).ok);
  assert.ok(!(await pw.verify("otra", { passwordHash: h, salt: s1 })).ok);
  assert.ok(!(await pw.verify("MiClaveSegura123", { passwordHash: h, salt: s2 })).ok);
});

test("la sal cuenta aunque la contraseña sea larguísima (límite de 72 bytes de bcrypt)", async () => {
  const long = "a".repeat(100);
  const h = await pw.hash(long, pw.newSalt());
  assert.ok(!(await pw.verify(long, { passwordHash: h, salt: pw.newSalt() })).ok);
});

test("acepta el formato anterior y lo marca como legacy", async () => {
  const salt = pw.newSalt();
  const legacy = await bcrypt.hash("ClaveVieja123" + salt, 10);
  const r = await pw.verify("ClaveVieja123", { passwordHash: legacy, salt });
  assert.deepStrictEqual([r.ok, r.legacy], [true, true]);
});
