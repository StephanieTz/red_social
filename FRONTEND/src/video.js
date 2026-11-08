/**
 * Toma un fotograma del video (portada) con un canvas. El servidor lo convierte en miniatura y versión del inicio.
 * Si el navegador no puede leer el video (p. ej. códec HEVC), se avisa antes de subirlo.
 */
export function capturePoster(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    let dur = 0;
    const fail = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer el video. Usa MP4 (H.264) o WEBM.")); };
    v.preload = "metadata"; v.muted = true; v.playsInline = true; v.src = url;
    v.onerror = fail;
    v.onloadedmetadata = () => {
      if (!Number.isFinite(v.duration) || v.duration <= 0 || !v.videoWidth) return fail();
      dur = v.duration;
      v.currentTime = Math.min(1, dur / 2);
    };
    v.onseeked = () => {
      const w = Math.min(v.videoWidth, 1080), h = Math.round((v.videoHeight * w) / v.videoWidth);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(v, 0, 0, w, h);
      c.toBlob((blob) => { URL.revokeObjectURL(url); blob ? resolve({ blob, duration: dur }) : reject(new Error("No se pudo crear la portada del video.")); }, "image/jpeg", 0.85);
    };
  });
}
