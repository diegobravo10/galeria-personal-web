const express = require('express');
const router = express.Router();
const { uploadGallery } = require('../middleware/uploadMiddleware');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');
const {
    uploadPhoto,
    getMyPhotos,
    getUserPhotos,
    deletePhoto,
    deleteMultiplePhotos,
    updatePhotoDescription
} = require('../controllers/photoController');

// Mis fotos (protegido)
router.get('/api/photos/me', requireAuth, getMyPhotos);

// Subir foto (protegido)
router.post('/api/photos/upload', requireAuth, (req, res, next) => {
    const upload = uploadGallery.single('imagen');
    upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, uploadPhoto);

// Eliminar foto propia
router.delete('/api/photos/:id', requireAuth, deletePhoto);

// Eliminar múltiples fotos
router.post('/api/photos/delete-batch', requireAuth, deleteMultiplePhotos);

// Editar descripción
router.put('/api/photos/:id', requireAuth, updatePhotoDescription);

// Fotos de un usuario (público, con check de acertijo)
router.get('/api/photos/user/:username', optionalAuth, getUserPhotos);

module.exports = router;
