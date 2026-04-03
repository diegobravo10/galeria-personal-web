const { Pool } = require('pg');

// Solo cargar .env si no estamos en Docker (si las vars ya existen, no sobreescribir)
if (!process.env.DB_HOST) {
  require('dotenv').config();
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.on('error', (err, client) => {
  console.error('Error in PostgreSQL database client:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
