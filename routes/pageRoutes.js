const express = require('express');
const router = express.Router();
const path = require('path');
const { requireAuth } = require('../middleware/authMiddleware');

// La página principal redirige a la galería pública
router.get('/', (req, res) => {
    res.redirect('/galeria');
});

// Vista de la galería (Pública)
router.get('/galeria', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/galeria.html'));
});

router.get('/subiryo', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/subiryo.html'));
});

router.get('/eliminaryo', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/eliminaryo.html'));
});

module.exports = router;
