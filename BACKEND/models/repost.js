const mongoose = require("mongoose");
const RepostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  publication: { type: mongoose.Schema.Types.ObjectId, ref: "Publication", required: true },
  created_at: { type: Date, default: Date.now }
});
RepostSchema.index({ user: 1, publication: 1 }, { unique: true });
module.exports = mongoose.model("Repost", RepostSchema);
