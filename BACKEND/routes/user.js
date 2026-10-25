const express = require("express");
const router = express.Router();
const U = require("../controllers/user");
const { ensureAuth } = require("../middlewares/auth");
const { authLimiter } = require("../middlewares/security");
const upload = require("../middlewares/multer");

router.post("/register", authLimiter, U.register);
router.post("/login", authLimiter, U.login);
router.post("/logout", U.logout);

// Todo lo demás exige sesión (antes profile y list eran públicos)
router.get("/prueba", ensureAuth, U.pruebaUser);
router.get("/me", ensureAuth, U.me);
router.get("/profile/:id", ensureAuth, U.profile);
router.get("/list/:page", ensureAuth, U.list);
router.put("/update", ensureAuth, U.update);
router.put("/password", ensureAuth, authLimiter, U.changePassword);
router.post("/upload", ensureAuth, upload.single("file0"), U.upload);

module.exports = router;
