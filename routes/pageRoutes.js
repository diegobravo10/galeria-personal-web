const express = require('express');
const router = express.Router();
const path = require('path');
const { requireAuth } = require('../middleware/authMiddleware');

// La página principal ya es servida por express.static pero podemos asegurar su ruta
router.get('/', (req, res) => {
    // Si ya está autenticado, enviarlo a la galería
    if (req.session.authenticated) {
        return res.redirect('/galeria');
    }
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Vistas protegidas
router.get('/galeria', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/galeria.html'));
});

router.get('/subiryo', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/subiryo.html'));
});

module.exports = router;
