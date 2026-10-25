const express = require("express");
const router = express.Router();
const FollowController = require("../controllers/follow");
const { ensureAuth } = require("../middlewares/auth");

// Todas las rutas de follows deben estar protegidas
router.get("/prueba", ensureAuth, FollowController.pruebaFollows);
router.post("/follow", ensureAuth, FollowController.follow);
router.delete("/unfollow/:id", ensureAuth, FollowController.unfollow);
router.get("/followers/:id", ensureAuth, FollowController.followers);
router.get("/following/:id", ensureAuth, FollowController.following);

module.exports = router;