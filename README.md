# 🖼️ Galería Social — Acertijos para Desbloquear

Una plataforma social minimalista donde cada usuario tiene su propia galería de imágenes, protegida opcionalmente por un acertijo que otros deben resolver para ver sus fotos.

## ✨ Características

- **Autenticación de usuarios** — Registro e inicio de sesión con JWT
- **Galería personal** — Cada usuario tiene su propia galería de imágenes
- **Sistema de acertijos** — Protege tu galería con un acertijo personalizado
- **Captura de cámara** — Toma fotos directamente desde la aplicación
- **Perfiles públicos** — Visita las galerías de otros usuarios
- **Eliminación múltiple** — Selecciona y elimina varias fotos a la vez
- **Diseño VSCO** — Interfaz minimalista, oscura y elegante
- **Responsive** — Funciona en móviles y escritorio

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
|---|---|
| Backend | Node.js + Express |
| Base de datos | PostgreSQL |
| Autenticación | JWT (jsonwebtoken + bcryptjs) |
| Subida de archivos | Multer |
| Frontend | HTML + CSS + JavaScript (SPA) |
| Deploy | Docker + Docker Compose |

---

## 🚀 Inicio Rápido con Docker

### Requisitos
- Docker y Docker Compose instalados

### Pasos

1. Clona el repositorio:
```bash
git clone <tu-repositorio>
cd app-perfil
```

2. Levanta los contenedores:
```bash
docker-compose up -d --build
```

3. Inicializa la base de datos (solo la primera vez):
```bash
docker exec -it galeria-social-web node scripts/initDb.js
```

4. Abre tu navegador en `http://localhost:3000`

### Detener
```bash
docker-compose down
```

---

## 💻 Ejecución Local (sin Docker)

### Requisitos
- Node.js 18+
- PostgreSQL 15+

### 1. Configurar PostgreSQL
```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE galeria_db;
CREATE USER galeria_user WITH ENCRYPTED PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE galeria_db TO galeria_user;
\c galeria_db
ALTER SCHEMA public OWNER TO galeria_user;
\q
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
# Edita .env con tus credenciales
```

### 3. Instalar dependencias
```bash
npm install
```

### 4. Inicializar base de datos
```bash
npm run init-db
```

### 5. Iniciar la aplicación
```bash
npm start
```

Visita `http://localhost:3000`

---

## 📦 API Endpoints

### Autenticación
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Registro de usuario |
| POST | `/api/auth/login` | Inicio de sesión |

### Usuarios
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/users/me` | Perfil propio (auth) |
| PUT | `/api/users/me/avatar` | Cambiar foto de perfil (auth) |
| PUT | `/api/users/me/riddle` | Configurar acertijo (auth) |
| GET | `/api/users` | Listar usuarios |
| GET | `/api/users/:username` | Perfil público |
| POST | `/api/users/:username/riddle` | Verificar acertijo |

### Fotos
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/photos/me` | Mis fotos (auth) |
| POST | `/api/photos/upload` | Subir foto (auth) |
| DELETE | `/api/photos/:id` | Eliminar foto (auth) |
| POST | `/api/photos/delete-batch` | Eliminar múltiples (auth) |
| PUT | `/api/photos/:id` | Editar descripción (auth) |
| GET | `/api/photos/user/:username` | Fotos de un usuario |

---

## 🗄️ Modelo de Datos

### Usuarios
| Campo | Tipo | Descripción |
|---|---|---|
| id | SERIAL | Clave primaria |
| username | VARCHAR(50) | Nombre único |
| password | VARCHAR(255) | Hash bcrypt |
| foto_perfil | TEXT | Ruta al avatar |
| acertijo_activo | BOOLEAN | ¿Acertijo habilitado? |
| pregunta | TEXT | Pregunta del acertijo |
| respuesta | TEXT | Respuesta (lowercase) |
| created_at | TIMESTAMP | Fecha de registro |

### Fotos
| Campo | Tipo | Descripción |
|---|---|---|
| id | SERIAL | Clave primaria |
| user_id | INTEGER | FK → usuarios.id |
| ruta | TEXT | Ruta del archivo |
| descripcion | TEXT | Descripción opcional |
| fecha | TIMESTAMP | Fecha de publicación |

---

## 🎨 Flujo de Uso

1. **Regístrate** — Crea tu cuenta con usuario y contraseña
2. **Sube fotos** — Desde el menú o directamente con la cámara
3. **Configura tu acertijo** — Ve a Configuración y activa el acertijo
4. **Comparte tu perfil** — Copia el enlace desde Configuración
5. **Explora** — Visita los perfiles de otros usuarios y resuelve sus acertijos

---

## 🌐 Despliegue en Producción (Ubuntu)

### 1. Instalar dependencias del sistema
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs postgresql postgresql-contrib nginx
sudo npm install -g pm2
```

### 2. Configurar PostgreSQL
```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE galeria_db;
CREATE USER galeria_user WITH ENCRYPTED PASSWORD 'password_segura';
GRANT ALL PRIVILEGES ON DATABASE galeria_db TO galeria_user;
\c galeria_db
ALTER SCHEMA public OWNER TO galeria_user;
\q
```

### 3. Configurar la aplicación
```bash
cd /var/www/galeria-social
npm install
cp .env.example .env
nano .env  # Configurar credenciales y JWT_SECRET
npm run init-db
```

### 4. Iniciar con PM2
```bash
pm2 start app.js --name "galeria-social"
pm2 save
pm2 startup
```

### 5. Configurar Nginx
```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    client_max_body_size 5M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6. SSL con Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```
