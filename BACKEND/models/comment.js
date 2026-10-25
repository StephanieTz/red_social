const mongoose = require("mongoose");
const R = mongoose.Schema.Types.ObjectId;
const CommentSchema = new mongoose.Schema({
  user: { type: R, ref: "User", required: true },
  publication: { type: R, ref: "Publication", required: true, index: true },
  parent: { type: R, ref: "Comment", default: null },   // comentario raíz del hilo (null si es raíz)
  replyTo: { type: R, ref: "User", default: null },      // a quién responde (para la @mención)
  text: { type: String, required: true, maxlength: 300 },
  created_at: { type: Date, default: Date.now }
});
module.exports = mongoose.model("Comment", CommentSchema);
