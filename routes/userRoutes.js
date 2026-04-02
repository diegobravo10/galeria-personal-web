const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { uploadAvatar } = require('../middleware/uploadMiddleware');
const {
    register,
    login,
    getMe,
    updateAvatar,
    updateRiddle,
    getPublicProfile,
    verifyRiddle,
    listUsers
} = require('../controllers/userController');

// Auth
router.post('/api/auth/register', register);
router.post('/api/auth/login', login);

// Perfil propio (protegido)
router.get('/api/users/me', requireAuth, getMe);
router.put('/api/users/me/avatar', requireAuth, (req, res, next) => {
    const upload = uploadAvatar.single('avatar');
    upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, updateAvatar);
router.put('/api/users/me/riddle', requireAuth, updateRiddle);

// Explorar usuarios
router.get('/api/users', listUsers);

// Perfil público
router.get('/api/users/:username', getPublicProfile);
router.post('/api/users/:username/riddle', verifyRiddle);

module.exports = router;
