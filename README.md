# Oberyn

Oberyn is a SaaS platform for controlling AI-powered systems that operate through SDK, Gateway, and manually registered services.

This repository is split into:

- `frontend/`: React, TypeScript, Vite, React Router, Tailwind CSS, and Clerk.
- `backend/`: Node.js, TypeScript, Express, Clerk middleware, and Supabase clients.
- `database/`: Supabase schema, seed data, policies, and setup notes.

This is the base project structure only. Final dashboards, SDK/Gateway logic, Stellar anchoring, and advanced audit workflows are intentionally left for later implementation.

## Instalacion

Pasos rapidos para instalar y ejecutar el proyecto en local.

### Prerrequisitos

- Node.js 18+
- npm
- Git
- PostgreSQL o Supabase

### 1. Clonar el repositorio

```bash
git clone <tu-repo-url>
cd Oberyn
```

### 2. Configurar variables de entorno

Configura el backend usando el archivo de ejemplo:

```bash
copy backend\.env.example backend\.env
```

Luego edita `backend/.env` con tus credenciales.

Para guardar organizaciones y otros datos desde el backend, Supabase debe usar la service role key:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_o_publishable_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
CLERK_SECRET_KEY=tu_clerk_secret_key
```

La `SUPABASE_SERVICE_ROLE_KEY` se obtiene en Supabase Dashboard > Project Settings > API. No la pongas en el frontend.

Si el frontend requiere variables locales, crea `frontend/.env.local` y agrega las variables necesarias:

```env
VITE_CLERK_PUBLISHABLE_KEY=tu_clerk_publishable_key
VITE_API_BASE_URL=http://localhost:4000/api
```

### 3. Configurar la base de datos

Aplica los scripts de la carpeta `database/` en PostgreSQL o Supabase:

- `database/schema.sql`
- `database/seed.sql`

### 4. Instalar dependencias

Desde la raiz del proyecto:

```bash
npm --prefix backend install
npm --prefix frontend install
```

### 5. Ejecutar backend y frontend

Desde la raiz del proyecto:

```bash
npm run dev
```

Este comando levanta:

- Backend: `http://localhost:4000`
- Frontend: `http://localhost:5173`

Para detener ambos servicios, usa `Ctrl+C`.
