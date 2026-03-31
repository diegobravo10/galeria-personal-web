const attempts = {};

const login = (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    const { answer } = req.body;
    
    // Inicializar intentos por IP
    if (!attempts[ip]) attempts[ip] = { count: 0, lockoutUntil: null };
    
    // Verificar si está bloqueado
    if (attempts[ip].lockoutUntil && attempts[ip].lockoutUntil > Date.now()) {
        const remaining = Math.ceil((attempts[ip].lockoutUntil - Date.now()) / 1000 / 60);
        return res.status(429).json({ error: `Demasiados intentos fallidos. Intenta de nuevo en ${remaining} minutos.` });
    }
    
    // Validar respuesta (Acertijo configurable por variable de entorno)
    const correctAnswer = process.env.RIDDLE_ANSWER || "vsco";
    
    if (answer && answer.toString().toLowerCase().trim() === correctAnswer.toLowerCase()) {
        // Exito
        req.session.authenticated = true;
        attempts[ip] = { count: 0, lockoutUntil: null }; // Reset
        return res.json({ success: true, redirect: '/galeria' });
    }
    
    // Fallo
    attempts[ip].count++;
    if (attempts[ip].count >= 3) {
        attempts[ip].lockoutUntil = Date.now() + 15 * 60 * 1000; // 15 minutos de bloqueo
        return res.status(403).json({ error: "Has fallado 3 veces. Estás bloqueado por 15 minutos." });
    }
    
    return res.status(401).json({ error: `Respuesta incorrecta. Te quedan ${3 - attempts[ip].count} intentos.` });
};

const logout = (req, res) => {
    req.session.destroy();
    res.redirect('/');
};

module.exports = { login, logout };
