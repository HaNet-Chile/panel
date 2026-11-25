# HaNet Panel

Panel web para HNT, Admin, Profesor, Directiva y CEE (Firebase `hanet-edu`).

- UI: componentes Arc (uiarc.dev) en `src/components/arc/`. Antes de tocar UI lee `.claude/skills/arc/SKILL.md`.
- Colores: solo los de HaNet. La paleta vive en `src/index.css` (`--hn-*`) y se mapea a los roles de Arc ahí mismo. No uses hex sueltos en componentes; usa los roles (`--accent`, `--surface`, ...).
- La acción principal (`Button variant="primary"`) es rosa HaNet `#EF2274`, a diferencia del Arc original.
- El sidebar es el de shadcn (`src/components/ui/sidebar.tsx`); sus variables apuntan a los roles de Arc.
- El panel llama Cloud Functions existentes; nunca escribe Firestore directo (solo lee el Calendar del curso, que las reglas permiten).
- Entrada: contraseña del HaNet ID y luego el segundo paso obligatorio (`src/components/auth/second-step.tsx`, funciones de `hanetcl/functions/panel-auth.js`): código por correo, app de autenticación o código de respaldo. `_panel` no deja pasar sin `secondStep === 'verified'`; la página Seguridad agrega o quita la app.
- Menú por áreas (`src/lib/nav.ts`, `navFor`): HaNet Team, Administración (`/institucion`, Admin de su liceo), Docente, Comunidad (eventos, `/directivas` del CEE, Calendar del curso) y Cuenta. Una página nueva entra ahí con sus roles.
- Repo público: nunca subas secretos ni datos de estudiantes. Deploys de hosting solo con OK del dueño.

## Producto (decidido por muxp, 2026-10-17)

- Etapa: beta. Primero se prueba con un solo liceo. Precios, planes y paquetes con descuento se definen recién para la versión estable; no construir cobro ni pantallas de precios antes.
- Modelo: una base (Calendar, ClassHall, Eventos de institución) más módulos sueltos que cada institución activa solo si los necesita (Eventos de ciudad, Feed, Comunidad, Notebook, Wallet...). Un módulo apagado se apaga en el backend, no solo se esconde.
- Notebook (notas, asistencia, faltas) reemplaza el libro de clases del liceo; no se integra con otros sistemas (sin API abierta, y el scraping queda descartado).
- Plan completo: https://claude.ai/code/artifact/a807008e-b009-4df3-92e2-03932af8cf37
