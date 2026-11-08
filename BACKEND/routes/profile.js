const express = require("express");
const router = express.Router();
const P = require("../controllers/profile");
const { ensureAuth } = require("../middlewares/auth");

router.use(ensureAuth);
router.get("/:nick", P.header);
router.get("/:nick/:tab", P.tab);

module.exports = router;
