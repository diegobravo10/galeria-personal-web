const express = require('express');
const router = express.Router();
const { login, logout } = require('../controllers/authController');

router.post('/login', login);
router.post('/logout', logout);
router.get('/logout', logout); // Soportar GET para logout fácil

module.exports = router;
