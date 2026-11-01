# Acceso CYBER HYPE — regla definitiva del 1/11/2026

Integra `fix/acceso-diagnostico`: durante el cierre de 00:00 a 20:00 ART,
la contraseña correcta permite entrar, navegar y comprar. Se elimina el 403
`todavia-no` y toda condición de las 19:00 en la autenticación del middleware.
A las 19:00 solamente se comparte la clave; los precios Cyber conservan su
programación independiente. A las 20:00 abre el público automáticamente.

Se conservan la variable de servidor EARLY_ACCESS_PASSWORD y la cookie HMAC
HttpOnly, Secure en HTTPS, SameSite=Lax y Path=/. Errores diferenciados:
401 contraseña incorrecta, 503 configuración ausente, 400 petición inválida.
La redirección del gate es no-store y el login recarga con la cookie nueva.
No hay nuevas variables ni permisos OWNER/PREVIEW.

## Validación local

- 147 pruebas unitarias: gate, mensajes, cookies, sesiones, carrito, validación
  de checkout y precios/pedidos antes y después de las 19:00.
- Chromium: visitante bloqueado, clave incorrecta, login, carrito después de
  recargar, navegación a contacto y vuelta al checkout, sesión persistente y
  avance hasta elegir medio de pago. Servicios externos simulados, sin cobro.
- TypeScript y lint de los archivos de producción modificados.
- Base contrastada con main remoto: 309a696f4e5e8538efc94a1ed2bf4b51f001f957.

## Verificación pendiente de Production

La sesión de trabajo no permite conexiones a Vercel/dominio (EACCES). No se
confirma la contraseña real ni el deployment activo. No se hizo deploy.

Desde una terminal con red y sesión de Vercel CLI, en este worktree:

```powershell
node scripts/verificar-acceso-production.mjs
```

El script resuelve el proyecto por hypestyle.com.ar (los enlaces locales
apuntan a dos proyectos diferentes), revisa Production READY y fechas de la
variable, autentica con la variable configurada, verifica la firma de la cookie
y comprueba acceso a /checkout. No muestra ni guarda contraseña, token o cookie,
no modifica Vercel y no crea pedidos. Si la variable Sensitive no puede leerse,
informa que no puede verificarla. El login anterior al deploy todavía puede
rechazar por horario.

Después del deploy, pasar el SHA completo de main aprobado como argumento
para exigir también que el dominio sirva exactamente ese commit:

```powershell
node scripts/verificar-acceso-production.mjs SHA_COMPLETO_DE_MAIN
```

## Aprobación necesaria

Publicar e integrar `fix/acceso-diagnostico` en main para disparar el deploy
Production conectado a GitHub. No realizar deploy manual ni cambiar precios.
Después confirmar deployment READY, SHA y login real, antes de la compra
de prueba del usuario.
