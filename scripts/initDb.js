const db = require('../config/db');

const init = async () => {
    try {
        // Eliminar tablas existentes para empezar limpio
        await db.query(`DROP TABLE IF EXISTS fotos CASCADE;`);
        await db.query(`DROP TABLE IF EXISTS usuarios CASCADE;`);

        // Tabla de usuarios
        await db.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                foto_perfil TEXT DEFAULT NULL,
                acertijo_activo BOOLEAN DEFAULT FALSE,
                pregunta TEXT DEFAULT NULL,
                respuesta TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✓ Tabla "usuarios" creada exitosamente.');

        // Tabla de imágenes
        await db.query(`
            CREATE TABLE IF NOT EXISTS fotos (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                ruta TEXT NOT NULL,
                descripcion TEXT DEFAULT '',
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✓ Tabla "fotos" creada exitosamente.');

        // Índice para búsquedas rápidas por usuario
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_fotos_user_id ON fotos(user_id);
        `);
        console.log('✓ Índices creados exitosamente.');

        console.log('\n✅ Base de datos inicializada correctamente.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error inicializando base de datos:', err);
        process.exit(1);
    }
};

init();
