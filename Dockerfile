FROM node:20-alpine

# Crear el directorio de la aplicación
WORKDIR /usr/src/app

# Crear directorios para uploads
RUN mkdir -p uploads/avatars

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el código fuente
COPY . .

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "app.js"]
