/**
 * Análisis de imágenes.
 *  - face-api.js corre en el NAVEGADOR (FRONTEND/src/faceDetect.js) y envía los rostros detectados;
 *    aquí solo se validan y se guardan (tabla image_analysis, provider FACEAPI).
 *  - Amazon Rekognition (opcional, REKOGNITION_ENABLED=true): rostros, etiquetas y contenido inapropiado
 *    analizados en el servidor. Si detecta contenido inapropiado la foto se rechaza.
 */
const cfg = require("../config/env");

function sanitizeFaces(raw) {
  let arr;
  try { arr = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return null; }
  if (!Array.isArray(arr)) return null;
  return arr.slice(0, 50)
    .map((f) => ({ x: Number(f?.x), y: Number(f?.y), width: Number(f?.width), height: Number(f?.height), score: Number(f?.score) }))
    .filter((f) => [f.x, f.y, f.width, f.height].every(Number.isFinite))
    .map((f) => ({ ...f, score: Number.isFinite(f.score) ? Math.min(1, Math.max(0, f.score)) : null }));
}

async function rekognition(buffer) {
  const { RekognitionClient, DetectFacesCommand, DetectLabelsCommand, DetectModerationLabelsCommand } = require("@aws-sdk/client-rekognition");
  const client = new RekognitionClient({ region: cfg.storage.region });
  const Image = { Bytes: buffer };
  const [faces, labels, mod] = await Promise.all([
    client.send(new DetectFacesCommand({ Image })),
    client.send(new DetectLabelsCommand({ Image, MaxLabels: 10, MinConfidence: 75 })),
    client.send(new DetectModerationLabelsCommand({ Image, MinConfidence: 60 })),
  ]);
  const r1 = (n) => Math.round(n * 10) / 10;
  return {
    faces: (faces.FaceDetails || []).map((f) => ({ box: f.BoundingBox, confidence: r1(f.Confidence) })),
    labels: (labels.Labels || []).map((l) => ({ name: l.Name, confidence: r1(l.Confidence) })),
    moderation: (mod.ModerationLabels || []).map((l) => ({ name: l.Name, confidence: r1(l.Confidence) })),
  };
}

/** → { flagged: boolean, row: datos para la tabla image_analysis | null } */
async function analyze(buffer, clientFaces) {
  let rek = null;
  if (cfg.rekognition) {
    try { rek = await rekognition(buffer); } catch (e) { console.error("Rekognition:", e.message); }
  }
  if (rek) {
    return {
      flagged: rek.moderation.length > 0,
      row: { provider: "REKOGNITION", faces: rek.faces, faceCount: rek.faces.length, labels: rek.labels, moderation: rek.moderation, rawResponse: { clientFaceApi: clientFaces } },
    };
  }
  if (clientFaces) return { flagged: false, row: { provider: "FACEAPI", faces: clientFaces, faceCount: clientFaces.length } };
  return { flagged: false, row: null };
}

module.exports = { analyze, sanitizeFaces };
