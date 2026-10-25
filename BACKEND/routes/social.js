const express = require("express");
const router = express.Router();
const S = require("../controllers/social");
const { ensureAuth } = require("../middlewares/auth");

router.use(ensureAuth); // todo el módulo social exige sesión
router.post("/stats", S.stats);
router.post("/react", S.react);
router.get("/comments/:id", S.comments);
router.post("/comment", S.addComment);
router.delete("/comment/:id", S.removeComment);
router.post("/comment-like", S.likeComment);
router.post("/save", S.toggleSave);
router.get("/saved", S.saved);
router.post("/repost", S.toggleRepost);
router.get("/activity/:tab", S.activity);
router.get("/search", S.search);

module.exports = router;
