/* ═══════════════════════════════════════════════════
   GALERÍA SOCIAL — SPA ENGINE
   ═══════════════════════════════════════════════════ */

// ────────────────────── API SERVICE ──────────────────────

const Api = {
    getToken() {
        return localStorage.getItem('token');
    },

    setToken(token) {
        localStorage.setItem('token', token);
    },

    clearToken() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getUser() {
        try {
            return JSON.parse(localStorage.getItem('user'));
        } catch { return null; }
    },

    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },

    isLoggedIn() {
        return !!this.getToken();
    },

    async request(url, options = {}) {
        const token = this.getToken();
        const headers = { ...options.headers };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Don't set Content-Type for FormData
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            if (options.body && typeof options.body === 'object') {
                options.body = JSON.stringify(options.body);
            }
        }

        const res = await fetch(url, { ...options, headers });

        // Handle 401 — token expired
        if (res.status === 401 && url !== '/api/auth/login') {
            this.clearToken();
            Router.navigate('login');
            return null;
        }

        return res;
    },

    async get(url) {
        return this.request(url);
    },

    async post(url, body) {
        return this.request(url, { method: 'POST', body });
    },

    async put(url, body) {
        return this.request(url, { method: 'PUT', body });
    },

    async del(url) {
        return this.request(url, { method: 'DELETE' });
    }
};

// ────────────────────── TOAST NOTIFICATIONS ──────────────────────

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ────────────────────── ROUTER ──────────────────────

const Router = {
    currentView: null,
    currentRoute: null,

    // Reserved internal route names that can't be usernames
    reservedRoutes: ['login', 'register', 'dashboard', 'upload', 'camera', 'settings', 'explore', 'api', 'uploads'],

    init() {
        window.addEventListener('popstate', () => this.handleRoute());
        this.handleRoute();
    },

    navigate(route) {
        // Build the URL path
        const path = this.routeToPath(route);
        window.history.pushState({}, '', path);
        this.handleRoute();
    },

    routeToPath(route) {
        // profile/username → /username (clean URL)
        if (route.startsWith('profile/')) {
            const username = route.slice('profile/'.length);
            return `/${username}`;
        }
        // Internal routes
        if (route === '' || route === 'dashboard') {
            return '/';
        }
        return `/${route}`;
    },

    pathToRoute() {
        const path = window.location.pathname;
        const segments = path.split('/').filter(Boolean);

        // Root path
        if (segments.length === 0) {
            return { route: '', params: [] };
        }

        const first = segments[0];

        // Check if it's a reserved/internal route
        if (this.reservedRoutes.includes(first)) {
            return { route: first, params: segments.slice(1) };
        }

        // Otherwise treat as a username profile
        return { route: 'profile', params: [first] };
    },

    handleRoute() {
        const { route, params } = this.pathToRoute();

        // Auth guard
        const publicRoutes = ['login', 'register', 'profile'];
        const isPublic = publicRoutes.includes(route) || route === '';

        if (!isPublic && !Api.isLoggedIn()) {
            this.navigate('login');
            return;
        }

        if ((route === 'login' || route === 'register') && Api.isLoggedIn()) {
            this.navigate('dashboard');
            return;
        }

        // Hide all views
        document.querySelectorAll('.view').forEach(v => {
            v.style.display = 'none';
            v.classList.remove('fade-in');
        });

        this.currentRoute = route;

        switch (route) {
            case 'login':
                this.showView('view-login');
                break;
            case 'register':
                this.showView('view-register');
                break;
            case 'dashboard':
                this.showView('view-dashboard');
                Dashboard.load();
                break;
            case 'upload':
                this.showView('view-upload');
                Upload.init();
                break;
            case 'camera':
                this.showView('view-camera');
                Camera.init();
                break;
            case 'profile':
                this.showView('view-profile');
                Profile.load(params[0]);
                break;
            case 'settings':
                this.showView('view-settings');
                Settings.load();
                break;
            case 'explore':
                this.showView('view-explore');
                Explore.load();
                break;
            default:
                // Root path
                if (Api.isLoggedIn()) {
                    this.showView('view-dashboard');
                    Dashboard.load();
                    this.currentRoute = 'dashboard';
                } else {
                    this.showView('view-login');
                    this.currentRoute = 'login';
                }
        }
    },

    showView(id) {
        const view = document.getElementById(id);
        if (view) {
            view.style.display = 'block';
            // Small delay for animation
            requestAnimationFrame(() => view.classList.add('fade-in'));
        }
    }
};

// ────────────────────── AUTH (LOGIN / REGISTER) ──────────────────────

const Auth = {
    init() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('login-username').value.trim();
                const password = document.getElementById('login-password').value;
                const errorEl = document.getElementById('login-error');
                const btn = document.getElementById('login-btn');

                errorEl.textContent = '';
                btn.disabled = true;
                btn.textContent = 'Entrando...';

                try {
                    const res = await Api.post('/api/auth/login', { username, password });
                    const data = await res.json();

                    if (res.ok && data.success) {
                        Api.setToken(data.token);
                        Api.setUser(data.user);
                        Router.navigate('dashboard');
                    } else {
                        errorEl.textContent = data.error || 'Error de acceso.';
                    }
                } catch (err) {
                    errorEl.textContent = 'Error de conexión con el servidor.';
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Iniciar Sesión';
                }
            });
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('register-username').value.trim();
                const password = document.getElementById('register-password').value;
                const password2 = document.getElementById('register-password2').value;
                const errorEl = document.getElementById('register-error');
                const btn = document.getElementById('register-btn');

                errorEl.textContent = '';

                if (password !== password2) {
                    errorEl.textContent = 'Las contraseñas no coinciden.';
                    return;
                }

                btn.disabled = true;
                btn.textContent = 'Creando cuenta...';

                try {
                    const res = await Api.post('/api/auth/register', { username, password });
                    const data = await res.json();

                    if (res.ok && data.success) {
                        Api.setToken(data.token);
                        Api.setUser(data.user);
                        showToast('¡Cuenta creada exitosamente!');
                        Router.navigate('dashboard');
                    } else {
                        errorEl.textContent = data.error || 'Error al crear la cuenta.';
                    }
                } catch (err) {
                    errorEl.textContent = 'Error de conexión con el servidor.';
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Crear Cuenta';
                }
            });
        }
    }
};

// ────────────────────── DASHBOARD ──────────────────────

const Dashboard = {
    photos: [],
    selectionMode: false,
    selectedIds: new Set(),

    async load() {
        // Update username
        const user = Api.getUser();
        if (user) {
            document.getElementById('dashboard-username').textContent = `@${user.username}`;
        }

        // Load profile info
        try {
            const res = await Api.get('/api/users/me');
            if (res && res.ok) {
                const data = await res.json();
                const u = data.user;

                Api.setUser({ id: u.id, username: u.username, foto_perfil: u.foto_perfil });

                document.getElementById('dashboard-username').textContent = `@${u.username}`;
                document.getElementById('dashboard-photo-count').textContent = u.total_fotos;
                document.getElementById('dashboard-riddle-status').textContent = u.acertijo_activo ? 'Activo' : 'Inactivo';

                const avatarEl = document.getElementById('dashboard-avatar');
                if (u.foto_perfil) {
                    avatarEl.innerHTML = `<img src="${u.foto_perfil}" alt="Avatar">`;
                }
            }
        } catch (err) {
            console.error('Error loading profile:', err);
        }

        // Load photos
        await this.loadPhotos();

        // Exit selection mode
        this.exitSelectionMode();
    },

    async loadPhotos() {
        const grid = document.getElementById('dashboard-gallery');
        grid.innerHTML = '<div class="spinner" style="grid-column:1/-1; margin:3rem auto;"></div>';

        try {
            const res = await Api.get('/api/photos/me');
            if (res && res.ok) {
                const data = await res.json();
                this.photos = data.fotos;
                this.renderGallery();
            }
        } catch (err) {
            grid.innerHTML = '<p class="gallery-empty">Error cargando fotos.</p>';
        }
    },

    renderGallery() {
        const grid = document.getElementById('dashboard-gallery');
        grid.innerHTML = '';

        if (this.photos.length === 0) {
            grid.innerHTML = `
                <div class="gallery-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <p>Tu galería está vacía</p>
                    <p style="font-size:0.8rem; margin-top:0.5rem;">Usa el menú para agregar tu primera foto</p>
                </div>
            `;
            return;
        }

        this.photos.forEach((foto, index) => {
            const item = document.createElement('div');
            item.className = 'gallery-item fade-in';
            item.style.animationDelay = `${index * 0.04}s`;

            if (this.selectionMode) {
                item.classList.add('selectable');
                if (this.selectedIds.has(foto.id)) {
                    item.classList.add('selected');
                }
            }

            const date = new Date(foto.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

            item.innerHTML = `
                <div class="select-check"></div>
                <img src="${foto.ruta}" alt="${foto.descripcion || 'Foto'}" loading="lazy">
                ${foto.descripcion ? `<div class="item-overlay"><span class="item-desc">${foto.descripcion}</span></div>` : ''}
            `;

            item.addEventListener('click', () => {
                if (this.selectionMode) {
                    this.toggleSelection(foto.id, item);
                } else {
                    Lightbox.open(foto.ruta, foto.descripcion, foto.fecha);
                }
            });

            grid.appendChild(item);
        });
    },

    toggleSelection(id, itemEl) {
        if (this.selectedIds.has(id)) {
            this.selectedIds.delete(id);
            itemEl.classList.remove('selected');
        } else {
            this.selectedIds.add(id);
            itemEl.classList.add('selected');
        }
        this.updateSelectionUI();
    },

    enterSelectionMode() {
        this.selectionMode = true;
        this.selectedIds.clear();
        document.getElementById('selection-toolbar').style.display = 'flex';
        document.getElementById('bottom-nav').style.display = 'none';
        this.renderGallery();
        this.updateSelectionUI();
    },

    exitSelectionMode() {
        this.selectionMode = false;
        this.selectedIds.clear();
        document.getElementById('selection-toolbar').style.display = 'none';
        document.getElementById('bottom-nav').style.display = 'flex';
        if (Router.currentRoute === 'dashboard') {
            this.renderGallery();
        }
    },

    updateSelectionUI() {
        const count = this.selectedIds.size;
        document.getElementById('selection-count').textContent = `${count} seleccionada${count !== 1 ? 's' : ''}`;
        document.getElementById('btn-delete-selected').disabled = count === 0;
    },

    async deleteSelected() {
        if (this.selectedIds.size === 0) return;

        const count = this.selectedIds.size;
        if (!confirm(`¿Eliminar ${count} foto${count !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            const res = await Api.post('/api/photos/delete-batch', { ids: Array.from(this.selectedIds) });
            if (res && res.ok) {
                const data = await res.json();
                showToast(data.message);
                this.exitSelectionMode();
                await this.loadPhotos();

                // Update count
                const countEl = document.getElementById('dashboard-photo-count');
                countEl.textContent = this.photos.length;
            } else {
                showToast('Error eliminando fotos.', 'error');
            }
        } catch (err) {
            showToast('Error de conexión.', 'error');
        }
    }
};

// ────────────────────── MENU ──────────────────────

const Menu = {
    init() {
        const overlay = document.getElementById('menu-overlay');
        const panel = document.getElementById('menu-panel');

        document.getElementById('btn-menu').addEventListener('click', () => this.open());
        document.getElementById('menu-close').addEventListener('click', () => this.close());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });

        document.getElementById('menu-add-image').addEventListener('click', () => {
            this.close();
            Router.navigate('upload');
        });

        document.getElementById('menu-select-mode').addEventListener('click', () => {
            this.close();
            Dashboard.enterSelectionMode();
        });

        document.getElementById('menu-riddle-config').addEventListener('click', () => {
            this.close();
            Router.navigate('settings');
        });
    },

    open() {
        document.getElementById('menu-overlay').style.display = 'block';
    },

    close() {
        document.getElementById('menu-overlay').style.display = 'none';
    }
};

// ────────────────────── UPLOAD ──────────────────────

const Upload = {
    init() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const preview = document.getElementById('imagePreview');
        const form = document.getElementById('uploadForm');
        const errorEl = document.getElementById('upload-error');
        const btn = document.getElementById('uploadBtn');

        // Reset
        fileInput.value = '';
        preview.style.display = 'none';
        preview.src = '';
        dropZone.style.display = 'flex';
        document.getElementById('descInput').value = '';
        errorEl.textContent = '';

        // Remove old listeners by cloning
        const newDropZone = dropZone.cloneNode(true);
        dropZone.parentNode.replaceChild(newDropZone, dropZone);

        const newFileInput = newDropZone.querySelector('.hidden-input');

        newDropZone.addEventListener('click', () => newFileInput.click());

        newDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            newDropZone.classList.add('dragover');
        });

        newDropZone.addEventListener('dragleave', () => {
            newDropZone.classList.remove('dragover');
        });

        newDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            newDropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                newFileInput.files = e.dataTransfer.files;
                showPreview(newFileInput.files[0]);
            }
        });

        newFileInput.addEventListener('change', () => {
            if (newFileInput.files[0]) {
                showPreview(newFileInput.files[0]);
            }
        });

        function showPreview(file) {
            const url = URL.createObjectURL(file);
            preview.src = url;
            preview.style.display = 'block';
            newDropZone.style.display = 'none';
        }

        // Clone form to remove old listeners
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        // Re-get elements after clone
        const finalFileInput = document.getElementById('fileInput');
        const finalPreview = document.getElementById('imagePreview');
        const finalDropZone = document.getElementById('dropZone');
        const finalDescInput = document.getElementById('descInput');
        const finalErrorEl = document.getElementById('upload-error');
        const finalBtn = document.getElementById('uploadBtn');
        const finalForm = document.getElementById('uploadForm');

        // Re-attach drop zone events after form clone
        finalDropZone.addEventListener('click', () => finalFileInput.click());
        finalDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            finalDropZone.classList.add('dragover');
        });
        finalDropZone.addEventListener('dragleave', () => finalDropZone.classList.remove('dragover'));
        finalDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            finalDropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                finalFileInput.files = e.dataTransfer.files;
                const url = URL.createObjectURL(finalFileInput.files[0]);
                finalPreview.src = url;
                finalPreview.style.display = 'block';
                finalDropZone.style.display = 'none';
            }
        });
        finalFileInput.addEventListener('change', () => {
            if (finalFileInput.files[0]) {
                const url = URL.createObjectURL(finalFileInput.files[0]);
                finalPreview.src = url;
                finalPreview.style.display = 'block';
                finalDropZone.style.display = 'none';
            }
        });

        finalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const file = finalFileInput.files[0];
            if (!file) {
                finalErrorEl.textContent = 'Selecciona una imagen primero.';
                return;
            }

            const formData = new FormData();
            formData.append('imagen', file);
            formData.append('descripcion', finalDescInput.value);

            finalBtn.disabled = true;
            finalBtn.innerHTML = '<div class="spinner"></div>';
            finalErrorEl.textContent = '';

            try {
                const res = await Api.post('/api/photos/upload', formData);
                if (res && res.ok) {
                    showToast('Foto subida correctamente');
                    Router.navigate('dashboard');
                } else {
                    const data = await res.json();
                    finalErrorEl.textContent = data.error || 'Error subiendo la imagen.';
                }
            } catch (err) {
                finalErrorEl.textContent = 'Error de conexión.';
            } finally {
                finalBtn.disabled = false;
                finalBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Subir Foto`;
            }
        });
    }
};

// ────────────────────── CAMERA ──────────────────────

const Camera = {
    stream: null,
    facingMode: 'environment',
    capturedBlob: null,

    async init() {
        const video = document.getElementById('cameraStream');
        const canvas = document.getElementById('cameraCanvas');
        const preview = document.getElementById('cameraPreview');
        const captureBtn = document.getElementById('camera-capture');
        const flipBtn = document.getElementById('camera-flip');
        const retakeBtn = document.getElementById('camera-retake');
        const saveBar = document.getElementById('camera-save-bar');
        const saveBtn = document.getElementById('camera-save');
        const descInput = document.getElementById('camera-desc');

        // Reset state
        preview.style.display = 'none';
        video.style.display = 'block';
        saveBar.style.display = 'none';
        retakeBtn.style.visibility = 'hidden';
        captureBtn.style.display = 'flex';
        flipBtn.style.visibility = 'visible';
        descInput.value = '';
        this.capturedBlob = null;

        await this.startCamera(video);

        // Clone buttons to remove old listeners
        const newCaptureBtn = captureBtn.cloneNode(true);
        captureBtn.parentNode.replaceChild(newCaptureBtn, captureBtn);

        const newFlipBtn = flipBtn.cloneNode(true);
        flipBtn.parentNode.replaceChild(newFlipBtn, flipBtn);

        const newRetakeBtn = retakeBtn.cloneNode(true);
        retakeBtn.parentNode.replaceChild(newRetakeBtn, retakeBtn);

        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

        document.getElementById('camera-capture').addEventListener('click', () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');

            // Mirror the image if using front camera
            if (this.facingMode === 'user') {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(video, 0, 0);
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            canvas.toBlob((blob) => {
                this.capturedBlob = blob;
                preview.src = URL.createObjectURL(blob);
                preview.style.display = 'block';
                video.style.display = 'none';
                document.getElementById('camera-save-bar').style.display = 'flex';
                document.getElementById('camera-retake').style.visibility = 'visible';
                document.getElementById('camera-capture').style.display = 'none';
                document.getElementById('camera-flip').style.visibility = 'hidden';
            }, 'image/jpeg', 0.9);
        });

        document.getElementById('camera-flip').addEventListener('click', async () => {
            this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
            await this.startCamera(document.getElementById('cameraStream'));
        });

        document.getElementById('camera-retake').addEventListener('click', () => {
            preview.style.display = 'none';
            document.getElementById('cameraStream').style.display = 'block';
            document.getElementById('camera-save-bar').style.display = 'none';
            document.getElementById('camera-retake').style.visibility = 'hidden';
            document.getElementById('camera-capture').style.display = 'flex';
            document.getElementById('camera-flip').style.visibility = 'visible';
            this.capturedBlob = null;
        });

        document.getElementById('camera-save').addEventListener('click', async () => {
            if (!this.capturedBlob) return;

            const formData = new FormData();
            formData.append('imagen', this.capturedBlob, 'camera-capture.jpg');
            formData.append('descripcion', document.getElementById('camera-desc').value);

            const btn = document.getElementById('camera-save');
            btn.disabled = true;
            btn.textContent = 'Guardando...';

            try {
                const res = await Api.post('/api/photos/upload', formData);
                if (res && res.ok) {
                    showToast('Foto guardada correctamente');
                    this.stopCamera();
                    Router.navigate('dashboard');
                } else {
                    showToast('Error guardando la foto.', 'error');
                }
            } catch (err) {
                showToast('Error de conexion.', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Guardar';
            }
        });
    },

    async startCamera(video) {
        this.stopCamera();
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            video.srcObject = this.stream;

            // Mirror front camera video display
            if (this.facingMode === 'user') {
                video.style.transform = 'scaleX(-1)';
            } else {
                video.style.transform = 'scaleX(1)';
            }
        } catch (err) {
            console.error('Camera error:', err);
            // If the requested facing mode fails, try the other one
            if (this.facingMode === 'environment') {
                this.facingMode = 'user';
                try {
                    this.stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } }
                    });
                    video.srcObject = this.stream;
                    video.style.transform = 'scaleX(-1)';
                } catch (err2) {
                    showToast('No se pudo acceder a la camara. Verifica los permisos.', 'error');
                }
            } else {
                showToast('No se pudo acceder a la camara. Verifica los permisos.', 'error');
            }
        }
    },

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
    }
};

// ────────────────────── PROFILE (Public) ──────────────────────

const Profile = {
    currentUsername: null,
    riddleToken: null,

    async load(username) {
        if (!username) {
            Router.navigate('explore');
            return;
        }

        this.currentUsername = username;
        this.riddleToken = null;

        document.getElementById('profile-header-name').textContent = `@${username}`;
        document.getElementById('profile-username').textContent = `@${username}`;
        document.getElementById('profile-gallery').innerHTML = '';
        document.getElementById('riddle-challenge').style.display = 'none';
        document.getElementById('profile-gallery-container').style.display = 'block';
        document.getElementById('riddle-answer').value = '';
        document.getElementById('riddle-error').textContent = '';

        try {
            const res = await Api.get(`/api/users/${username}`);
            if (!res || !res.ok) {
                showToast('Usuario no encontrado.', 'error');
                Router.navigate('explore');
                return;
            }

            const data = await res.json();
            const user = data.user;

            document.getElementById('profile-meta').textContent = `${user.total_fotos} foto${user.total_fotos !== 1 ? 's' : ''}`;

            const avatarEl = document.getElementById('profile-avatar');
            if (user.foto_perfil) {
                avatarEl.innerHTML = `<img src="${user.foto_perfil}" alt="${user.username}">`;
            } else {
                avatarEl.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
            }

            // Check if this is the logged-in user
            const currentUser = Api.getUser();
            const isOwner = currentUser && currentUser.username === username.toLowerCase();

            if (user.acertijo_activo && !isOwner) {
                document.getElementById('riddle-challenge').style.display = 'block';
                document.getElementById('riddle-question').textContent = user.pregunta;
                document.getElementById('profile-gallery-container').style.display = 'none';
            } else {
                await this.loadPhotos(username);
            }
        } catch (err) {
            showToast('Error cargando perfil.', 'error');
        }
    },

    async loadPhotos(username, riddleToken) {
        const grid = document.getElementById('profile-gallery');
        grid.innerHTML = '<div class="spinner" style="grid-column:1/-1; margin:3rem auto;"></div>';

        try {
            let url = `/api/photos/user/${username}`;
            if (riddleToken) {
                url += `?riddle_token=${encodeURIComponent(riddleToken)}`;
            }

            const res = await Api.get(url);
            if (res && res.ok) {
                const data = await res.json();
                grid.innerHTML = '';

                if (data.fotos.length === 0) {
                    grid.innerHTML = `<div class="gallery-empty"><p>Este usuario aún no tiene fotos</p></div>`;
                    return;
                }

                data.fotos.forEach((foto, index) => {
                    const item = document.createElement('div');
                    item.className = 'gallery-item fade-in';
                    item.style.animationDelay = `${index * 0.04}s`;
                    item.innerHTML = `
                        <img src="${foto.ruta}" alt="${foto.descripcion || 'Foto'}" loading="lazy">
                        ${foto.descripcion ? `<div class="item-overlay"><span class="item-desc">${foto.descripcion}</span></div>` : ''}
                    `;
                    item.addEventListener('click', () => {
                        Lightbox.open(foto.ruta, foto.descripcion, foto.fecha);
                    });
                    grid.appendChild(item);
                });
            } else if (res && res.status === 403) {
                grid.innerHTML = '';
                document.getElementById('riddle-challenge').style.display = 'block';
                document.getElementById('profile-gallery-container').style.display = 'none';
            }
        } catch (err) {
            grid.innerHTML = '<div class="gallery-empty"><p>Error cargando fotos</p></div>';
        }
    },

    initRiddleForm() {
        const form = document.getElementById('riddleForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const answer = document.getElementById('riddle-answer').value.trim();
            const errorEl = document.getElementById('riddle-error');
            errorEl.textContent = '';

            if (!answer) return;

            try {
                const res = await Api.post(`/api/users/${this.currentUsername}/riddle`, { respuesta: answer });
                const data = await res.json();

                if (res.ok && data.success) {
                    this.riddleToken = data.riddle_token;
                    document.getElementById('riddle-challenge').style.display = 'none';
                    document.getElementById('profile-gallery-container').style.display = 'block';
                    showToast('¡Acertijo resuelto!');
                    await this.loadPhotos(this.currentUsername, this.riddleToken);
                } else {
                    errorEl.textContent = data.error || 'Respuesta incorrecta.';
                    document.getElementById('riddle-answer').value = '';
                }
            } catch (err) {
                errorEl.textContent = 'Error de conexión.';
            }
        });
    }
};

// ────────────────────── SETTINGS ──────────────────────

const Settings = {
    async load() {
        try {
            const res = await Api.get('/api/users/me');
            if (!res || !res.ok) return;

            const data = await res.json();
            const user = data.user;

            // Avatar
            const avatarEl = document.getElementById('settings-avatar');
            if (user.foto_perfil) {
                avatarEl.innerHTML = `<img src="${user.foto_perfil}" alt="Avatar">`;
            }

            // Riddle toggle
            const toggle = document.getElementById('riddle-toggle');
            toggle.checked = user.acertijo_activo;
            document.getElementById('riddle-fields').style.display = user.acertijo_activo ? 'block' : 'none';

            if (user.pregunta) {
                document.getElementById('riddle-pregunta').value = user.pregunta;
            }

            // Public link
            const link = `${window.location.origin}/${user.username}`;
            document.getElementById('public-link').value = link;

        } catch (err) {
            console.error('Error loading settings:', err);
        }
    },

    init() {
        // Toggle riddle fields
        document.getElementById('riddle-toggle').addEventListener('change', (e) => {
            document.getElementById('riddle-fields').style.display = e.target.checked ? 'block' : 'none';
        });

        // Save riddle config
        document.getElementById('riddleConfigForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const acertijo_activo = document.getElementById('riddle-toggle').checked;
            const pregunta = document.getElementById('riddle-pregunta').value.trim();
            const respuesta = document.getElementById('riddle-respuesta').value.trim();
            const errorEl = document.getElementById('riddle-config-error');
            errorEl.textContent = '';

            if (acertijo_activo && (!pregunta || !respuesta)) {
                errorEl.textContent = 'Debes proporcionar pregunta y respuesta.';
                return;
            }

            try {
                const res = await Api.put('/api/users/me/riddle', { acertijo_activo, pregunta, respuesta });
                if (res && res.ok) {
                    showToast('Acertijo actualizado correctamente');
                } else {
                    const data = await res.json();
                    errorEl.textContent = data.error || 'Error actualizando acertijo.';
                }
            } catch (err) {
                errorEl.textContent = 'Error de conexión.';
            }
        });

        // Change avatar
        document.getElementById('btn-change-avatar').addEventListener('click', () => {
            document.getElementById('avatarInput').click();
        });

        document.getElementById('avatarInput').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('avatar', file);

            try {
                const res = await Api.put('/api/users/me/avatar', formData);
                if (res && res.ok) {
                    const data = await res.json();
                    document.getElementById('settings-avatar').innerHTML = `<img src="${data.foto_perfil}" alt="Avatar">`;
                    showToast('Foto de perfil actualizada');

                    // Update stored user
                    const user = Api.getUser();
                    user.foto_perfil = data.foto_perfil;
                    Api.setUser(user);
                } else {
                    showToast('Error actualizando foto de perfil.', 'error');
                }
            } catch (err) {
                showToast('Error de conexión.', 'error');
            }
        });

        // Copy link
        document.getElementById('btn-copy-link').addEventListener('click', () => {
            const input = document.getElementById('public-link');
            navigator.clipboard.writeText(input.value).then(() => {
                showToast('Enlace copiado al portapapeles');
            }).catch(() => {
                input.select();
                document.execCommand('copy');
                showToast('Enlace copiado');
            });
        });
    }
};

// ────────────────────── EXPLORE ──────────────────────

const Explore = {
    async load() {
        const list = document.getElementById('user-list');
        list.innerHTML = '<div class="spinner" style="margin:3rem auto;"></div>';

        try {
            const res = await Api.get('/api/users');
            if (res && res.ok) {
                const data = await res.json();
                list.innerHTML = '';

                if (data.users.length === 0) {
                    list.innerHTML = '<div class="explore-empty"><p>No hay usuarios registrados aún</p></div>';
                    return;
                }

                data.users.forEach(user => {
                    const card = document.createElement('div');
                    card.className = 'user-card';
                    card.innerHTML = `
                        <div class="user-card-avatar">
                            ${user.foto_perfil
                                ? `<img src="${user.foto_perfil}" alt="${user.username}">`
                                : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
                            }
                        </div>
                        <div class="user-card-info">
                            <div class="user-card-name">@${user.username}</div>
                            <div class="user-card-meta">
                                <span>${user.total_fotos} foto${user.total_fotos != 1 ? 's' : ''}</span>
                                ${user.acertijo_activo ? '<span class="user-card-badge">Acertijo</span>' : ''}
                            </div>
                        </div>
                        <div class="user-card-arrow">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 18 6-6-6-6"></path></svg>
                        </div>
                    `;
                    card.addEventListener('click', () => {
                        Router.navigate(`profile/${user.username}`);
                    });
                    list.appendChild(card);
                });
            }
        } catch (err) {
            list.innerHTML = '<div class="explore-empty"><p>Error cargando usuarios</p></div>';
        }
    }
};

// ────────────────────── LIGHTBOX ──────────────────────

const Lightbox = {
    init() {
        document.getElementById('lightbox-close').addEventListener('click', () => this.close());
        document.getElementById('lightbox').addEventListener('click', (e) => {
            if (e.target.id === 'lightbox') this.close();
        });

        // ESC to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });
    },

    open(src, desc, fecha) {
        const lightbox = document.getElementById('lightbox');
        document.getElementById('lightbox-img').src = src;
        document.getElementById('lightbox-desc').textContent = desc || '';
        document.getElementById('lightbox-date').textContent = fecha
            ? new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
            : '';
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    },

    close() {
        document.getElementById('lightbox').style.display = 'none';
        document.body.style.overflow = '';
    }
};

// ────────────────────── NAVIGATION BINDINGS ──────────────────────

function initNavigation() {
    // Back buttons
    document.getElementById('upload-back').addEventListener('click', () => Router.navigate('dashboard'));
    document.getElementById('camera-back').addEventListener('click', () => {
        Camera.stopCamera();
        Router.navigate('dashboard');
    });
    document.getElementById('profile-back').addEventListener('click', () => {
        if (Api.isLoggedIn()) {
            Router.navigate('explore');
        } else {
            Router.navigate('login');
        }
    });
    document.getElementById('settings-back').addEventListener('click', () => Router.navigate('dashboard'));
    document.getElementById('explore-back').addEventListener('click', () => Router.navigate('dashboard'));

    // Bottom nav
    document.getElementById('btn-camera').addEventListener('click', () => Router.navigate('camera'));
    document.getElementById('btn-logout').addEventListener('click', () => {
        Api.clearToken();
        Camera.stopCamera();
        showToast('Sesión cerrada');
        Router.navigate('login');
    });

    // Selection toolbar
    document.getElementById('btn-delete-selected').addEventListener('click', () => Dashboard.deleteSelected());
    document.getElementById('btn-cancel-selection').addEventListener('click', () => Dashboard.exitSelectionMode());

    // Stop camera when navigating away
    window.addEventListener('hashchange', () => {
        if (Router.currentRoute !== 'camera') {
            Camera.stopCamera();
        }
    });
}

// ────────────────────── INIT ──────────────────────

document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
    Menu.init();
    Settings.init();
    Profile.initRiddleForm();
    Lightbox.init();
    initNavigation();
    Router.init();
});
