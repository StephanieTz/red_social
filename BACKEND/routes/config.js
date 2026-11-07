const express = require("express");
const router = express.Router();
const cfg = require("../config/env");

// Claves PÚBLICAS que el frontend necesita (site key de reCAPTCHA y client id de Google). Nunca secretos.
router.get("/", (req, res) => res.json({ recaptchaSiteKey: cfg.recaptcha.siteKey, googleClientId: cfg.google.clientId }));

module.exports = router;
