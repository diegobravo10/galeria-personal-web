# Galería Personal estilo VSCO

Una aplicación web minimalista, rápida y segura diseñada para funcionar como tu galería personal privada en un servidor Ubuntu.

## Requisitos Previos (Ubuntu Server)

Antes de empezar, asegúrate de tener tu servidor Ubuntu actualizado:
```bash
sudo apt update && sudo apt upgrade -y
```

### 1. Instalar Dependencias del Sistema
Instalaremos Node.js, PostgreSQL y Nginx.
```bash
# Node.js (usando NodeSource para v18.x)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Nginx
sudo apt install -y nginx

# PM2 (Gestor de procesos de Node.js)
sudo npm install -g pm2
```

---

### 2. Configurar PostgreSQL
Crea el usuario y la base de datos para la aplicación:
```bash
sudo -u postgres psql
```

Dentro de psql, ejecuta:
```sql
CREATE DATABASE galeria_db;
CREATE USER mi_usuario WITH ENCRYPTED PASSWORD 'mi_password';
GRANT ALL PRIVILEGES ON DATABASE galeria_db TO mi_usuario;
\c galeria_db
ALTER SCHEMA public OWNER TO mi_usuario;
\q
```

---

### 3. Configurar la Aplicación
Clona o sube los archivos de este proyecto a tu servidor, por ejemplo en `/var/www/app-perfil`.

```bash
# Ir al directorio del proyecto
cd /var/www/app-perfil

# Instalar dependencias de Node
npm install
```

**Configurar Variables de Entorno**
Crea el archivo `.env` basado en `.env.example`:
```bash
cp .env.example .env
nano .env
```
Asegúrate de cambiar las contraseñas, definir el secreto de la sesión y establecer tu acertijo (`RIDDLE_ANSWER`).

---

### 4. Inicializar la Base de Datos
Ejecuta el script para crear las tablas automáticamente:
```bash
node scripts/initDb.js
```

---

### 5. Ejecutar la app con PM2
Inicia el servidor en segundo plano:
```bash
pm2 start app.js --name "galeria-vsco"
pm2 save
pm2 startup
```
*(Sigue las instrucciones que PM2 te muestre en pantalla después de `pm2 startup` para asegurar que inicie con el sistema).*

---

### 6. Configurar Nginx como Reverse Proxy
Crea un archivo de configuración para tu dominio en Nginx:

```bash
sudo nano /etc/nginx/sites-available/galeria
```

Pega el siguiente contenido (reemplaza `tu-dominio.com`):
```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Aumentar límite de subida para Nginx (5MB)
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

Habilita el sitio y reinicia Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/galeria /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Configurar Dominio y SSL (Opcional pero recomendado)
Apunta el registro A de tu dominio a la IP de tu servidor. Luego, instala los certificados de seguridad usando Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

---

## Uso de la Galería
1. Entra a tu dominio (o `localhost:3000` si estás probando en local).
2. Responde el acertijo correctamente (el valor de `RIDDLE_ANSWER` en tu `.env` o por defecto "vsco").
3. Entra a `/subiryo` o utiliza el enlace en la navegación para añadir nuevas fotos.

---

## Ejecutar Localmente con Docker

Si deseas probar la aplicación rápidamente en tu entorno local sin instalar Node.js ni PostgreSQL, puedes usar Docker y Docker Compose:

1. Asegúrate de tener **Docker** y **Docker Compose** instalados en tu sistema.
2. Navega a la carpeta del proyecto y ejecuta el siguiente comando para levantar la base de datos y la aplicación:
   ```bash
   docker-compose up -d --build
   ```
3. Inicializa la base de datos (solo la primera vez) ejecutando el script dentro del contenedor de la aplicación:
   ```bash
   docker exec -it app-perfil-web node scripts/initDb.js
   ```
4. Abre tu navegador y visita `http://localhost:3000`.

Para detener los contenedores, ejecuta:
```bash
docker-compose down
```
