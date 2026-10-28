import { describe, it, expect, afterEach, vi } from 'vitest';

/**
 * Validación del enlace del canal de WhatsApp.
 *
 * Lo que cuida: que la landing **no** dibuje un botón de "Seguir Hype en
 * WhatsApp" apuntando a cualquier cosa. La variable la carga una persona a mano
 * en Vercel, copiando desde el teléfono, así que los modos de equivocarse son
 * concretos: pegar el enlace a una publicación del canal en vez del canal,
 * pegarlo con texto de la invitación, dejar un placeholder, o cargarlo con
 * `www.` porque se copió del escritorio.
 *
 * El caso que importa de verdad es el de producción: si el enlace no sirve,
 * preferimos quedarnos sin botón antes que mandar a la gente a una invitación
 * rota el día que abre la campaña.
 */

async function cargar(valor: string | undefined) {
  vi.resetModules();
  delete process.env.CYBER_WHATSAPP_URL;
  if (valor === undefined) delete process.env.NEXT_PUBLIC_CYBER_WHATSAPP_URL;
  else process.env.NEXT_PUBLIC_CYBER_WHATSAPP_URL = valor;
  return import('@/lib/cyber-whatsapp');
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_CYBER_WHATSAPP_URL;
  delete process.env.CYBER_WHATSAPP_URL;
  vi.restoreAllMocks();
});

describe('enlace del canal de WhatsApp', () => {
  it('acepta el formato real de un Canal', async () => {
    // ID de canal real: alfanumérico de ~22 caracteres.
    const url = 'https://whatsapp.com/channel/0029VbALxHmL2ATrx7hqkh1I';
    const m = await cargar(url);
    expect(m.whatsappUrl()).toBe(url);
    expect(m.whatsappDisponible()).toBe(true);
    expect(m.esGrupo(m.whatsappUrl())).toBe(false);
  });

  it('acepta el canal copiado desde el escritorio, con www.', async () => {
    const url = 'https://www.whatsapp.com/channel/0029VbALxHmL2ATrx7hqkh1I';
    const m = await cargar(url);
    expect(m.whatsappDisponible()).toBe(true);
  });

  it('acepta la barra final y el rastro de parámetros de un share', async () => {
    for (const url of [
      'https://whatsapp.com/channel/0029VbALxHmL2ATrx7hqkh1I/',
      'https://whatsapp.com/channel/0029VbALxHmL2ATrx7hqkh1I?utm_source=ig',
    ]) {
      const m = await cargar(url);
      expect(m.whatsappDisponible(), url).toBe(true);
    }
  });

  it('rechaza el enlace a una PUBLICACIÓN del canal: lleva a un posteo, no a seguirlo', async () => {
    const m = await cargar('https://whatsapp.com/channel/0029VbALxHmL2ATrx7hqkh1I/412');
    expect(m.whatsappDisponible()).toBe(false);
  });

  it('un grupo se reconoce como grupo (ahí el número queda a la vista)', async () => {
    const m = await cargar('https://chat.whatsapp.com/HxAbCdEfGhIjKlMnOpQrSt');
    expect(m.whatsappDisponible()).toBe(true);
    expect(m.esGrupo(m.whatsappUrl())).toBe(true);
  });

  // El enlace del canal viaja en el código, no en una variable: la landing y las
  // historias salen el mismo día y un botón que depende de que alguien cargue
  // algo en un panel es un botón que el día del lanzamiento no está.
  it('sin variable sale el canal oficial, no un vacío', async () => {
    const m = await cargar(undefined);
    expect(m.whatsappUrl()).toBe('https://whatsapp.com/channel/0029Vb8xziY89injZvFrch2l');
    expect(m.whatsappDisponible()).toBe(true);
    expect(m.esGrupo(m.whatsappUrl())).toBe(false);
  });

  it('el enlace que viaja en el código es un canal válido para el propio validador', async () => {
    const m = await cargar(undefined);
    const delCodigo = m.whatsappUrl();
    const otra = await cargar(delCodigo);
    expect(otra.whatsappUrl()).toBe(delCodigo);
  });

  // Nivel 3 del rollback: apagar el botón sin revertir el PR. Dejar la variable
  // vacía NO apaga — vuelve al enlace del código — para que un borrado
  // accidental no deje la página a medias.
  it('se apaga a mano con `off`, y vaciarla no apaga', async () => {
    for (const apaga of ['off', 'OFF', 'none', 'no', '0', 'false']) {
      const m = await cargar(apaga);
      expect(m.whatsappUrl(), apaga).toBe('');
      expect(m.whatsappDisponible(), apaga).toBe(false);
    }
    const vacia = await cargar('   ');
    expect(vacia.whatsappDisponible()).toBe(true);
  });

  // La variable de servidor existe para poder encender el canal sin recompilar:
  // las NEXT_PUBLIC_ quedan incrustadas en el bundle durante el build.
  it('la variable de servidor gana sobre la pública y se lee en cada llamada', async () => {
    const publica = 'https://whatsapp.com/channel/0029PublicaPublicaPub';
    const servidor = 'https://whatsapp.com/channel/0029ServidorServidorS';
    const m = await cargar(publica);
    expect(m.whatsappUrl()).toBe(publica);

    // Sin volver a importar el módulo: el valor no quedó congelado.
    process.env.CYBER_WHATSAPP_URL = servidor;
    expect(m.whatsappUrl()).toBe(servidor);

    delete process.env.CYBER_WHATSAPP_URL;
    expect(m.whatsappUrl()).toBe(publica);
  });

  it('nada de placeholders, http, otro dominio ni texto pegado de más', async () => {
    const avisos = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const malo of [
      'TODO',
      'pendiente',
      'http://whatsapp.com/channel/0029VbALxHmL2ATrx7hqkh1I',
      'https://wa.me/5491112345678',
      'https://whatsapp.com.evil.com/channel/0029VbALxHmL2ATrx7hqkh1I',
      'https://whatsapp.com/channel/',
      'https://whatsapp.com/channel/abc',
      'Segui el canal: https://whatsapp.com/channel/0029VbALxHmL2ATrx7hqkh1I',
    ]) {
      const m = await cargar(malo);
      expect(m.whatsappDisponible(), malo).toBe(false);
    }
    // Y cuando hay algo cargado que no sirve, queda el aviso para poder verlo.
    expect(avisos).toHaveBeenCalled();
  });
});
