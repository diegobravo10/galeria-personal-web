const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { uploadPhoto, getPhotos, deletePhoto } = require('../controllers/photoController');
const { requireAuth } = require('../middleware/authMiddleware');

// Obtener todas las fotos (protegido)
router.get('/fotos', requireAuth, getPhotos);

// Subir una foto (protegido) con validación de multer
router.post('/upload', requireAuth, (req, res, next) => {
    const uploadSingle = upload.single('imagen');
    uploadSingle(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, uploadPhoto);

// Eliminar foto (protegido)
router.delete('/foto/:id', requireAuth, deletePhoto);

module.exports = router;
