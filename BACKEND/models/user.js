const mongoose = require("mongoose");
const paginate = require("mongoose-paginate-v2");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nick: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  image: { type: String },
  bio: { type: String, maxlength: 160, default: "" },
  created_at: { type: Date, default: Date.now }
});
UserSchema.plugin(paginate);
module.exports = mongoose.model("User", UserSchema);
