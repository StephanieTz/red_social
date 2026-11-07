const test = require("node:test");
const assert = require("node:assert");
const sharp = require("sharp");
const { processImage, processAvatar } = require("../BACKEND/services/images");

// Imagen de prueba a color: 1200×800
const sample = (format = "png") =>
  sharp({ create: { width: 1200, height: 800, channels: 3, background: { r: 200, g: 80, b: 40 } } })[format]().toBuffer();

test("genera miniatura 400×400 y 3 transformaciones", async () => {
  const r = await processImage(await sample());
  assert.deepStrictEqual([r.thumb.width, r.thumb.height], [400, 400]);
  assert.deepStrictEqual(r.transforms.map((t) => t.type), ["GRAYSCALE", "SEPIA", "UPSCALE"]);
  assert.deepStrictEqual([r.original.width, r.original.height, r.original.ext], [1200, 800, "png"]);
});

test("la ampliación duplica el ancho", async () => {
  const r = await processImage(await sample("jpeg"));
  assert.strictEqual(r.transforms.find((t) => t.type === "UPSCALE").width, 2400);
});

test("blanco y negro: los tres canales son (casi) iguales; sepia: rojo > azul", async () => {
  const r = await processImage(await sample());
  const mean = async (buf) => (await sharp(buf).stats()).channels.map((c) => c.mean);
  const [gr, gg, gb] = await mean(r.transforms[0].buffer);
  assert.ok(Math.abs(gr - gg) < 3 && Math.abs(gg - gb) < 3);
  const [sr, , sb] = await mean(r.transforms[1].buffer);
  assert.ok(sr > sb + 20);
});

test("rechaza archivos que no son imagen y formatos no permitidos", async () => {
  await assert.rejects(() => processImage(Buffer.from("esto no es una imagen")), { status: 400 });
  const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } }).gif().toBuffer();
  await assert.rejects(() => processImage(gif), { status: 400 });
});

test("avatar 256×256", async () => {
  const m = await sharp(await processAvatar(await sample())).metadata();
  assert.deepStrictEqual([m.width, m.height], [256, 256]);
});
