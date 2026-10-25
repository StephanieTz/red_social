const mongoose = require("mongoose");
const paginate = require("mongoose-paginate-v2");

const PublicationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    file: { type: String },
    created_at: { type: Date, default: Date.now }
});

PublicationSchema.plugin(paginate);

module.exports = mongoose.model("Publication", PublicationSchema);