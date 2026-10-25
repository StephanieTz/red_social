const mongoose = require("mongoose");
const SaveSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  publication: { type: mongoose.Schema.Types.ObjectId, ref: "Publication", required: true },
  created_at: { type: Date, default: Date.now }
});
SaveSchema.index({ user: 1, publication: 1 }, { unique: true });
module.exports = mongoose.model("Save", SaveSchema);
