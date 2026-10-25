const mongoose = require("mongoose");
// kind "post": value 1 (like) o -1 (dislike). kind "comment": solo like (1).
const ReactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  kind: { type: String, enum: ["post", "comment"], required: true },
  target: { type: mongoose.Schema.Types.ObjectId, required: true },
  value: { type: Number, enum: [1, -1], required: true }
});
ReactionSchema.index({ user: 1, kind: 1, target: 1 }, { unique: true });
ReactionSchema.index({ kind: 1, target: 1 });
module.exports = mongoose.model("Reaction", ReactionSchema);
