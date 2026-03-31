const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const uploadPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Debes subir una imagen válido.' });
        }

        const { filename, path: filepath, originalname } = req.file;
        const descripcion = req.body.descripcion || '';
        
        // Guardar la ruta relativa servible
        const virtualPath = '/uploads/' + filename;

        const result = await db.query(
            'INSERT INTO fotos (nombre, ruta, descripcion, fecha) VALUES ($1, $2, $3, NOW()) RETURNING *',
            [originalname, virtualPath, descripcion]
        );

        res.status(201).json({ success: true, foto: result.rows[0] });
    } catch (err) {
        console.error('Error subiendo foto:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

const getPhotos = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM fotos ORDER BY fecha DESC');
        res.json({ success: true, fotos: result.rows });
    } catch (err) {
        console.error('Error obteniendo fotos:', err);
        res.status(500).json({ error: 'Error interno obteniendo las fotos.' });
    }
};

const deletePhoto = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Obtener ruta para eliminar archivo
        const fotoQuery = await db.query('SELECT ruta FROM fotos WHERE id = $1', [id]);
        if (fotoQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Foto no encontrada' });
        }
        
        const fotoRuta = fotoQuery.rows[0].ruta;
        const filename = fotoRuta.replace('/uploads/', '');
        const filepath = path.join(__dirname, '..', 'uploads', filename);

        // Eliminar archivo del sistema (si existe)
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

module.exports = { uploadPhoto, getPhotos, deletePhoto };
