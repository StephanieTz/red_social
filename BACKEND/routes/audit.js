const express = require("express");
const router = express.Router();
const A = require("../controllers/audit");
const { ensureAuth, ensureAdmin } = require("../middlewares/auth");

router.get("/", ensureAuth, ensureAdmin, A.list);

module.exports = router;
