/**
 * Formato de salida de usuarios y publicaciones hacia el frontend.
 * Una publicación con foto tiene tres tamaños, todos bajo la misma carpeta de S3:
 *   thumb.jpg (400×400, cuadrícula) · feed.jpg (≤1080 px, publicaciones del inicio) · original.* (resolución completa)
 * La clave de feed.jpg se deduce de la del original, por eso no necesita columna propia.
 */
const url = (key) => (key ? `/media/${key}` : null);
const feedKeyOf = (fileKey) => (fileKey ? fileKey.replace(/\/original\.[A-Za-z0-9]+$/, "/feed.jpg") : null);

const userOut = (u) => u && ({
  _id: u.id, id: u.id, name: u.name, nick: u.nick, bio: u.bio || "",
  image: u.imageKey || null, imageUrl: url(u.imageKey), avatarUrl: url(u.imageKey),
});

const pubOut = (p) => {
  const hasImage = Boolean(p.thumbKey && p.fileKey);
  return {
    _id: p.id, id: p.id, text: p.text, createdAt: p.createdAt, created_at: p.createdAt,
    hasImage, width: p.width ?? null, height: p.height ?? null,
    thumbUrl: hasImage ? url(p.thumbKey) : null,
    imageUrl: hasImage ? url(feedKeyOf(p.fileKey)) : null,
    fullUrl: hasImage ? url(p.fileKey) : null,
    user: userOut(p.user),
  };
};

module.exports = { url, feedKeyOf, userOut, pubOut };
