const requireAuth = (req, res, next) => {
    if (req.session && req.session.authenticated) {
        return next();
    } else {
        // Si es una petición de API (espera JSON)
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(401).json({ error: 'No autorizado' });
        }
        // Si es una navegación normal
        res.redirect('/');
    }
};

module.exports = { requireAuth };
