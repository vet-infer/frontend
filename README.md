# Frontend OE3 – Sistema de Inferencia Veterinaria

Aplicación web desarrollada con React, Vite y TypeScript para el OE3 de la tesis. Consume la API REST del proyecto `Backend-Tesis` y permite registrar información clínica veterinaria, ejecutar el motor híbrido de reglas IF–THEN + Bayes y consultar resultados trazables.

## Funcionalidades

- Autenticación mediante JWT y protección de rutas privadas.
- Recuperacion de contraseña mediante token temporal; el backend envia el correo por EmailJS.
- Gestión de propietarios y pacientes.
- Consumo de catálogos reales: especies, razas, síntomas y variables clínicas.
- Registro de evaluaciones clínicas con *facts* estructurados.
- Procesamiento de inferencia y consulta de resultados persistidos.
- Visualización de probabilidades, niveles de riesgo y reglas activadas.
- Historial clínico por paciente, con búsqueda y filtros.
- Consulta de la base de conocimiento y administración de usuarios para el rol administrador.

## Tecnologías

- React 19
- TypeScript
- Vite
- React Router
- Axios
- Tailwind CSS
- Lucide React

## Requisitos

- Node.js 20 o superior.
- npm 10 o superior.
- Backend OE3 iniciado y accesible. Por defecto, el frontend espera la API en `http://127.0.0.1:8000`.

## Instalación y ejecución local

Desde la carpeta `Frontend-Tesis-New`:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

La aplicación estará disponible normalmente en `http://localhost:5173`.

Antes de iniciar sesión, levante el backend desde la carpeta `Backend-Tesis`. La documentación interactiva de la API queda disponible en `http://127.0.0.1:8000/docs` cuando el backend se ejecuta localmente.

## Variables de entorno

Crear un archivo `.env` a partir de `.env.example`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Para otra instancia del backend, cambie `VITE_API_BASE_URL`. La configuracion de EmailJS para recuperacion de contraseña vive solo en el backend (ver `backend/README.md`). No incluya tokens JWT, contraseñas ni claves privadas en variables expuestas con el prefijo `VITE_`.

## Comandos disponibles

```powershell
npm run dev     # servidor de desarrollo
npm run build   # validación TypeScript y compilación de producción
npm run lint    # análisis estático con ESLint
npm run preview # vista local de la compilación de producción
```

## Flujo clínico OE3

1. Iniciar sesión para obtener y utilizar el JWT.
2. Registrar o seleccionar un propietario.
3. Registrar un paciente usando identificadores reales de propietario, especie y raza.
4. Crear una evaluación e ingresar síntomas y variables clínicas como *facts*.
5. Guardar la evaluación y ejecutar el procesamiento de inferencia.
6. Consultar los resultados: enfermedad sugerida, probabilidad, nivel de riesgo y reglas activadas.
7. Revisar el historial clínico del paciente.

## Integración con API

El cliente Axios centralizado agrega automáticamente el encabezado `Authorization: Bearer <token>` cuando existe una sesión. Los servicios del frontend consumen endpoints reales de autenticación, propietarios, pacientes, catálogos, evaluaciones, resultados, historial, conocimiento y usuarios.

Los payloads clínicos se construyen desde los catálogos obtenidos por API; no se usan datos simulados para propietarios, pacientes ni *facts* de evaluación.

## Validación manual sugerida

1. Abrir DevTools → **Network**.
2. Iniciar sesión y confirmar la respuesta de `POST /api/v1/auth/login`.
3. Crear un propietario y un paciente; verificar los `POST` correspondientes.
4. Registrar una evaluación con *facts* y confirmar `POST /api/v1/evaluations`.
5. Procesarla mediante `POST /api/v1/evaluaciones/{id}/procesar`.
6. Verificar la consulta de resultados, reglas activadas e historial.

Estas capturas y los payloads/respuestas de Network constituyen evidencia reproducible para el OE3.

## Estructura principal

```text
src/
  app/          # Router y composición principal
  components/   # Componentes reutilizables y módulos clínicos
  pages/        # Vistas del sistema
  services/     # Cliente API y servicios por dominio
  hooks/        # Hooks de autenticación y evaluación
  types/        # Tipos TypeScript alineados con la API
  utils/        # Utilidades de almacenamiento y presentación
```

## Alcance actual

La pantalla de preferencias de interfaz está conservada en el código, pero su pestaña está temporalmente oculta. El tema oscuro y la recuperación de contraseña por correo no forman parte del alcance actual de esta entrega.

## Conclusión académica

El frontend implementa el flujo clínico completo del OE3, desde la autenticación y el registro de datos normalizados hasta la inferencia, resultados explicables e historial clínico. La comunicación con la API REST permite mantener trazabilidad de las evaluaciones y de las reglas activadas.
