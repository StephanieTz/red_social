const express = require("express");
const router = express.Router();
const P = require("../controllers/photos");
const { ensureAuth } = require("../middlewares/auth");
const { uploadLimiter } = require("../middlewares/security");
const upload = require("../middlewares/upload");

router.use(ensureAuth);
router.get("/", P.list);
router.get("/:id", P.get);
router.post("/", uploadLimiter, upload.media, P.create);
router.delete("/:id", P.remove);

module.exports = router;
