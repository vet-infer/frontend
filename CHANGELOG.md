# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Este proyecto no sigue un esquema de versionado formal todavía; las entradas se agrupan por fecha y, cuando aplica, por el change de OpenSpec que las originó (`openspec/changes/archive/`).

## [2026-09-03] — Consolidación de componentes compartidos (Fase 1)

Change de OpenSpec: [`archive/2026-09-03-frontend-fase1-consolidacion-componentes`](../openspec/changes/archive/2026-09-03-frontend-fase1-consolidacion-componentes/). Refactor puro sin cambios de comportamiento observable (`skip_specs: true`, sin specs modificadas).

### Added

- `src/utils/errors.ts`: `getErrorMessage(error, fallback)` centraliza la extracción de `error.response.data.detail`, antes reimplementada casi idéntica en 15 archivos.
- `src/components/common/Skeleton.tsx`: reemplaza las 15 repeticiones del bloque de carga `animate-pulse rounded-lg bg-slate-100`.
- `src/components/common/IconBadge.tsx`: reemplaza 13 usos del patrón "círculo con icono" (`tone`: `brand`/`danger`/`info`/`warning`/`success`).
- `src/components/common/EmptyState.tsx`: reemplaza 5 bloques completos de estado vacío (icono + título + descripción + acción opcional), usando `IconBadge` internamente.
- Tokens de color de marca en `src/styles/globals.css` (`@theme`): `--color-brand-500/600/700/800`, habilitando clases `bg-brand-*`/`text-brand-*`/`border-brand-*`/`ring-brand-*` en vez de hex arbitrarios (`bg-[#4635D3]`, etc.). Reemplazados en ~150 ocurrencias a lo largo de `src/`.

### Changed

- `src/utils/clinical.ts#formatDate` gana un tercer parámetro `monthFormat: "2-digit" | "short" = "2-digit"`, descubierto necesario porque `PatientDetailPage.tsx` usaba `month: "short"` (distinto del `"2-digit"` usado en el resto de la app) — evita que la consolidación cambiara el formato de fecha visible en esa pantalla.
- `PatientsPage.tsx`, `PatientDetailPage.tsx`, `ResultsPage.tsx`: `formatDate`/`calculateAge` locales eliminados, ahora importados de `utils/clinical.ts` (los dos primeros vía un wrapper de una línea para preservar su firma de llamada de un solo argumento).
- `LoginPage.tsx`, `ForgotPasswordForm.tsx`: mantienen un wrapper local delgado sobre `getErrorMessage` compartido para preservar lógica que sí difería del resto (dos mensajes de fallback distintos según haya `response`, y una rama `instanceof Error`, respectivamente) — no se aplanó a un único mensaje.

### Fixed

- `public/Logo.png` (favicon) comprimido de ~307 KB a ~7 KB (redimensionado a 128×128), manteniendo la misma imagen.

---

**Verificación:** `tsc -b` y `vite build` limpios tras cada uno de los 7 grupos de cambio; `tailwind-merge` verificado en Node para confirmar que los overrides de color arbitrario (ej. `text-[#3026A6]` sobre el tono `brand` por defecto) se resuelven igual que antes; CSS compilado inspeccionado para confirmar que cada clase `bg-brand-*`/`text-brand-*` referencia el hex original exacto. `npm run lint`: 6 errores preexistentes no relacionados (`react-hooks/set-state-in-effect`, `preserve-caught-error`), ninguno introducido por este cambio. **Archivos nuevos:** `src/utils/errors.ts`, `src/components/common/Skeleton.tsx`, `src/components/common/IconBadge.tsx`, `src/components/common/EmptyState.tsx`. **Archivos modificados:** ~45 archivos en `src/pages/`, `src/components/` y `src/styles/globals.css`.

## [2026-09-03] — Higiene de accesibilidad y seguridad (Fase 0)

Change de OpenSpec: [`archive/2026-09-03-frontend-fase0-accesibilidad-higiene`](../openspec/changes/archive/2026-09-03-frontend-fase0-accesibilidad-higiene/). Spec nueva: [`frontend/baseline-hygiene`](../openspec/specs/frontend/baseline-hygiene/spec.md).

### Added

- Soporte de `prefers-reduced-motion` en `src/styles/globals.css`: neutraliza duración de animaciones/transiciones (spinner de carga, skeletons, transición del panel lateral) cuando el usuario tiene activada la preferencia de movimiento reducido del sistema operativo.
- `AlertMessage.tsx`: `role="alert"` + `aria-live` (`assertive` para errores, `polite` para éxito), para que los mensajes se anuncien a tecnología de asistencia sin requerir que el usuario mueva el foco.
- `FormField.tsx`, `FormSelect.tsx`, `FormTextarea.tsx`: `aria-invalid` y `aria-describedby` (con `id` generado vía `useId()`) asociando cada campo con su mensaje de error para lectores de pantalla.

### Changed

- `index.html`: `<html lang="en">` → `<html lang="es">`, ya que toda la aplicación está en español.

### Fixed

- `LoginPage.tsx`: los campos de correo y contraseña ya no traen credenciales precargadas (`admin@example.com` / `Admin12345`) como valor por defecto — riesgo de seguridad, cualquiera que abriera `/login` veía credenciales válidas.
- `public/Logo.png` (favicon) comprimido de ~307 KB a un tamaño apropiado para ícono de pestaña.
- `index.html`: el `<link rel="icon">` declaraba `type="image/svg+xml"` para un archivo `.png` — corregido a `type="image/png"`.

---

**Verificación:** `tsc -b` y `vite build` limpios. **Archivos modificados:** `src/styles/globals.css`, `index.html`, `src/components/common/AlertMessage.tsx`, `src/components/common/FormField.tsx`, `src/components/common/FormSelect.tsx`, `src/components/common/FormTextarea.tsx`, `src/pages/auth/LoginPage.tsx`, `public/Logo.png`.
