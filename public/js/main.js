// Login logic
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const answer = document.getElementById('answer').value;
        const errorMsg = document.getElementById('loginError');
        errorMsg.textContent = '';
        
        try {
            const res = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answer })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                window.location.href = data.redirect;
            } else {
                errorMsg.textContent = data.error || 'Error de acceso.';
            }
        } catch (err) {
            errorMsg.textContent = 'Error de conexión con el servidor.';
        }
    });
}

// Gallery load logic
async function loadPhotos() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
    
    try {
        const res = await fetch('/fotos');
        const data = await res.json();
        
        if (res.ok && data.success) {
            grid.innerHTML = '';
            if (data.fotos.length === 0) {
                grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; opacity:0.6;">Aún no hay fotos en la galería.</p>';
            }
            
            data.fotos.forEach(foto => {
                const date = new Date(foto.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
                
                const item = document.createElement('div');
                item.className = 'gallery-item';
                
                // Allow delete (only renders X button statically, secure because backend also checks auth)
                item.innerHTML = `
                    <button class="delete-btn" onclick="deletePhoto(${foto.id}, event)">X</button>
                    <img src="${foto.ruta}" alt="${foto.nombre}" class="gallery-img" onclick="openModal('${foto.ruta}')">
                    <div class="img-overlay">
                        ${foto.descripcion ? `<p class="img-desc">${foto.descripcion}</p>` : ''}
                        <p class="img-date">${date}</p>
                    </div>
                `;
                grid.appendChild(item);
            });
        }
    } catch (err) {
        console.error('Error fetching photos', err);
    }
}

async function deletePhoto(id, event) {
    event.stopPropagation();
    if (confirm('¿Seguro que deseas eliminar esta foto?')) {
        try {
            const res = await fetch(`/foto/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadPhotos(); // reload grid
            } else {
                alert('No se pudo eliminar la foto.');
            }
        } catch(err) {
            alert('Error eliminando foto.');
        }
    }
}

// Modal logic
const modal = document.getElementById('imageModal');
const modalImg = document.getElementById('modalImg');
const closeModalBtn = document.getElementById('closeModal');

function openModal(src) {
    if (modal && modalImg) {
        modalImg.src = src;
        modal.classList.add('active');
    }
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });
}
if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
}

// Upload logic
function initUploadForm() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const imagePreview = document.getElementById('imagePreview');
    const uploadForm = document.getElementById('uploadForm');
    const uploadBtn = document.getElementById('uploadBtn');
    const errorMsg = document.getElementById('uploadError');

    if (!dropZone || !fileInput || !uploadForm) return;

    // Trigger click on drop zone
    dropZone.addEventListener('click', () => fileInput.click());

    // Drag and Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            showPreview();
        }
    });

    fileInput.addEventListener('change', showPreview);

    function showPreview() {
        const file = fileInput.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            imagePreview.src = url;
            imagePreview.style.display = 'block';
            dropZone.querySelector('p').style.display = 'none';
        }
    }

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = fileInput.files[0];
        if (!file) {
            errorMsg.textContent = 'Selecciona una imagen primero.';
            return;
        }

        const formData = new FormData();
        formData.append('imagen', file);
        formData.append('descripcion', document.getElementById('descInput').value);

        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Subiendo...';
        errorMsg.textContent = '';

        try {
            const res = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok && data.success) {
                window.location.href = '/galeria';
            } else {
                errorMsg.textContent = data.error || 'Error subiendo la imagen.';
            }
        } catch (err) {
            errorMsg.textContent = 'Error de conexión.';
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Subir Foto';
        }
    });
}
