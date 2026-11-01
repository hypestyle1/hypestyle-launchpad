// Comprueba el login real sin modificar Vercel ni crear pedidos.
// Clave y cookie solo en memoria; nunca imprime valores ni cuerpos de error.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHmac, timingSafeEqual } from 'node:crypto';

const teamId = 'team_9ATkmsaBTk0IZBGLj5LPQsZU';
const domain = 'hypestyle.com.ar';

try {
  const expectedCommit = process.argv[2];
  if (expectedCommit && !/^[a-f0-9]{40}$/.test(expectedCommit)) throw new Error('El deployment requiere un SHA completo como argumento, nunca una contraseña.');
  const token = process.env.VERCEL_TOKEN || JSON.parse(readFileSync(join(process.env.APPDATA, 'com.vercel.cli', 'Data', 'auth.json'), 'utf8')).token;
  if (!token) throw new Error('Falta sesion de Vercel CLI.');
  async function get(path) {
    const res = await fetch(`https://api.vercel.com${path}${path.includes('?') ? '&' : '?'}teamId=${teamId}`, {
      headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Vercel devolvio HTTP ${res.status}. No se pudo verificar.`);
    return res.json();
  }
  // Resolver el dominio evita confundir los proyectos next-app y hypestyle-launchpad.
  const alias = await get(`/v4/aliases/${domain}`);
  if (!alias.projectId || !alias.deploymentId || alias.redirect) throw new Error('El dominio no apunta directamente a un deployment verificable.');
  const deployment = await get(`/v13/deployments/${alias.deploymentId}`);
  if (deployment.target !== 'production' || deployment.readyState !== 'READY') throw new Error('El deployment activo no es Production READY.');
  const { envs } = await get(`/v10/projects/${alias.projectId}/env`);
  const matches = envs.filter(e => e.key === 'EARLY_ACCESS_PASSWORD' && e.target?.includes('production'));
  if (matches.length !== 1) throw new Error('EARLY_ACCESS_PASSWORD no tiene una configuracion Production unica.');
  const env = matches[0];
  const changed = Number(env.updatedAt || env.createdAt);
  const built = Number(deployment.createdAt || deployment.created);
  console.log(`Proyecto: ${alias.projectId}; deployment: ${alias.deploymentId}; commit: ${deployment.meta?.githubCommitSha || 'no informado'}`);
  if (expectedCommit && deployment.meta?.githubCommitSha !== expectedCommit) throw new Error('El deployment activo no corresponde al commit esperado.');
  if (!expectedCommit) console.log('Commit informado; para verificarlo, pasar el SHA de main aprobado como argumento.');
  if (!changed || !built) throw new Error('No se pudieron comparar las fechas de variable y deployment.');
  if (changed > built) throw new Error('La variable se cambio DESPUES de crear el deployment activo. Hace falta redeploy aprobado.');
  const decrypted = await get(`/v1/projects/${alias.projectId}/env/${env.id}`);
  if (decrypted.type === 'sensitive' || typeof decrypted.value !== 'string' || !decrypted.value.trim()) {
    throw new Error('Vercel no devolvio un valor legible no vacio. No se puede confirmar la clave con esta prueba.');
  }
  const password = decrypted.value.trim();
  const login = await fetch(`https://${domain}/api/acceso`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }), redirect: 'error', signal: AbortSignal.timeout(15000),
  });
  if (!login.ok) throw new Error(`El deployment rechazo el login: HTTP ${login.status}. Configuracion/runtime NO confirmados.`);
  const cookies = login.headers.getSetCookie();
  const access = cookies.find(c => c.startsWith('hype_cyber_access='));
  if (!access || !/;\s*HttpOnly/i.test(access) || !/;\s*Secure/i.test(access)) throw new Error('El deployment no emitio una cookie segura.');
  const pair = access.split(';')[0];
  const value = decodeURIComponent(pair.slice(pair.indexOf('=') + 1));
  const [expires, signature] = value.split('.');
  const expected = createHmac('sha256', password).update(expires).digest('hex');
  if (!/^\d+\.[a-f0-9]{64}$/.test(value) || Number(expires) <= Date.now() || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error('El deployment no firmo con la variable Production actual.');
  }
  const checkout = await fetch(`https://${domain}/checkout`, {
    headers: { Cookie: pair }, redirect: 'manual', signal: AbortSignal.timeout(15000),
  });
  if (checkout.status !== 200) throw new Error(`El deployment no permite navegar al checkout: HTTP ${checkout.status}.`);
  console.log('OK: la funcion autentica y firma con EARLY_ACCESS_PASSWORD de Production; checkout accesible con esa cookie.');
  console.log('No se modifico Vercel ni se creo un pedido. La cookie de prueba no se guarda.');
} catch (error) {
  // Nunca volcar objetos de fetch, auth ni variables: solo errores controlados.
  const message = error?.message || '';
  const safe = /^(Vercel devolvio|Falta sesion|El dominio|El deployment|EARLY_ACCESS_PASSWORD|No se pudieron|La variable|Vercel no devolvio|Ejecutar en)/.test(message);
  console.error(safe ? message : 'No se pudo consultar Vercel: revisar conexion y sesion CLI. Configuracion NO confirmada.');
  process.exitCode = 1;
}
