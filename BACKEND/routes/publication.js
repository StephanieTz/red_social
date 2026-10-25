const express = require("express");
const router = express.Router();
const P = require("../controllers/publication");
const { ensureAuth } = require("../middlewares/auth");
const upload = require("../middlewares/multer");

router.get("/prueba", ensureAuth, P.pruebaPublication);
router.post("/create", ensureAuth, upload.media.single("file0"), P.create);
router.get("/feed/:page", ensureAuth, P.feed);
router.get("/profile/:id/:page", ensureAuth, P.profilePublications);
router.delete("/delete/:id", ensureAuth, P.remove);

module.exports = router;
