const test = require("node:test");
const assert = require("node:assert");
const { sanitizeFaces, analyze } = require("../BACKEND/services/analysis");

test("sanitizeFaces descarta basura y limita valores", () => {
  const raw = JSON.stringify([{ x: 1, y: 2, width: 30, height: 40, score: 1.7 }, { x: "a" }, null]);
  assert.deepStrictEqual(sanitizeFaces(raw), [{ x: 1, y: 2, width: 30, height: 40, score: 1 }]);
  assert.strictEqual(sanitizeFaces("no es json"), null);
  assert.strictEqual(sanitizeFaces('{"a":1}'), null);
});

test("analyze usa face-api del cliente cuando Rekognition está apagado", async () => {
  const faces = [{ x: 1, y: 2, width: 3, height: 4, score: 0.9 }];
  const r = await analyze(Buffer.alloc(1), faces);
  assert.strictEqual(r.flagged, false);
  assert.deepStrictEqual([r.row.provider, r.row.faceCount], ["FACEAPI", 1]);
  assert.strictEqual((await analyze(Buffer.alloc(1), null)).row, null);
});
