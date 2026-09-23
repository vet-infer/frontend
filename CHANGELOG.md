# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Este proyecto no sigue un esquema de versionado formal todavía; las entradas se agrupan por fecha y, cuando aplica, por el change de OpenSpec que las originó (`openspec/changes/archive/`).

## [2026-09-22] — Recuperacion de contrasena sin EmailJS en el navegador y estadisticas de la base de conocimiento

Sin change de OpenSpec asociado.

### Changed

- Recuperar contrasena: el envio del correo lo hace ahora el backend por la API REST de EmailJS. `ForgotPasswordForm.tsx` solo llama a `POST /api/v1/auth/forgot-password` y muestra el mensaje generico de la respuesta.
- Base de conocimiento (`/knowledge`): las 4 tarjetas de estadisticas (enfermedades, variables clinicas, reglas activas, reglas inactivas) pasan de una columna lateral a una fila horizontal debajo de la busqueda y los filtros de especie (4 columnas desde `md`, 2x2 en movil). `KnowledgeBasePage.tsx`.

### Removed

- `src/services/emailjs.service.ts`, el tipo `PasswordResetEmailPayload` y el campo `reset_email` de `ForgotPasswordResponse` (`src/types/auth.ts`): la rama que enviaba el correo desde React nunca se ejecutaba, porque el backend no devuelve el token por seguridad.
- Dependencia `@emailjs/browser`.
- Variables `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID` y `VITE_EMAILJS_PUBLIC_KEY` de `.env.example`, `README.md` y `Dockerfile` (`ARG`/`ENV`).

### Fixed

- "Network Error" al solicitar recuperacion de contrasena con un correo registrado. La causa estaba en el backend (ver `backend/CHANGELOG.md`, 2026-09-22).

---

**Verificacion:** `eslint` limpio sobre los archivos modificados. `npm run build` falla por errores de tipos preexistentes en `src/components/evaluations/EvaluationFactsPanel.tsx` (`normal_min`/`normal_max` no existen en `FactDefinition`), archivo no tocado en este cambio. **Archivos eliminados:** `src/services/emailjs.service.ts`. **Archivos modificados:** `src/components/auth/ForgotPasswordForm.tsx`, `src/types/auth.ts`, `src/pages/knowledge/KnowledgeBasePage.tsx`, `package.json`, `package-lock.json`, `.env.example`, `Dockerfile`, `README.md`.

## [2026-09-21] — Terminologia amigable para el veterinario en pantallas de uso diario

Change de OpenSpec: [`simplify-vet-facing-terminology`](../openspec/changes/simplify-vet-facing-terminology/) (aun no archivado). Specs nuevas: [`results-diagnostic-terminology`](../openspec/changes/simplify-vet-facing-terminology/specs/results-diagnostic-terminology/spec.md), [`results-facts-readable-labels`](../openspec/changes/simplify-vet-facing-terminology/specs/results-facts-readable-labels/spec.md), [`clinical-error-messages`](../openspec/changes/simplify-vet-facing-terminology/specs/clinical-error-messages/spec.md).

### Added

- `src/utils/factLabel.ts`: util compartido para nombre legible de una variable/sintoma a partir de su `fact_key` (`resolveFactDisplayName`, con fallback derivado de la clave cuando no hay coincidencia en el catalogo) y traduccion de condiciones de reglas activadas a lenguaje natural (`formatCondition`, tabla de operadores `==`/`!=`/`>`/`<`/`>=`/`<=`). Extraido de `EvaluationFactsPanel.tsx`, que antes lo tenia duplicado.
- `src/utils/factLabel.test.ts`, `src/utils/errors.test.ts`: primeras pruebas unitarias del repo (antes no habia ningun `*.test.ts`).

### Changed

- Dashboard, Evaluacion clinica, Resultados (detalle, listado y PDF exportado) e Historial clinico: eliminada/reemplazada la jerga de implementacion visible al veterinario ("motor IF-THEN + Bayes", "endpoint", "persistida", "source_type", "facts") por lenguaje clinico comun, en `DashboardPage.tsx`, `ClinicalEvaluationPage.tsx`, `ResultsPage.tsx`, `EvaluationResultsPanel.tsx`, `useEvaluationFacts.ts`, `dashboard.service.ts` y `utils/evaluationPdf.ts`.
- Resultados y Historial: las claves tecnicas crudas de sintomas/variables (`hallazgos_ecograficos_renales: true`, `sdma: 12`) y las condiciones de reglas activadas (`sdma == 15`) se muestran ahora con nombre legible y en lenguaje natural, reutilizando el mismo catalogo que ya usaba el formulario de evaluacion (`resolveFactDisplayName`/`formatCondition`). Afecta `ResultsPage.tsx`, `ActivatedRulesPanel.tsx`, `utils/clinical.ts` (`factSummary`) y `utils/evaluationPdf.ts`.
- `src/utils/errors.ts`: `getErrorMessage` deja de exponer en pantalla el `detail` crudo que devuelve el backend (validaciones de Pydantic/FastAPI, mensajes en ingles); siempre retorna el `fallback` en espanol de cada pantalla y registra el detalle tecnico original con `console.error` para diagnostico.
- `ResultsPage.tsx`: el campo "Metodo de diagnostico" (detalle y listado de resultados) queda oculto para el rol veterinario; solo el rol administrador lo ve, etiquetado como informacion tecnica, con el valor crudo del backend (p. ej. `reglas_bayes`) sin traducir.

### Fixed

- (Detectado en pruebas manuales del usuario tras el primer despliegue de este change) El campo "Metodo de diagnostico" mostraba `reglas_bayes` en vez del texto clinico esperado, porque el fallback en espanol solo aplicaba cuando el backend no enviaba valor — y el backend siempre lo envia. Corregido ocultando el campo para veterinario en vez de intentar traducir cada valor tecnico posible (ver punto anterior); el PDF y el panel embebido dejaron de leer ese valor del todo.

---

**Verificacion:** `tsc --noEmit`, `eslint` (sobre los archivos modificados) y `vitest run` (10/10, incluye las pruebas nuevas) limpios. No se realizo recorrido visual en navegador dentro de esta sesion (sin servidor `npm run dev` levantado); la correccion del punto "Fixed" fue reportada y confirmada por el usuario probando la app localmente. **Archivos nuevos:** `src/utils/factLabel.ts`, `src/utils/factLabel.test.ts`, `src/utils/errors.test.ts`. **Archivos modificados:** `src/components/evaluations/ActivatedRulesPanel.tsx`, `src/components/evaluations/EvaluationFactsPanel.tsx`, `src/components/evaluations/EvaluationResultsPanel.tsx`, `src/hooks/useEvaluationFacts.ts`, `src/pages/dashboard/DashboardPage.tsx`, `src/pages/evaluations/ClinicalEvaluationPage.tsx`, `src/pages/history/PatientHistoryPage.tsx`, `src/pages/results/ResultsPage.tsx`, `src/services/dashboard.service.ts`, `src/utils/clinical.ts`, `src/utils/errors.ts`, `src/utils/evaluationPdf.ts`.

## [2026-09-11] — Rebranding de color: morado → teal

Sin change de OpenSpec asociado (ajuste puntual de marca, sin cambios de comportamiento).

### Changed

- Extendido a toda la app el cambio de color iniciado en `Sidebar.tsx` (commit `5198cd2`): las 27 apariciones restantes de `brand-*` (token de marca en `src/styles/globals.css`, hex `#4635D3` y variantes) y de `violet-*` (paleta morada de Tailwind, usada junto a `brand-*` en hovers/bordes) se reemplazan por `teal-*` de Tailwind, con mapeo directo de tono (`brand-500` → `teal-500`, etc.).
- `src/styles/globals.css`: eliminado el bloque `@theme` que definía `--color-brand-500/600/700/800` (introducido en Fase 1) — ya sin uso tras el reemplazo.

### Fixed

- El primer intento de reemplazo (sed masivo `brand|violet` → `teal`) reescribió también las claves del bloque `@theme` (`--color-brand-500` → `--color-teal-500`), lo que sobrescribía la paleta `teal` real de Tailwind con los hex morados originales. Corregido eliminando el bloque completo en vez de renombrarlo.

---

**Verificación:** `tsc --noEmit` limpio. **Archivos modificados:** `src/styles/globals.css` y 26 archivos adicionales en `src/components/` y `src/pages/` (ver `git diff` para el listado completo).

## [2026-09-08] — Interacción de overlays y jerarquía tipográfica (Fase 2)

Change de OpenSpec: [`archive/2026-09-08-frontend-fase2-motion-interaccion`](../openspec/changes/archive/2026-09-08-frontend-fase2-motion-interaccion/). Spec nueva: [`frontend/overlay-interaction`](../openspec/specs/frontend/overlay-interaction/spec.md).

### Added

- `src/hooks/useDialogBehavior.ts`: Escape cierra el diálogo, focus trap (Tab/Shift+Tab cicla dentro del diálogo) y devolución de foco al elemento disparador al cerrar. Usado por `Modal` y `ConfirmDialog`.
- `src/hooks/useOverlayTransition.ts`: anima entrada/salida (fade + scale) de overlays que antes desmontaban abruptamente con `if (!isOpen) return null`. Usado por `Modal`, `ConfirmDialog` y el menú de usuario del `Sidebar`.
- `Modal.tsx`, `ConfirmDialog.tsx`: cierre al hacer click en el backdrop (un click que empieza y termina dentro del panel no cierra).
- Menú de usuario del `Sidebar`: cierre con Escape y con click fuera del menú (antes solo cerraba al elegir una opción).

### Changed

- Jerarquía tipográfica: `font-extrabold` queda reservado para títulos (`text-lg` en adelante) y cifras destacadas; se migraron 88 apariciones en `text-xs`/`text-sm`/`text-base` (labels, links, celdas de tabla, badges) a `font-bold` en 27 archivos (172 → 84 apariciones de `font-extrabold`).

### Fixed

- (Detectado durante la implementación, no visible en producción) Primer borrador de `useDialogBehavior` dependía de `onClose` en su `useEffect`; como todos los call-sites de `Modal` pasan `onClose={() => setX(false)}` inline, cada re-render del formulario dentro del modal (cada tecla escrita) habría reiniciado el efecto y robado el foco de vuelta al primer campo. Corregido con un `onCloseRef` que no fuerza el reinicio del efecto.

### Known issues

- 6 errores preexistentes de `npm run lint` (`react-hooks/set-state-in-effect` en `PatientForm.tsx`, `HistoryPage.tsx`, `KnowledgeBasePage.tsx`, `OwnersPage.tsx`, `OwnerForm.tsx`; `preserve-caught-error` en `emailjs.service.ts`) siguen presentes, sin relación con este change (documentados también en Fase 0/1).

---

**Verificación:** `tsc -b`, `vite build` y `npm run lint` limpios tras cada grupo de tareas (32/32). Verificación manual de teclado (Tab/Shift+Tab/Escape/click-backdrop/click-fuera) en `Modal`, `ConfirmDialog` y el menú de usuario, realizada por el usuario sobre `npm run dev`. **Archivos nuevos:** `src/hooks/useDialogBehavior.ts`, `src/hooks/useOverlayTransition.ts`. **Archivos modificados:** `src/components/common/Modal.tsx`, `src/components/common/ConfirmDialog.tsx`, `src/components/layout/Sidebar.tsx`, y 27 archivos adicionales para la migración tipográfica.

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
