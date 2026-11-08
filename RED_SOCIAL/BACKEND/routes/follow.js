const express = require("express");
const router = express.Router();
const F = require("../controllers/follow");
const { ensureAuth } = require("../middlewares/auth");

router.use(ensureAuth); // todas las rutas de follows exigen sesión
router.get("/prueba", F.pruebaFollows);
router.get("/suggestions", F.suggestions);
router.post("/follow", F.follow);
router.delete("/unfollow/:id", F.unfollow);
router.get("/followers/:id", F.followers);
router.get("/following/:id", F.following);

module.exports = router;
