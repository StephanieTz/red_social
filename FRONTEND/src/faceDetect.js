/**
 * Detección de rostros en el navegador con face-api.js (modelo TinyFaceDetector, ~190 KB en /models).
 * Se importa de forma perezosa (import dinámico) para no engordar la carga inicial de la página.
 */
let faceapi;
let ready;

async function load() {
  if (!ready) {
    ready = (async () => {
      faceapi = await import("@vladmandic/face-api");
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    })();
  }
  return ready;
}

/** @param {HTMLImageElement} img  @returns {Promise<{x,y,width,height,score}[]>} cajas en píxeles de la imagen original */
export async function detectFaces(img) {
  await load();
  const found = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }));
  return found.map((f) => ({
    x: Math.round(f.box.x), y: Math.round(f.box.y), width: Math.round(f.box.width), height: Math.round(f.box.height),
    score: Math.round(f.score * 1000) / 1000,
  }));
}
