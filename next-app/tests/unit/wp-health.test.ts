import { describe, it, expect } from 'vitest';
import { clasificarRespuesta, destinatariosAlerta } from '@/lib/wp-health';

// La pantalla de instalación de WordPress (la caída recurrente de Hostinger:
// 12/09, 27/10 y 3/11/2026) se presenta como 302 → /wp-admin/install.php.

describe('clasificarRespuesta', () => {
  it('un 200 es WP sano', () => {
    expect(clasificarRespuesta(200, null).ok).toBe(true);
  });

  it('302 a install.php es la caída de grants de MySQL', () => {
    const r = clasificarRespuesta(302, 'https://lightpink-rook-704850.hostingersite.com/wp-admin/install.php');
    expect(r.ok).toBe(false);
    expect(r.motivo).toContain('install.php');
    expect(r.motivo).toContain('permisos');
  });

  it('301 a install.php también cuenta como caída', () => {
    expect(clasificarRespuesta(301, '/wp-admin/install.php').ok).toBe(false);
  });

  it('un redirect a otro destino se reporta como inesperado, no como grants', () => {
    const r = clasificarRespuesta(302, 'https://otracosa.example/');
    expect(r.ok).toBe(false);
    expect(r.motivo).toContain('redirect inesperado');
    expect(r.motivo).not.toContain('install.php');
  });

  it('5xx es caída', () => {
    expect(clasificarRespuesta(503, null)).toEqual({ ok: false, motivo: 'HTTP 503' });
  });
});

describe('destinatariosAlerta', () => {
  it('sin env usa la casilla del dueño', () => {
    expect(destinatariosAlerta(undefined)).toEqual([{ email: 'hypestylearg@gmail.com' }]);
  });

  it('acepta varias casillas separadas por coma', () => {
    expect(destinatariosAlerta(' a@x.com , b@y.com ')).toEqual([{ email: 'a@x.com' }, { email: 'b@y.com' }]);
  });
});
