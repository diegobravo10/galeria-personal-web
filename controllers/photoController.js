const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Subir foto (usuario autenticado)
const uploadPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Debes subir una imagen válida.' });
        }

        const descripcion = req.body.descripcion || '';
        const virtualPath = '/uploads/' + req.file.filename;

        const result = await db.query(
            'INSERT INTO fotos (user_id, ruta, descripcion, fecha) VALUES ($1, $2, $3, NOW()) RETURNING *',
            [req.user.id, virtualPath, descripcion]
        );

        res.status(201).json({ success: true, foto: result.rows[0] });
    } catch (err) {
        console.error('Error subiendo foto:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// Obtener mis fotos
const getMyPhotos = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM fotos WHERE user_id = $1 ORDER BY fecha DESC',
            [req.user.id]
        );
        res.json({ success: true, fotos: result.rows });
    } catch (err) {
        console.error('Error obteniendo fotos:', err);
        res.status(500).json({ error: 'Error interno obteniendo las fotos.' });
    }
};

// Obtener fotos de un usuario público
const getUserPhotos = async (req, res) => {
    try {
        const { username } = req.params;

        // Buscar usuario
        const userResult = await db.query(
            'SELECT id, acertijo_activo FROM usuarios WHERE LOWER(username) = LOWER($1)',
            [username]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const user = userResult.rows[0];

        // Si tiene acertijo activo, verificar acceso
        if (user.acertijo_activo && (!req.user || req.user.id !== user.id)) {
            // Check for riddle_token
            const riddleToken = req.query.riddle_token;
            let riddleSolved = false;

            if (riddleToken) {
                try {
                    const decoded = jwt.verify(riddleToken, process.env.JWT_SECRET);
                    if (decoded.riddle_solved && decoded.target_user_id === user.id) {
                        riddleSolved = true;
                    }
                } catch (e) {
                    // Token invalid or expired
                }
            }

            if (!riddleSolved) {
                return res.status(403).json({
                    error: 'Este usuario tiene un acertijo activo. Debes resolverlo para ver su galería.',
                    acertijo_activo: true
                });
            }
        }

        const result = await db.query(
            'SELECT * FROM fotos WHERE user_id = $1 ORDER BY fecha DESC',
            [user.id]
        );

        res.json({ success: true, fotos: result.rows });
    } catch (err) {
        console.error('Error obteniendo fotos del usuario:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// Eliminar foto (solo propias)
const deletePhoto = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que la foto pertenece al usuario
        const fotoQuery = await db.query('SELECT ruta, user_id FROM fotos WHERE id = $1', [id]);
        if (fotoQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Foto no encontrada.' });
        }

        if (fotoQuery.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar esta foto.' });
        }

        const fotoRuta = fotoQuery.rows[0].ruta;
        const filename = fotoRuta.replace('/uploads/', '');
        const filepath = path.join(__dirname, '..', 'uploads', filename);

        // Eliminar archivo del sistema
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }

        // Eliminar de base de datos
        await db.query('DELETE FROM fotos WHERE id = $1', [id]);

        res.json({ success: true, message: 'Foto eliminada correctamente.' });
    } catch (err) {
        console.error('Error eliminando foto:', err);
        res.status(500).json({ error: 'Error interno eliminando foto.' });
    }
};

// Eliminar múltiples fotos
const deleteMultiplePhotos = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Debes proporcionar un array de IDs.' });
        }

        // Obtener fotos que pertenecen al usuario
        const fotosQuery = await db.query(
            'SELECT id, ruta FROM fotos WHERE id = ANY($1) AND user_id = $2',
            [ids, req.user.id]
        );

        if (fotosQuery.rows.length === 0) {
            return res.status(404).json({ error: 'No se encontraron fotos para eliminar.' });
        }

        // Eliminar archivos
        for (const foto of fotosQuery.rows) {
            const filename = foto.ruta.replace('/uploads/', '');
            const filepath = path.join(__dirname, '..', 'uploads', filename);
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
        }

        // Eliminar de base de datos
        const deletedIds = fotosQuery.rows.map(f => f.id);
        await db.query('DELETE FROM fotos WHERE id = ANY($1) AND user_id = $2', [deletedIds, req.user.id]);

        res.json({
            success: true,
            message: `${deletedIds.length} foto(s) eliminada(s) correctamente.`,
            deletedCount: deletedIds.length
        });
    } catch (err) {
        console.error('Error eliminando fotos:', err);
        res.status(500).json({ error: 'Error interno eliminando fotos.' });
    }
};

// Actualizar descripción de foto
const updatePhotoDescription = async (req, res) => {
    try {
        const { id } = req.params;
        const { descripcion } = req.body;

        // Verificar propiedad
        const fotoQuery = await db.query('SELECT user_id FROM fotos WHERE id = $1', [id]);
        if (fotoQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Foto no encontrada.' });
        }

        if (fotoQuery.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ error: 'No tienes permiso para editar esta foto.' });
        }

        await db.query('UPDATE fotos SET descripcion = $1 WHERE id = $2', [descripcion || '', id]);

        res.json({ success: true, message: 'Descripción actualizada.' });
    } catch (err) {
        console.error('Error actualizando descripción:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = { uploadPhoto, getMyPhotos, getUserPhotos, deletePhoto, deleteMultiplePhotos, updatePhotoDescription };
