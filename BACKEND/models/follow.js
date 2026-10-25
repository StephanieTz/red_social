const mongoose = require("mongoose");

const FollowSchema = new mongoose.Schema({
  follower_user: {
     type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  followed_user: {
     type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  created_at: {
     type: Date, default: Date.now }
});

module.exports = mongoose.model("Follow", FollowSchema);