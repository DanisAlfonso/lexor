# Lexor

Aplicación de aprendizaje de idiomas con soporte para documentos Markdown, EPUB y PDF. Incluye un sistema avanzado de flashcards basado en el algoritmo FSRS para repetición espaciada.

## Estructura del Proyecto

Este es un monorepo que contiene tres componentes principales:

- **`lexor-desktop/`** - Aplicación de escritorio (Electron + React + TypeScript)
- **`lexor-expo-app/`** - Aplicación móvil (React Native + Expo)
- **`lexor-backend/`** - API backend (Fastify + PostgreSQL + Redis)

## Características

### Desktop

- **Editor Markdown** con CodeMirror (sintaxis, vim mode)
- **Lector de documentos** (EPUB, Markdown, PDF)
- **Sistema de flashcards** integrado con sintaxis especial
- **Algoritmo FSRS** para repetición espaciada
- **Temas claro/oscuro** personalizables
- **Estadísticas de progreso** y sesiones de lectura
- **Búsqueda y anotaciones** (marcadores, resaltados, notas)
- **Gestión de biblioteca** con sincronización automática

### Mobile

- **Lector de documentos** optimizado para móvil
- **Estudio de flashcards** con interfaz táctil
- **Sincronización offline** con la nube
- **Sistema de temas** consistente con desktop

### Backend

- **Autenticación JWT** con bcrypt
- **API REST** con Fastify
- **Base de datos PostgreSQL** con Drizzle ORM
- **Almacenamiento de archivos** (S3/MinIO)
- **Integración AI** (OpenAI) para generar flashcards y traducciones
- **Sincronización** multi-dispositivo
- **Análisis de progreso** y estadísticas

## Stack Tecnológico

### Desktop
- Electron 33 + Vite 6
- React 18 + TypeScript 5.7
- CodeMirror 6 (editor)
- SQLite (better-sqlite3)
- Tailwind CSS 3
- Zustand (state management)
- FSRS (algoritmo de repetición)

### Mobile
- Expo SDK 53
- React Native 0.79
- SQLite (expo-sqlite)
- NativeWind (Tailwind para RN)
- Zustand

### Backend
- Fastify 5 + TypeScript
- PostgreSQL + Drizzle ORM
- Redis (sesiones/caché)
- JWT + bcrypt
- OpenAI API
- Docker + Docker Compose

## Instalación

### Requisitos
- Node.js 18+
- npm o yarn
- PostgreSQL 14+ (para backend)
- Redis (para backend)

### Desktop
```bash
cd lexor-desktop
npm install
npm run dev
```

### Mobile
```bash
cd lexor-expo-app
npm install
npx expo start
```

### Backend
```bash
cd lexor-backend
npm install
# Configurar variables de entorno (copiar .env.example a .env)
cp .env.example .env
# Iniciar con Docker
docker-compose -f docker-compose.dev.yml up
# O iniciar directamente
npm run dev
```

## Sintaxis de Flashcards

Las flashcards se definen directamente en los archivos Markdown:

```markdown
## Flash: ¿Pregunta?
### Answer: Respuesta

## Flash: Otra pregunta
### Answer: Otra respuesta con **formato**
```

También soporta multimedia:
- Imágenes: `![alt](imagen.png)`
- Audio: `[audio: título](archivo.mp3)`
- Audio inline: `[inline: título](archivo.mp3)`

## Scripts Disponibles

### Desktop
- `npm run dev` - Iniciar en modo desarrollo
- `npm run build` - Compilar para producción
- `npm run package` - Crear instaladores
- `npm run test` - Ejecutar tests
- `npm run lint` - Ejecutar ESLint
- `npm run format` - Formatear código

### Mobile
- `npm start` - Iniciar Expo
- `npm run android` - Iniciar en Android
- `npm run ios` - Iniciar en iOS
- `npm run lint` - Ejecutar ESLint

### Backend
- `npm run dev` - Iniciar en modo desarrollo
- `npm run build` - Compilar TypeScript
- `npm run start` - Iniciar en producción
- `npm run db:migrate` - Ejecutar migraciones
- `npm run db:generate` - Generar migraciones
- `npm test` - Ejecutar tests

## Arquitectura

El backend sigue una arquitectura RESTful con:
- **Autenticación JWT** stateless
- **Versionado de datos** para sincronización
- **Resolución de conflictos** por timestamp
- **Rate limiting** para protección de API
- **Subida de archivos** con streaming

Ver `backend-architecture.md` para más detalles.

## Licencia

MIT
