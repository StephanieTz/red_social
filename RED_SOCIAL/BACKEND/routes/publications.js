const express = require("express");
const router = express.Router();
const P = require("../controllers/publications");
const { ensureAuth } = require("../middlewares/auth");

router.use(ensureAuth);
router.get("/feed/:page", P.feed);
router.get("/profile/:id/:page", P.profile);
router.get("/:id", P.getOne);

module.exports = router;
