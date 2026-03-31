const db = require('../config/db');

const init = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS fotos (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255),
                ruta TEXT,
                descripcion TEXT,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Tabla "fotos" verificada/creada exitosamente.');
        process.exit(0);
    } catch (err) {
        console.error('Error inicializando base de datos:', err);
        process.exit(1);
    }
};

init();
