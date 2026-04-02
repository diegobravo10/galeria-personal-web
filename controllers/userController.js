const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Registro de usuario
const register = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username y password son requeridos.' });
        }

        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({ error: 'El username debe tener entre 3 y 30 caracteres.' });
        }

        // Solo letras, números, guiones y guiones bajos
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            return res.status(400).json({ error: 'El username solo puede contener letras, números, guiones y guiones bajos.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        // Verificar si el username ya existe
        const existingUser = await db.query('SELECT id FROM usuarios WHERE LOWER(username) = LOWER($1)', [username]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Ese nombre de usuario ya está en uso.' });
        }

        // Hash de contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insertar usuario
        const result = await db.query(
            'INSERT INTO usuarios (username, password) VALUES ($1, $2) RETURNING id, username, created_at',
            [username.toLowerCase(), hashedPassword]
        );

        const user = result.rows[0];

        // Generar JWT
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            token,
            user: { id: user.id, username: user.username }
        });
    } catch (err) {
        console.error('Error en registro:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// Login de usuario
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username y password son requeridos.' });
        }

        // Buscar usuario
        const result = await db.query('SELECT * FROM usuarios WHERE LOWER(username) = LOWER($1)', [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas.' });
        }

        const user = result.rows[0];

        // Verificar contraseña
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales incorrectas.' });
        }

        // Generar JWT
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                foto_perfil: user.foto_perfil,
                acertijo_activo: user.acertijo_activo
            }
        });
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// Obtener perfil propio
const getMe = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, username, foto_perfil, acertijo_activo, pregunta, created_at FROM usuarios WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const user = result.rows[0];

        // Contar fotos
        const photoCount = await db.query('SELECT COUNT(*) FROM fotos WHERE user_id = $1', [req.user.id]);

        res.json({
            success: true,
            user: {
                ...user,
                total_fotos: parseInt(photoCount.rows[0].count)
            }
        });
    } catch (err) {
        console.error('Error obteniendo perfil:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// Actualizar foto de perfil
const updateAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Debes subir una imagen.' });
        }

        const virtualPath = '/uploads/avatars/' + req.file.filename;

        // Eliminar avatar anterior si existe
        const current = await db.query('SELECT foto_perfil FROM usuarios WHERE id = $1', [req.user.id]);
        if (current.rows[0].foto_perfil) {
            const oldFilename = current.rows[0].foto_perfil.replace('/uploads/avatars/', '');
            const oldPath = path.join(__dirname, '..', 'uploads', 'avatars', oldFilename);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        await db.query('UPDATE usuarios SET foto_perfil = $1 WHERE id = $2', [virtualPath, req.user.id]);

        res.json({ success: true, foto_perfil: virtualPath });
    } catch (err) {
        console.error('Error actualizando avatar:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// Configurar acertijo
const updateRiddle = async (req, res) => {
    try {
        const { acertijo_activo, pregunta, respuesta } = req.body;

        if (acertijo_activo && (!pregunta || !respuesta)) {
            return res.status(400).json({ error: 'Debes proporcionar pregunta y respuesta para activar el acertijo.' });
        }

        await db.query(
            'UPDATE usuarios SET acertijo_activo = $1, pregunta = $2, respuesta = $3 WHERE id = $4',
            [
                acertijo_activo || false,
                acertijo_activo ? pregunta.trim() : null,
                acertijo_activo ? respuesta.trim().toLowerCase() : null,
                req.user.id
            ]
        );

        res.json({ success: true, message: 'Acertijo actualizado correctamente.' });
    } catch (err) {
        console.error('Error actualizando acertijo:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// Obtener perfil público de un usuario
const getPublicProfile = async (req, res) => {
    try {
        const { username } = req.params;

        const result = await db.query(
            'SELECT id, username, foto_perfil, acertijo_activo, pregunta, created_at FROM usuarios WHERE LOWER(username) = LOWER($1)',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const user = result.rows[0];

        // Contar fotos
        const photoCount = await db.query('SELECT COUNT(*) FROM fotos WHERE user_id = $1', [user.id]);

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                foto_perfil: user.foto_perfil,
                acertijo_activo: user.acertijo_activo,
                pregunta: user.acertijo_activo ? user.pregunta : null,
                total_fotos: parseInt(photoCount.rows[0].count),
                created_at: user.created_at
            }
        });
    } catch (err) {
        console.error('Error obteniendo perfil público:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// Verificar acertijo de un usuario
const verifyRiddle = async (req, res) => {
    try {
        const { username } = req.params;
        const { respuesta } = req.body;

        if (!respuesta) {
            return res.status(400).json({ error: 'Debes proporcionar una respuesta.' });
        }

        const result = await db.query(
            'SELECT id, acertijo_activo, respuesta FROM usuarios WHERE LOWER(username) = LOWER($1)',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const user = result.rows[0];

        if (!user.acertijo_activo) {
            return res.json({ success: true, message: 'Este usuario no tiene acertijo activo.' });
        }

        if (respuesta.trim().toLowerCase() === user.respuesta) {
            // Generate a short-lived token to prove riddle was solved
            const riddleToken = jwt.sign(
                { riddle_solved: true, target_user_id: user.id },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
            return res.json({ success: true, message: 'Respuesta correcta.', riddle_token: riddleToken });
        }

        return res.status(403).json({ error: 'Respuesta incorrecta. Intenta de nuevo.' });
    } catch (err) {
        console.error('Error verificando acertijo:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// Listar todos los usuarios (para explorar)
const listUsers = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT u.id, u.username, u.foto_perfil, u.acertijo_activo, u.created_at,
                   COUNT(f.id) as total_fotos
            FROM usuarios u
            LEFT JOIN fotos f ON u.id = f.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);

        res.json({ success: true, users: result.rows });
    } catch (err) {
        console.error('Error listando usuarios:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = {
    register,
    login,
    getMe,
    updateAvatar,
    updateRiddle,
    getPublicProfile,
    verifyRiddle,
    listUsers
};
