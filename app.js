require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'secreto_super_seguro',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // true solo en producción con HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 1 día
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Protección de archivos HTML directos y servir carpeta public
app.use((req, res, next) => {
    // Si intentan acceder directamente a .html y no es login.html
    const protectedStaticFiles = ['/subir.html', '/subiryo.html'];
    if (protectedStaticFiles.includes(req.path)) {
        if (!req.session.authenticated) {
            return res.redirect('/');
        }
    }
    next();
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const photoRoutes = require('./routes/photoRoutes');
const pageRoutes = require('./routes/pageRoutes');

// Rutas de API
app.use('/', authRoutes);
app.use('/', photoRoutes);
app.use('/', pageRoutes);

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
